import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc-shim';
import { EASE } from '@/components/analytics/utils';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import HeroKpis from '@/pages/analytics/HeroKpis';
import SalesMonitor from '@/pages/analytics/SalesMonitor';
import InsightRail from '@/pages/analytics/InsightRail';
import TrendForecast from '@/pages/analytics/TrendForecast';
import HealthDonut from '@/pages/analytics/HealthDonut';
import FunnelConversion from '@/pages/analytics/FunnelConversion';
import PaymentCollection from '@/pages/analytics/PaymentCollection';
import RegionHeatmap from '@/pages/analytics/RegionHeatmap';
import MonthlyComparison from '@/pages/analytics/MonthlyComparison';
import TopCustomers from '@/pages/analytics/TopCustomers';
import InactiveCustomers from '@/pages/analytics/InactiveCustomers';
import DiscountChurn from '@/pages/analytics/DiscountChurn';

const PERIOD_MONTHS: Record<string, number> = { '30D': 2, '3M': 3, '6M': 6, '1Y': 12 };

function AnalyticsSkeleton() {
  return (
    <div className="px-8 py-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer-base h-44 rounded-[28px]" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="shimmer-base col-span-12 h-[380px] rounded-[28px] lg:col-span-7" />
        <div className="shimmer-base col-span-12 h-[380px] rounded-[28px] lg:col-span-5" />
        <div className="shimmer-base col-span-12 h-[380px] rounded-[28px]" />
        <div className="shimmer-base col-span-12 h-[320px] rounded-[28px] lg:col-span-4" />
        <div className="shimmer-base col-span-12 h-[320px] rounded-[28px] lg:col-span-4" />
        <div className="shimmer-base col-span-12 h-[320px] rounded-[28px] lg:col-span-4" />
      </div>
    </div>
  );
}

interface FilterPillProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function FilterPill({ label, value, options, onChange }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.94 }}
        className={cn(
          'rounded-full px-4 py-2 text-[12px] font-semibold transition-all',
          value !== 'All'
            ? 'bg-accent-dim text-accent shadow-accent-glow'
            : 'bg-surface-2 text-secondary hover:text-primary',
        )}
      >
        {value === 'All' ? label : value} ▾
      </motion.button>
      {open && (
        <motion.div
          initial={{ scale: 0.96, y: -4, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="glass-strong absolute left-0 top-full z-40 mt-2 min-w-[160px] rounded-[18px] p-1.5"
        >
          {['All', ...options].map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={cn(
                'block w-full rounded-[12px] px-3 py-2 text-left text-[12px] font-medium transition-colors',
                o === value ? 'bg-accent-dim text-accent' : 'text-secondary hover:bg-surface-3 hover:text-primary',
              )}
            >
              {o}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/** Sales Monitoring & BI — route `/analytics`. All 16 MoM widgets, cards only. */
export default function Analytics() {
  const [period, setPeriod] = useState('1Y');
  const [region, setRegion] = useState('All');
  const [category, setCategory] = useState('All');
  const [trendFilter, setTrendFilter] = useState('All');

  const months = PERIOD_MONTHS[period] ?? 12;

  const kpis = trpc.analytics.kpis.useQuery();
  const monitor = trpc.analytics.salesMonitoring30d.useQuery();
  const health = trpc.analytics.healthDistribution.useQuery();
  const monthly = trpc.analytics.monthlyComparison.useQuery();
  const regions = trpc.analytics.regionPerformance.useQuery();
  const top = trpc.analytics.topCustomers.useQuery({ limit: 5 });
  const inactive = trpc.analytics.inactiveCustomers.useQuery();
  const discounts = trpc.analytics.discountMonitoring.useQuery();
  const churn = trpc.analytics.churnRisk.useQuery();
  const payments = trpc.analytics.paymentCollection.useQuery();
  const trend = trpc.analytics.trendSeries.useQuery({ months });
  const forecast = trpc.analytics.forecastSeries.useQuery({ months: 3 });
  const funnel = trpc.leads.funnel.useQuery();
  const conversion = trpc.leads.conversionStats.useQuery();
  const cityView = trpc.visits.cityView.useQuery();
  const kanban = trpc.queries.kanban.useQuery();

  const loading = kpis.isLoading || monitor.isLoading;

  // queries per region (open + in-progress), from kanban rows carrying the customer relation
  const queriesByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    const board = kanban.data;
    if (!board) return map;
    for (const q of [...board.open, ...board.in_progress]) {
      const r = q.customer?.region ?? 'Unassigned';
      map[r] = (map[r] ?? 0) + 1;
    }
    return map;
  }, [kanban.data]);

  // filtered view models (live-filter by pill row)
  const byRegion = (rows: any[] | undefined): any[] =>
    (rows ?? []).filter((r: any) => region === 'All' || (r.region ?? 'Unassigned') === region);

  const filteredMonitor = useMemo(() => {
    const b = monitor.data;
    if (!b) return undefined;
    return {
      regular: byRegion(b.regular),
      no_sales: byRegion(b.no_sales),
      increasing: byRegion(b.increasing),
      decreasing: byRegion(b.decreasing),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitor.data, region]);

  const filteredTop = useMemo(
    () => byRegion(top.data).filter((r) => category === 'All' || (r.category ?? '') === category.toLowerCase()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top.data, region, category],
  );

  const filteredInactive = byRegion(inactive.data);
  const filteredDiscounts = byRegion(discounts.data);
  const filteredChurn = byRegion(churn.data);
  const filteredRegions = (regions.data ?? []).filter((r: any) => region === 'All' || r.region === region);
  const filteredCities = (cityView.data ?? []).filter((c: any) => region === 'All' || c.region === region);

  // trend bucket filter affects the monitor card emphasis only
  const trendOptions = ['Increasing', 'Decreasing', 'Stable'];

  if (loading) return <AnalyticsSkeleton />;

  if (kpis.data && kpis.data.totalInvoiced === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <EmptyState
          title="Analytics unlock after your first accounting sync"
          body="Connect Tally / Zoho Books to populate revenue, payments, health grades and every BI widget."
          ctaLabel="Sync now"
          useIllustration
        />
      </div>
    );
  }

  const trendSeries = trend.data ?? [];
  const momPct = monthly.data?.[monthly.data.length - 1]?.momPct ?? null;
  const topRegion = (regions.data ?? [])[0];
  const breaches = (discounts.data ?? []).filter((d: any) => d.declining).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="ambient-glow px-8 py-8"
    >
      {/* Filter row */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15, ease: EASE }}
        className="glass mb-6 flex flex-wrap items-center gap-2 rounded-full px-4 py-2"
      >
        <FilterPill label="Region" value={region} options={['West', 'North', 'South', 'East', 'Unassigned']} onChange={setRegion} />
        <FilterPill label="Customer Category" value={category} options={['Small', 'Medium', 'Large']} onChange={setCategory} />
        <FilterPill label="Sales Trend" value={trendFilter} options={trendOptions} onChange={setTrendFilter} />
        <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1">
          {Object.keys(PERIOD_MONTHS).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                p === period ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* A. Hero KPI row */}
      {kpis.data && (
        <HeroKpis
          monthlyRevenue={kpis.data.monthlyRevenue}
          totalCustomers={kpis.data.totalCustomers}
          activeLeads={kpis.data.activeLeads}
          collectionPct={kpis.data.collectionPct}
          trend={trendSeries.map((t: any) => t.total)}
          momPct={momPct}
        />
      )}

      {/* B + C */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          {filteredMonitor && <SalesMonitor buckets={filteredMonitor} />}
        </div>
        <div className="col-span-12 lg:col-span-5">
          <InsightRail
            discountBreachCount={breaches}
            thresholdPct={kpis.data?.thresholds.discountDeclinePct ?? 15}
            windowMonths={kpis.data?.thresholds.discountWindowMonths ?? 3}
            topRegion={topRegion ? { region: topRegion.region, delta: topRegion.delta } : undefined}
            churnCount={(churn.data ?? []).length}
            nextForecast={forecast.data?.[0]?.projected}
          />
        </div>
      </div>

      {/* D. Trend + forecast */}
      <div className="mt-6">
        <TrendForecast trend={trendSeries} forecast={forecast.data ?? []} period={period} onPeriodChange={setPeriod} />
      </div>

      {/* E / F / G */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4">{health.data && <HealthDonut distribution={health.data} />}</div>
        <div className="col-span-12 lg:col-span-4">
          {funnel.data && conversion.data && (
            <FunnelConversion
              stages={funnel.data.stages}
              invalid={funnel.data.invalid}
              conversionRate={conversion.data.conversionRate}
              avgConversionDays={conversion.data.avgConversionDays}
            />
          )}
        </div>
        <div className="col-span-12 lg:col-span-4">
          {payments.data && monthly.data && (
            <PaymentCollection
              monthly={monthly.data}
              collectionPct={payments.data.collectionPct}
              totalCollected={payments.data.totalCollected}
              outstanding={payments.data.outstanding}
              overdueAmount={payments.data.overdueAmount}
              avgDelayDays={payments.data.avgDelayDays}
            />
          )}
        </div>
      </div>

      {/* H. Region performance + heatmap */}
      <div className="mt-6">
        <RegionHeatmap regions={filteredRegions} cities={filteredCities} queriesByRegion={queriesByRegion} />
      </div>

      {/* I / J / K */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4">{monthly.data && <MonthlyComparison rows={monthly.data} />}</div>
        <div className="col-span-12 lg:col-span-4">
          <TopCustomers rows={filteredTop} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <InactiveCustomers rows={filteredInactive} windowDays={kpis.data?.thresholds.noSalesAlertDays ?? 30} />
        </div>
      </div>

      {/* L. Discount monitoring + churn risk */}
      <div className="mt-6">
        <DiscountChurn discounts={filteredDiscounts} churn={filteredChurn} />
      </div>
    </motion.div>
  );
}
