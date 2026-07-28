import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router';
import { CalendarClock, CalendarDays, Map as MapIcon, MapPin, NotebookPen } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import FilterPills from '@/components/FilterPills';
import type { FilterDef } from '@/components/FilterPills';
import { useToasts } from '@/components/Toasts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/lib/use-count-up';
import { LOGIN_PATH } from '@/const';
import { trpc } from '@/lib/trpc-shim';
import RegionDashboard, { RegionDashboardSkeleton } from '@/pages/visits/RegionDashboard';
import OverdueRail, { OverdueRailSkeleton } from '@/pages/visits/OverdueRail';
import RouteCard, { buildRoute, estimateKm } from '@/pages/visits/RouteCard';
import CalendarMapView from '@/pages/visits/CalendarMapView';
import CityView from '@/pages/visits/CityView';
import VisitLog from '@/pages/visits/VisitLog';
import LogVisitModal from '@/pages/visits/LogVisitModal';
import { EASE_OUT, daysSince } from '@/pages/visits/shared';
import type { OverdueItem } from '@/pages/visits/shared';

type ViewTab = 'calendar' | 'city' | 'log';

const TABS: { id: ViewTab; label: string; icon: typeof MapIcon }[] = [
  { id: 'calendar', label: 'Calendar + Map', icon: CalendarDays },
  { id: 'city', label: 'City-wise', icon: MapIcon },
  { id: 'log', label: 'Visit Log', icon: NotebookPen },
];

function MiniKpi({ label, value, suffix, active, tone }: { label: string; value: number; suffix?: string; active: boolean; tone?: string }) {
  const v = useCountUp(value, active);
  return (
    <div className="flex flex-col px-5 first:pl-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      <span className="font-display text-[22px] font-extrabold tabular" style={{ color: tone ?? '#F5F5F5' }}>
        {Math.round(v)}
        {suffix && <span className="ml-0.5 text-[14px] text-muted">{suffix}</span>}
      </span>
    </div>
  );
}

function VisitsSkeleton() {
  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      <div className="shimmer-base h-12 w-[420px] rounded-full" />
      <RegionDashboardSkeleton />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OverdueRailSkeleton />
        <div className="shimmer-base h-[340px] rounded-[24px]" />
      </div>
      <div className="shimmer-base h-[440px] rounded-[24px]" />
    </div>
  );
}

/** Personal Visit Management — route `/visits`. */
export default function Visits() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const enabled = isAuthenticated;
  const { push } = useToasts();

  const regionQ = trpc.visits.regionDashboard.useQuery(undefined, { enabled });
  const cityQ = trpc.visits.cityView.useQuery(undefined, { enabled });
  const overdueQ = trpc.visits.overdue.useQuery(undefined, { enabled });
  const upcomingQ = trpc.visits.upcoming.useQuery(undefined, { enabled });
  const customersQ = trpc.customers.list.useQuery(undefined, { enabled });
  const kanbanQ = trpc.queries.kanban.useQuery(undefined, { enabled });

  const customers = useMemo<any[]>(() => customersQ.data ?? [], [customersQ.data]);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);
  const customerById = useMemo(() => new Map<string, any>(customers.map((c) => [c.id, c])), [customers]);

  // Aggregate every visit record (for calendar + visit log) per customer.
  const visitQueries = trpc.useQueries((t) =>
    customerIds.map((id) => t.visits.listByCustomer({ customerId: id }, { enabled })),
  );
  const visitsLoading = visitQueries.some((q) => q.isLoading);
  const allVisits = useMemo(() => visitQueries.flatMap((q) => q.data ?? []), [visitQueries]);

  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [tab, setTab] = useState<ViewTab>('calendar');
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ customerId?: string; date?: Date }>({});
  const remindedRef = useRef(false);

  const loading =
    authLoading ||
    (enabled &&
      (regionQ.isLoading || cityQ.isLoading || overdueQ.isLoading || upcomingQ.isLoading || customersQ.isLoading));

  const overdue = useMemo(() => overdueQ.data ?? [], [overdueQ.data]);
  const upcoming = useMemo(() => upcomingQ.data ?? [], [upcomingQ.data]);

  const openQueryIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of kanbanQ.data?.open ?? []) set.add(q.customerId);
    for (const q of kanbanQ.data?.in_progress ?? []) set.add(q.customerId);
    return set;
  }, [kanbanQ.data]);

  const routeStops = useMemo(() => buildRoute(overdue, openQueryIds), [overdue, openQueryIds]);
  const kmToday = estimateKm(routeStops.length);

  // visit-overdue toast on entry (notification catalog §11)
  useEffect(() => {
    if (loading || overdue.length === 0 || remindedRef.current) return;
    remindedRef.current = true;
    const top = overdue[0];
    const t = window.setTimeout(() => {
      push({
        type: 'visit-overdue',
        title: 'Visit overdue',
        body: `${top.name} not visited in ${top.pendingDays} days (limit 45)`,
        actionLabel: 'Schedule',
        onAction: () => {
          setPrefill({ customerId: top.customerId, date: new Date(Date.now() + 86_400_000) });
          setModalOpen(true);
        },
      });
    }, 1600);
    return () => window.clearTimeout(t);
  }, [loading, overdue, push]);

  // ------- filters -------
  const salespersons = useMemo(() => {
    const names = new Set<string>();
    for (const v of allVisits) if (v.salesRep?.name) names.add(v.salesRep.name);
    return [...names];
  }, [allVisits]);

  const filterDefs: FilterDef[] = useMemo(
    () => [
      { id: 'region', label: 'Region', options: [...new Set((regionQ.data ?? []).map((r) => r.region))] },
      { id: 'city', label: 'City', options: (cityQ.data ?? []).map((c) => c.city) },
      { id: 'rep', label: 'Salesperson', options: salespersons },
      { id: 'status', label: 'Status', options: ['Visited', 'Pending'] },
    ],
    [regionQ.data, cityQ.data, salespersons],
  );

  const fRegion = filters.region ?? [];
  const fCity = filters.city ?? [];
  const fRep = filters.rep ?? [];
  const fStatus = filters.status ?? [];

  const matchCustomer = (customerId: string, region?: string | null, city?: string | null) => {
    const c = customerById.get(customerId);
    const r = region ?? c?.region ?? null;
    const ci = city ?? c?.city ?? null;
    if (fRegion.length && !fRegion.includes(r ?? '')) return false;
    if (fCity.length && !fCity.includes(ci ?? '')) return false;
    return true;
  };

  const filteredOverdue = useMemo(
    () =>
      overdue.filter(
        (o) =>
          matchCustomer(o.customerId, o.region, o.city) &&
          !(fStatus.length === 1 && fStatus[0] === 'Visited'),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overdue, fRegion, fCity, fStatus, customerById],
  );

  const filteredUpcoming = useMemo(
    () => upcoming.filter((u) => matchCustomer(u.customerId, u.region, u.city)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upcoming, fRegion, fCity, customerById],
  );

  const filteredVisits = useMemo(
    () =>
      allVisits.filter((v) => {
        if (!matchCustomer(v.customerId)) return false;
        if (fRep.length && !fRep.includes(v.salesRep?.name ?? '')) return false;
        if (fStatus.length) {
          const recent = daysSince(v.date) <= 45;
          if (fStatus.includes('Visited') && !fStatus.includes('Pending') && !recent) return false;
          if (fStatus.includes('Pending') && !fStatus.includes('Visited') && recent) return false;
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allVisits, fRegion, fCity, fRep, fStatus, customerById],
  );

  const filteredCities = useMemo(
    () =>
      (cityQ.data ?? []).filter(
        (c) =>
          (!fRegion.length || fRegion.includes(c.region)) &&
          (!fCity.length || fCity.includes(c.city)) &&
          !(fStatus.length === 1 && fStatus[0] === 'Pending' && c.pending === 0),
      ),
    [cityQ.data, fRegion, fCity, fStatus],
  );

  // ------- KPI strip -------
  const dueThisWeek = useMemo(
    () =>
      upcoming.filter((u) => {
        const d = u.date instanceof Date ? u.date : new Date(u.date);
        const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
        return daysUntil <= 7;
      }).length,
    [upcoming],
  );
  const completion = useMemo(() => {
    const stats = regionQ.data ?? [];
    const total = stats.reduce((s, r) => s + r.total, 0);
    const visited = stats.reduce((s, r) => s + r.visited, 0);
    return total > 0 ? Math.round((visited / total) * 100) : 0;
  }, [regionQ.data]);

  const onSchedule = (item: OverdueItem) => {
    setPrefill({ customerId: item.customerId, date: new Date(Date.now() + 86_400_000) });
    setModalOpen(true);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <EmptyState
          icon={MapPin}
          title="Sign in to manage visits"
          body="Region dashboards, overdue reminders, routes and the visit log need a signed-in session."
          ctaLabel="Sign in"
          onCta={() => undefined}
        />
        <Link to={LOGIN_PATH} className="sr-only">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="ambient-glow min-h-full">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <VisitsSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8 px-8 py-8"
          >
            {/* KPI strip */}
            <div className="flex flex-wrap items-center divide-x divide-line">
              <MiniKpi label="Due this week" value={dueThisWeek} active />
              <MiniKpi label="Overdue" value={overdue.length} active tone="#FF5C5C" />
              <MiniKpi label="Completion" value={completion} suffix="%" active tone="#C6FF33" />
              <MiniKpi label="Km today" value={kmToday} suffix="km" active />
              <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted lg:flex">
                <CalendarClock size={12} className="text-warning" /> Visit cycle: 45 days
              </span>
            </div>

            {/* Filter row */}
            <FilterPills filters={filterDefs} selected={filters} onChange={setFilters} />

            {/* A. Region dashboard */}
            <RegionDashboard
              stats={regionQ.data ?? []}
              cities={cityQ.data ?? []}
              onViewRegion={(r) => setFilters((f) => ({ ...f, region: [r] }))}
            />

            {/* B + C. Overdue rail + AI route */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-[20px] font-bold text-primary">
                    Overdue visits <span className="ml-1 text-[14px] font-semibold tabular text-danger">{filteredOverdue.length}</span>
                  </h2>
                  <p className="metadata">45-day rule</p>
                </div>
                <OverdueRail items={filteredOverdue} customers={customers} onSchedule={onSchedule} />
              </section>
              <RouteCard stops={routeStops} />
            </div>

            {/* D. View tabs */}
            <div className="flex w-fit items-center gap-1 rounded-full bg-surface-2 p-1.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                    tab === id ? 'text-accent-foreground' : 'text-secondary hover:text-primary',
                  )}
                >
                  {tab === id && (
                    <motion.span
                      layoutId="visits-tab"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                  )}
                  <Icon size={14} className="relative z-10" />
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>

            {/* E. Active view */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                {tab === 'calendar' && (
                  <CalendarMapView
                    visits={filteredVisits}
                    upcoming={filteredUpcoming}
                    overdue={filteredOverdue}
                    customers={customers}
                  />
                )}
                {tab === 'city' && <CityView cities={filteredCities} overdue={filteredOverdue} />}
                {tab === 'log' && (
                  visitsLoading ? (
                    <div className="card-e1 flex flex-col gap-4 rounded-[24px] p-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="shimmer-base h-20 rounded-[20px]" />
                      ))}
                    </div>
                  ) : (
                    <VisitLog
                      visits={filteredVisits}
                      customers={customers}
                      onLogVisit={() => {
                        setPrefill({});
                        setModalOpen(true);
                      }}
                    />
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <LogVisitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={customers}
        prefillCustomerId={prefill.customerId ?? null}
        prefillDate={prefill.date ?? null}
      />
    </div>
  );
}
