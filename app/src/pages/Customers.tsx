import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import SyncBanner from '@/components/customers/SyncBanner';
import FilterBar, { type CustomerFilters } from '@/components/customers/FilterBar';
import ReportShortcuts, { WINDOW_PILLS, type Cohort } from '@/components/customers/ReportShortcuts';
import AlertRail from '@/components/customers/AlertRail';
import CustomerCard from '@/components/customers/CustomerCard';
import DuplicatesModal from '@/components/customers/DuplicatesModal';
import { CustomerCardShimmer, CustomerGridShimmer } from '@/components/customers/Shimmers';
import { useClassificationSync } from '@/components/customers/use-sync';
import { toDate, type CustomerListItem } from '@/components/customers/utils';

const PAGE_SIZE = 12;

const SORTS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'health', label: 'Health' },
  { key: 'lastVisit', label: 'Last Visit' },
  { key: 'lastPurchase', label: 'Last Purchase' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

function cohortLabel(cohort: Cohort): string {
  if (cohort.kind === 'regular') return 'Regular Purchasing';
  if (cohort.kind === 'no-purchases') return 'No Purchases (30d)';
  const w = WINDOW_PILLS.find((p) => p.key === cohort.window)?.label ?? cohort.window;
  return `${cohort.kind === 'growth' ? 'Growing' : 'Declining'} · ${w}`;
}

/** Ranked search: exact GSTIN > exact ID > fuzzy name/GSTIN/ID substring. */
function searchRank(c: CustomerListItem, q: string): number {
  const query = q.trim().toLowerCase();
  if (!query) return 0;
  if (c.gstin.toLowerCase() === query) return 0;
  if (c.id.toLowerCase() === query) return 1;
  if (c.gstin.toLowerCase().includes(query)) return 2;
  if (c.id.toLowerCase().includes(query)) return 3;
  if (c.name.toLowerCase().includes(query)) return 4;
  return Number.POSITIVE_INFINITY;
}

export default function Customers() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [sort, setSort] = useState<SortKey>('health');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const { sync } = useClassificationSync();

  // 200ms debounce
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 200);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // reset pagination when the result set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, filters, cohort, sort]);

  const listQuery = trpc.customers.list.useQuery(undefined, { staleTime: 30_000 });
  const reportsQuery = trpc.customers.reports.useQuery(undefined, { staleTime: 30_000 });
  const discountsQuery = trpc.analytics.discountMonitoring.useQuery(undefined, { staleTime: 30_000 });
  const inactiveQuery = trpc.analytics.inactiveCustomers.useQuery(undefined, { staleTime: 30_000 });
  const topQuery = trpc.analytics.topCustomers.useQuery({ limit: 50 }, { staleTime: 60_000 });
  const duplicatesQuery = trpc.customers.duplicatesReport.useQuery(undefined, { staleTime: 60_000 });

  const revenueMap = useMemo(
    () => new Map<any, number>((topQuery.data ?? []).map((t: any) => [t.id, t.revenue6m])),
    [topQuery.data],
  );

  const cohortSet = useMemo(() => {
    if (!cohort || !reportsQuery.data) return null;
    const r = reportsQuery.data;
    if (cohort.kind === 'regular') return new Set(r.regularPurchasing);
    if (cohort.kind === 'no-purchases') return new Set(r.noPurchases);
    const rows = cohort.kind === 'growth' ? r.growth : r.decline;
    return new Set(rows.filter((x) => x.window === cohort.window).map((x) => x.id));
  }, [cohort, reportsQuery.data]);

  const processed = useMemo(() => {
    const rows = listQuery.data ?? [];
    let out = rows.filter((c) => {
      if (filters.region && c.region !== filters.region) return false;
      if (filters.category && c.category !== filters.category) return false;
      if (filters.salesTrend && c.salesTrend !== filters.salesTrend) return false;
      if (cohortSet && !cohortSet.has(c.id)) return false;
      return searchRank(c, search) !== Number.POSITIVE_INFINITY;
    });
    if (search) {
      out = [...out].sort((a, b) => searchRank(a, search) - searchRank(b, search));
    } else {
      const val = (c: CustomerListItem): number => {
        switch (sort) {
          case 'revenue': return revenueMap.get(c.id) ?? 0;
          case 'health': return c.healthScore;
          case 'lastVisit': return toDate(c.lastVisitAt)?.getTime() ?? 0;
          case 'lastPurchase': return toDate(c.lastPurchaseAt)?.getTime() ?? 0;
        }
      };
      out = [...out].sort((a, b) => val(b) - val(a));
    }
    return out;
  }, [listQuery.data, filters, cohortSet, search, sort, revenueMap]);

  const visible = processed.slice(0, visibleCount);
  const syncedAt = useMemo(() => {
    const dates = (listQuery.data ?? [])
      .map((c) => toDate(c.syncedAt)?.getTime() ?? 0);
    const max = Math.max(0, ...dates);
    return max > 0 ? new Date(max) : null;
  }, [listQuery.data]);

  const totalCount = useMemo(() => {
    if (reportsQuery.data) {
      return reportsQuery.data.regularPurchasing.length + reportsQuery.data.noPurchases.length;
    }
    return listQuery.data?.length ?? 0;
  }, [reportsQuery.data, listQuery.data]);

  const longestGap = useMemo(() => {
    const rows = inactiveQuery.data ?? [];
    return rows.length > 0 ? rows[0].idleDays : null;
  }, [inactiveQuery.data]);

  const isInitialLoading = listQuery.isLoading || reportsQuery.isLoading;

  const onLoadMore = () => {
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount((n) => n + PAGE_SIZE);
      setLoadingMore(false);
    }, 650);
  };

  return (
    <div className="ambient-glow flex flex-1 flex-col gap-6 px-8 py-8">
      {/* A. Sync banner */}
      <SyncBanner
        syncedAt={syncedAt}
        totalCount={totalCount}
        onViewDuplicates={() => setDupOpen(true)}
      />

      {/* Filter row */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* B. Report shortcut cards */}
      {reportsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer-base h-[132px] rounded-[24px]" />
          ))}
        </div>
      ) : (
        reportsQuery.data && (
          <ReportShortcuts
            reports={reportsQuery.data}
            longestGapDays={longestGap}
            cohort={cohort}
            onSelect={setCohort}
          />
        )
      )}

      {/* C. Discount-monitoring alert rail */}
      {discountsQuery.data && <AlertRail alerts={discountsQuery.data} />}

      {/* D. Search + sort + result count */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search size={15} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Customer ID, Name, or GSTIN…"
            className="h-11 w-full rounded-full bg-surface-2 pl-11 pr-10 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <AnimatePresence>
            {searchInput && (
              <motion.button
                type="button"
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-3 text-muted hover:text-primary"
              >
                <X size={12} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                sort === s.key ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="ml-auto text-[12px] font-semibold text-muted tabular">
          {processed.length} customer{processed.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Active cohort chip */}
      <AnimatePresence>
        {cohort && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="-mt-2 flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3 py-1.5 text-[12px] font-semibold text-accent">
              Cohort: {cohortLabel(cohort)}
              <button
                type="button"
                aria-label="Clear cohort filter"
                onClick={() => setCohort(null)}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 hover:bg-accent/40"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* E. Customer card grid */}
      {isInitialLoading ? (
        <CustomerGridShimmer count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          useIllustration
          title="No customers in this cohort"
          body="No customers in this cohort — the next accounting sync may add some."
          ctaLabel="Sync now"
          onCta={sync}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((c, i) => (
              <CustomerCard
                key={c.id}
                customer={c}
                index={i}
                highlightGstin={!!search && c.gstin.toLowerCase().includes(search.trim().toLowerCase())}
              />
            ))}
            {loadingMore && [0, 1, 2].map((i) => <CustomerCardShimmer key={`more-${i}`} />)}
          </div>

          {visibleCount < processed.length && !loadingMore && (
            <div className="flex justify-center pt-2">
              <motion.button
                type="button"
                onClick={onLoadMore}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-surface-2 px-6 py-2.5 text-[13px] font-semibold text-secondary transition-colors hover:bg-surface-3 hover:text-accent"
              >
                Load more ({processed.length - visibleCount} remaining)
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* Duplicates report modal */}
      <DuplicatesModal
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        groups={duplicatesQuery.data ?? []}
      />
    </div>
  );
}
