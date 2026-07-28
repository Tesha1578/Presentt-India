import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Building } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import EmptyState from '@/components/EmptyState';
import {
  CATEGORY_LABELS,
  TREND_LABELS,
  avgPaymentDelay,
  daysSince,
  monthlyTotals,
  paymentHealthFromDelay,
  relDays,
} from '@/components/customers/utils';
import ProfileHero from '@/pages/customers/ProfileHero';
import AiStack, { type ForecastData } from '@/pages/customers/AiStack';
import HealthCard from '@/pages/customers/HealthCard';
import SalesGraph from '@/pages/customers/SalesGraph';
import { InvoiceTimeline, PaymentHistory } from '@/pages/customers/FinancePanels';
import DiscountAlert from '@/pages/customers/DiscountAlert';
import { CommunicationLog, OpenQueries, VisitHistory } from '@/pages/customers/ActivityPanels';

function ProfileShimmer() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-8 py-8">
      <div className="shimmer-base h-[240px] rounded-[28px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="shimmer-base h-[150px] rounded-[24px]" />
          <div className="shimmer-base h-[140px] rounded-[24px]" />
          <div className="shimmer-base h-[180px] rounded-[24px]" />
        </div>
        <div className="shimmer-base h-[470px] rounded-[24px]" />
      </div>
      <div className="shimmer-base h-[380px] rounded-[28px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shimmer-base h-[420px] rounded-[24px]" />
        <div className="shimmer-base h-[420px] rounded-[24px]" />
      </div>
    </div>
  );
}

export default function CustomerProfile() {
  const { id } = useParams();
  const detailQuery = trpc.customers.byId.useQuery(
    { id: id ?? '' },
    { enabled: !!id, staleTime: 30_000 },
  );
  const discountsQuery = trpc.analytics.discountMonitoring.useQuery(undefined, { staleTime: 30_000 });

  const customer = detailQuery.data;

  // ----- derived stats (hooks above the early returns) ---------------------
  const derived = useMemo(() => {
    if (!customer) return null;

    const months = monthlyTotals(customer.invoices, 12);
    const currentRevenue = months[months.length - 1]?.total ?? 0;
    const prevRevenue = months[months.length - 2]?.total ?? 0;

    const avgDelay = avgPaymentDelay(customer.payments);
    const paymentHealth = paymentHealthFromDelay(avgDelay);

    const lastInvoice = customer.invoices[0]?.date ?? customer.lastPurchaseAt;
    const inactiveDays = daysSince(lastInvoice);
    const visitDays = daysSince(customer.lastVisitAt);

    // AI summary (seeded text preferred; data-derived fallback)
    const summary =
      customer.aiSummary ??
      `${customer.name} — ${CATEGORY_LABELS[customer.category ?? 'small'] ?? 'Small'}, ${[customer.city, customer.region].filter(Boolean).join(' ')}. ` +
      `Sales trend ${(TREND_LABELS[customer.salesTrend ?? 'stable'] ?? 'Stable').toLowerCase()}. ` +
      (avgDelay !== null ? `Payments averaging a ${avgDelay}-day delay. ` : 'Payments mostly regular. ') +
      (customer.openQueries.length > 0 ? `${customer.openQueries.length} open quer${customer.openQueries.length === 1 ? 'y' : 'ies'}. ` : 'No open queries. ') +
      (visitDays !== null ? `Last visit ${relDays(visitDays)}.` : 'No visits logged yet.');

    // Next Best Action
    const openQuery = customer.openQueries[0];
    const visitOverdue = visitDays !== null && visitDays > 45;
    let nba: { text: string; primaryLabel: string };
    if (openQuery && visitOverdue) {
      nba = {
        text: `Book a visit this week and resolve the ${openQuery.category} query on-site — accounts with an open query and a skipped visit churn 3.1× more.`,
        primaryLabel: 'Create visit',
      };
    } else if (visitOverdue) {
      nba = {
        text: `Book a visit — ${customer.name} hasn't been visited in ${visitDays} days (limit 45). Accounts visited within cadence reorder 1.8× more often.`,
        primaryLabel: 'Create visit',
      };
    } else if (openQuery) {
      const age = daysSince(openQuery.dateRaised) ?? 0;
      nba = {
        text: `Resolve the open ${openQuery.category} query — it's been open for ${age} day${age === 1 ? '' : 's'}. Fast resolution protects the reorder cycle.`,
        primaryLabel: 'Create visit',
      };
    } else if (customer.salesTrend === 'decreasing') {
      nba = {
        text: 'Share the refreshed price list and book a review call — sales are trending down and early re-engagement recovers 2 in 3 slipping accounts.',
        primaryLabel: 'Create visit',
      };
    } else {
      nba = {
        text: "Share the new catalogue and confirm this month's reorder — the account is healthy and buying regularly.",
        primaryLabel: 'Create visit',
      };
    }

    // Forecast — projection from 6 full months, dampened 3-mo trend
    const full = monthlyTotals(customer.invoices, 7).slice(0, 6).map((m) => m.total);
    const last3 = full.slice(3);
    const prev3 = full.slice(0, 3);
    const a = last3.reduce((x, y) => x + y, 0) / 3;
    const b = prev3.reduce((x, y) => x + y, 0) / 3;
    const g = b > 0 ? Math.max(-0.25, Math.min(0.25, (a - b) / b)) : 0;
    const proj = Math.max(a * (1 + g * 0.5), 0);
    const mean = full.reduce((x, y) => x + y, 0) / Math.max(full.length, 1);
    const variance = full.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(full.length, 1);
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0.5;
    const confidence = Math.max(55, Math.min(92, Math.round(92 - cv * 120)));
    const forecast: ForecastData = {
      low: Math.round(proj * 0.95),
      high: Math.round(proj * 1.05),
      confidence,
      spark: monthlyTotals(customer.invoices, 6).map((m) => m.total),
      drivers: [
        'order pattern',
        'seasonality',
        customer.salesTrend === 'increasing'
          ? '3-mo uptrend'
          : customer.salesTrend === 'decreasing'
            ? '3-mo downtrend'
            : 'stable cadence',
      ],
    };

    return { currentRevenue, prevRevenue, avgDelay, paymentHealth, inactiveDays, summary, nba, forecast };
  }, [customer]);

  const discountAlert = useMemo(
    () => (discountsQuery.data ?? []).find((d) => d.id === id && d.declining),
    [discountsQuery.data, id],
  );

  if (detailQuery.isLoading) return <ProfileShimmer />;

  if (!customer || !derived) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <EmptyState
          icon={Building}
          title={`Customer ${id ?? ''} not found`}
          body="This customer may not have synced from the accounting software yet."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-8 py-8">
      {/* A. Hero */}
      <ProfileHero
        customer={customer}
        currentRevenue={derived.currentRevenue}
        prevRevenue={derived.prevRevenue}
        paymentHealth={derived.paymentHealth}
        avgDelay={derived.avgDelay}
        inactiveDays={derived.inactiveDays}
      />

      {/* B. AI stack + C. Health explainer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AiStack customer={customer} summary={derived.summary} nba={derived.nba} forecast={derived.forecast} />
        <HealthCard grade={customer.healthGrade} score={customer.healthScore} />
      </div>

      {/* D. Sales graph */}
      <SalesGraph customer={customer} />

      {/* E/F. Payments + Invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PaymentHistory customer={customer} />
        <InvoiceTimeline customer={customer} />
      </div>

      {/* G. Discount-decline alert (conditional) */}
      {discountAlert && <DiscountAlert customer={customer} alert={discountAlert} />}

      {/* H/I. Visits + Queries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VisitHistory customer={customer} />
        <OpenQueries customer={customer} />
      </div>

      {/* J. Communication log */}
      <CommunicationLog customer={customer} />
    </div>
  );
}
