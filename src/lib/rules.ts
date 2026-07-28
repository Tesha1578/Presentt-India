/**
 * SalesOS business-rule engine (design.md §10) — pure functions shared by
 * seed computation and live analytics/customer queries.
 *
 * Amounts are whole ₹. Dates are JS Date objects.
 */
import type {
  CustomerCategory,
  HealthGrade,
  SalesMonitorBucket,
  SalesTrend,
  ThresholdSettings,
} from "@contracts/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * DAY_MS);
}

export function daysBetween(a: Date, b: Date = new Date()): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Keys for the trailing n FULL months, oldest first. */
export function trailingMonthKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = n; i >= 1; i--) {
    keys.push(monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1)));
  }
  return keys;
}

export type Dated = { date: Date };
export type InvoiceLike = Dated & { amount: number };
export type PaymentLike = Dated & { amount: number; delayDays: number };

/** Monthly sales totals keyed by YYYY-MM. */
export function monthlySales(invoices: InvoiceLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    const k = monthKey(inv.date);
    map.set(k, (map.get(k) ?? 0) + inv.amount);
  }
  return map;
}

/** Average monthly sales over the trailing n full months. */
export function avgMonthlySales(
  invoices: InvoiceLike[],
  months: number,
  from: Date = new Date(),
): number {
  const totals = monthlySales(invoices);
  const keys = trailingMonthKeys(months, from);
  const sum = keys.reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
  return months > 0 ? sum / months : 0;
}

/** §10.3 — auto-classification by monthly sales value vs admin limits. */
export function classifyCustomer(
  monthlyAvg: number,
  t: Pick<ThresholdSettings, "classificationSmallMax" | "classificationMediumMax">,
): CustomerCategory {
  if (monthlyAvg <= t.classificationSmallMax) return "small";
  if (monthlyAvg <= t.classificationMediumMax) return "medium";
  return "large";
}

function sumBetween(invoices: InvoiceLike[], fromDays: number, toDays: number): number {
  const now = Date.now();
  return invoices.reduce((acc, inv) => {
    const age = (now - inv.date.getTime()) / DAY_MS;
    return age >= fromDays && age < toDays ? acc + inv.amount : acc;
  }, 0);
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** §10.6 — rolling 30-day trend using significantChangePct. */
export function salesTrend30d(
  invoices: InvoiceLike[],
  t: Pick<ThresholdSettings, "significantChangePct">,
): SalesTrend {
  const cur = sumBetween(invoices, 0, 30);
  const prev = sumBetween(invoices, 30, 60);
  const pct = pctChange(cur, prev);
  if (pct > t.significantChangePct) return "increasing";
  if (pct < -t.significantChangePct) return "decreasing";
  return "stable";
}

/** §10.6 — 30-day sales-monitoring bucket. */
export function salesMonitorBucket(
  invoices: InvoiceLike[],
  t: Pick<ThresholdSettings, "significantChangePct">,
): SalesMonitorBucket {
  const cur = sumBetween(invoices, 0, 30);
  if (cur <= 0) return "no_sales";
  const prev = sumBetween(invoices, 30, 60);
  const pct = pctChange(cur, prev);
  if (pct > t.significantChangePct) return "increasing";
  if (pct < -t.significantChangePct) return "decreasing";
  return "regular";
}

/** Payment regularity from average delay days. */
export function paymentRegularity(
  payments: PaymentLike[],
): "regular" | "occasional" | "poor" {
  if (payments.length === 0) return "poor";
  const avg =
    payments.reduce((acc, p) => acc + p.delayDays, 0) / payments.length;
  if (avg <= 7) return "regular";
  if (avg <= 20) return "occasional";
  return "poor";
}

/**
 * §10.7 — Customer health, verbatim matrix:
 *   Excellent = High Sales + Regular Payments
 *   Good      = High Sales + Occasional Delays
 *   Average   = Moderate Sales + Regular Payments
 *   Poor      = Low Sales + Poor Payment History
 * Off-matrix combinations fall back to score bands.
 */
export function healthGrade(
  monthlyAvg: number,
  payments: PaymentLike[],
  t: Pick<ThresholdSettings, "classificationSmallMax" | "classificationMediumMax">,
): HealthGrade {
  const salesLevel =
    monthlyAvg > t.classificationMediumMax
      ? "high"
      : monthlyAvg > t.classificationSmallMax
        ? "moderate"
        : "low";
  const pay = paymentRegularity(payments);
  if (salesLevel === "high" && pay === "regular") return "excellent";
  if (salesLevel === "high" && pay === "occasional") return "good";
  if (salesLevel === "moderate" && pay === "regular") return "average";
  if (salesLevel === "low" && pay === "poor") return "poor";
  // Poor payment history dominates off-matrix combinations.
  if (pay === "poor") return "poor";
  const score = healthScore(monthlyAvg, payments, t);
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "average";
  return "poor";
}

/** 0–100 health score: sales level (0–55) + payment regularity (0–45). */
export function healthScore(
  monthlyAvg: number,
  payments: PaymentLike[],
  t: Pick<ThresholdSettings, "classificationSmallMax" | "classificationMediumMax">,
): number {
  const ratio = Math.min(monthlyAvg / t.classificationMediumMax, 1);
  const salesPoints = Math.round(15 + ratio * 40);
  let payPoints = 0;
  if (payments.length > 0) {
    const avgDelay =
      payments.reduce((acc, p) => acc + p.delayDays, 0) / payments.length;
    payPoints = Math.max(0, Math.round(45 - avgDelay * 2));
  }
  return Math.max(0, Math.min(100, salesPoints + payPoints));
}

/**
 * §10.4 — discount monitoring: discounted customer whose sales drop beyond
 * discountDeclinePct over the previous discountWindowMonths while discounts
 * continue.
 */
export function discountDecline(
  invoices: InvoiceLike[],
  t: Pick<ThresholdSettings, "discountDeclinePct" | "discountWindowMonths">,
  from: Date = new Date(),
): { declining: boolean; dropPct: number; current: number; previous: number } {
  const totals = monthlySales(invoices);
  const windowKeys = trailingMonthKeys(t.discountWindowMonths * 2, from);
  const half = t.discountWindowMonths;
  const previous = windowKeys
    .slice(0, half)
    .reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
  const current = windowKeys
    .slice(half)
    .reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
  const dropPct = previous > 0 ? ((previous - current) / previous) * 100 : 0;
  return {
    declining: previous > 0 && dropPct > t.discountDeclinePct,
    dropPct: Math.round(dropPct * 10) / 10,
    current,
    previous,
  };
}

/** Indian-grouped ₹ formatting: ₹12,40,000. */
export function formatINR(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  return `${n < 0 ? "-" : ""}₹${grouped}`;
}
