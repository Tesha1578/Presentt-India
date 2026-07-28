import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, CalendarClock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp, useInViewOnce } from '@/lib/use-count-up';
import { EASE_OUT, SPRING, fmtDate } from './shared';
import type { CityStat, OverdueItem } from './shared';

function CityCard({
  stat,
  index,
  overdueInCity,
  expanded,
  onToggle,
}: {
  stat: CityStat;
  index: number;
  overdueInCity: OverdueItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const visited = stat.customers - stat.pending;
  const pct = stat.customers > 0 ? (visited / stat.customers) * 100 : 0;
  const pctCount = useCountUp(pct, inView);
  const topOverdue = overdueInCity[0];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: EASE_OUT }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
      className="card-e1 overflow-hidden rounded-[24px] p-5"
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <p className="flex items-center gap-2 text-[16px] font-semibold text-primary">
            <Building2 size={15} className="text-accent" /> {stat.city}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {stat.region} region · {stat.customers} customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-[24px] font-extrabold tabular text-accent">{Math.round(pctCount)}%</p>
          <ChevronDown size={15} className={cn('text-muted transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Visited vs Pending split bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
          <span className="text-accent">Visited {visited}</span>
          <span className="text-muted">Pending {stat.pending}</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={inView ? { width: `${pct}%` } : {}}
            transition={{ duration: 0.7, delay: 0.15 + index * 0.08, ease: EASE_OUT }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted tabular">{stat.recentVisits} visits in the last 45 days</p>
      </div>

      {topOverdue && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-secondary">
          <CalendarClock size={12} className="text-warning" />
          Most overdue: <span className="font-semibold text-primary">{topOverdue.name}</span>
          <span className="text-warning tabular">{topOverdue.pendingDays}d</span>
        </p>
      )}

      {/* Inline accordion: pending customers in this city */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {overdueInCity.length === 0 ? (
                <p className="text-[12px] text-muted">No pending customers in {stat.city}.</p>
              ) : (
                overdueInCity.map((o) => (
                  <motion.div
                    key={o.customerId}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-[14px] bg-surface-2 px-3 py-2.5"
                    style={{ boxShadow: 'inset 2px 0 0 rgba(255,178,36,0.7)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-primary">{o.name}</p>
                      <p className="text-[11px] text-muted">Last visit {fmtDate(o.lastVisitDate)}</p>
                    </div>
                    <span className="shrink-0 font-display text-[16px] font-extrabold tabular text-warning">
                      {o.pendingDays}d
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** E2. City-wise view — filter pills + city cards with animated split bars. */
export default function CityView({
  cities,
  overdue,
}: {
  cities: CityStat[];
  overdue: OverdueItem[];
}) {
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (cityFilter ? cities.filter((c) => c.city === cityFilter) : cities),
    [cities, cityFilter],
  );

  return (
    <div className="card-e1 rounded-[24px] p-5">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="metadata mr-2">Cities</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setCityFilter(null)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
            cityFilter === null ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-2 text-secondary hover:text-primary',
          )}
        >
          All
        </motion.button>
        {cities.map((c) => (
          <motion.button
            key={c.city}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setCityFilter(cityFilter === c.city ? null : c.city)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
              cityFilter === c.city ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-2 text-secondary hover:text-primary',
            )}
          >
            {c.city} · {c.region}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c, i) => (
          <CityCard
            key={c.city}
            stat={c}
            index={i}
            overdueInCity={overdue.filter((o) => o.city === c.city)}
            expanded={expanded === c.city}
            onToggle={() => setExpanded(expanded === c.city ? null : c.city)}
          />
        ))}
      </div>
    </div>
  );
}
