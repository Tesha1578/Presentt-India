/**
 * Customers-module helpers — formatting, colors, derived stats.
 * Works on tRPC router output types (DB enum values are lowercase).
 */
import type { RouterOutputs } from '@/lib/data-types';

export type { RouterOutputs };
export type CustomerListItem = RouterOutputs['customers']['list'][number];
export type CustomerDetail = NonNullable<RouterOutputs['customers']['byId']>;
export type CustomerReports = RouterOutputs['customers']['reports'];
export type DuplicatesReport = RouterOutputs['customers']['duplicatesReport'];
export type DiscountRow = RouterOutputs['analytics']['discountMonitoring'][number];
export type Thresholds = RouterOutputs['thresholds']['get'];
export type DetailInvoice = CustomerDetail['invoices'][number];
export type DetailPayment = CustomerDetail['payments'][number];

// ---------------------------------------------------------------------------
// Currency — Indian grouping (₹12,40,000), compact ₹12.4L at ≥ ₹10L
// ---------------------------------------------------------------------------

export function formatINR(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (compact && Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  const s = Math.round(Math.abs(n)).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${n < 0 ? '-' : ''}₹${grouped}`;
}

// ---------------------------------------------------------------------------
// Enums → display
// ---------------------------------------------------------------------------

export const GRADE_COLORS: Record<string, string> = {
  excellent: '#4ADE80',
  good: '#C6FF33',
  average: '#FFB224',
  poor: '#FF5C5C',
};

export const GRADE_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor',
};

export function gradeColor(grade?: string | null): string {
  return GRADE_COLORS[grade ?? ''] ?? '#8A8A8A';
}

export function gradeLabel(grade?: string | null): string {
  return GRADE_LABELS[grade ?? ''] ?? '—';
}

/** Shared HealthRing expects the mock-data capitalized grade union. */
export function toMockGrade(grade?: string | null): 'Excellent' | 'Good' | 'Average' | 'Poor' {
  const g = GRADE_LABELS[grade ?? ''];
  return (g === 'Excellent' || g === 'Good' || g === 'Average' || g === 'Poor') ? g : 'Average';
}

export const CATEGORY_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const CATEGORY_COLORS: Record<string, string> = {
  small: '#8A8A8A',
  medium: '#6AB8FF',
  large: '#C6FF33',
};

export const TREND_LABELS: Record<string, string> = {
  increasing: 'Increasing',
  stable: 'Stable',
  decreasing: 'Decreasing',
};

export const TREND_COLORS: Record<string, string> = {
  increasing: '#C6FF33',
  stable: '#8A8A8A',
  decreasing: '#FF5C5C',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: '#4ADE80',
  partial: '#FFB224',
  overdue: '#FF5C5C',
  pending: '#8A8A8A',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  pending: 'Pending',
};

export type PaymentHealth = 'regular' | 'occasional' | 'poor';

export const PAYMENT_HEALTH_LABELS: Record<PaymentHealth, string> = {
  regular: 'Regular',
  occasional: 'Occasional Delays',
  poor: 'Poor',
};

export const PAYMENT_HEALTH_COLORS: Record<PaymentHealth, string> = {
  regular: '#C6FF33',
  occasional: '#FFB224',
  poor: '#FF5C5C',
};

/** Payment behavior from average delay days (completed payments). */
export function paymentHealthFromDelay(avgDelay: number | null): PaymentHealth {
  if (avgDelay === null) return 'regular';
  if (avgDelay <= 7) return 'regular';
  if (avgDelay <= 14) return 'occasional';
  return 'poor';
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function daysSince(d: Date | string | null | undefined): number | null {
  const dt = toDate(d);
  if (!dt) return null;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / DAY_MS));
}

export function fmtDate(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtDateShort(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  const hh = dt.getHours();
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${fmtDateShort(dt)}, ${h12}:${mm} ${ampm}`;
}

export function relDays(days: number | null): string {
  if (days === null) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, full = false): string {
  const m = Number(key.split('-')[1]) - 1;
  return (full ? MONTHS_FULL : MONTHS)[m] ?? key;
}

/** Keys of the trailing n months INCLUDING the current (partial) month, oldest first. */
export function trailingMonthKeysInclusive(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Derived invoice/payment stats
// ---------------------------------------------------------------------------

export function monthlyTotals(invoices: DetailInvoice[], months: number): { key: string; total: number }[] {
  const keys = trailingMonthKeysInclusive(months);
  const map = new Map<string, number>();
  for (const inv of invoices) {
    const dt = toDate(inv.date);
    if (!dt) continue;
    const k = monthKeyOf(dt);
    map.set(k, (map.get(k) ?? 0) + inv.amount);
  }
  return keys.map((key) => ({ key, total: map.get(key) ?? 0 }));
}

export function avgPaymentDelay(payments: DetailPayment[]): number | null {
  const completed = payments.filter((p) => p.status === 'completed');
  if (completed.length === 0) return null;
  const avg = completed.reduce((a, p) => a + (p.delayDays ?? 0), 0) / completed.length;
  return Math.round(avg * 10) / 10;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
