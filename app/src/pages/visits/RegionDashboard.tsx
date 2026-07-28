import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ProgressRing from '@/components/ProgressRing';
import { useCountUp, useInViewOnce } from '@/lib/use-count-up';
import { EASE_OUT, REGION_ORDER } from './shared';
import type { CityStat, RegionStat } from './shared';

function RegionCard({
  stat,
  topPendingCity,
  delay,
  onViewRegion,
}: {
  stat: RegionStat;
  topPendingCity?: string;
  delay: number;
  onViewRegion: (region: string) => void;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const visited = useCountUp(stat.visited, inView);
  const pending = useCountUp(stat.pending, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE_OUT }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
      className="card-e1 flex flex-col gap-4 rounded-[24px] p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="metadata">{stat.region} region</p>
          <p className="mt-1 font-display text-[18px] font-bold text-primary">
            {stat.total} customers
          </p>
        </div>
        <ProgressRing value={stat.completionPct} size={96} stroke={8} label="done" />
      </div>

      <div className="flex items-center gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Total Customers</p>
          <p className="font-display text-[22px] font-extrabold tabular text-primary">{stat.total}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Visited</p>
          <p className="font-display text-[22px] font-extrabold tabular text-accent">{Math.round(visited)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Pending</p>
          <motion.p
            key={stat.pending}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="font-display text-[22px] font-extrabold tabular text-warning"
          >
            {Math.round(pending)}
          </motion.p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
        {topPendingCity ? (
          <span className="rounded-full bg-[rgba(255,178,36,0.12)] px-2.5 py-1 text-[11px] font-semibold text-warning">
            Most pending: {topPendingCity}
          </span>
        ) : (
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted">
            All caught up
          </span>
        )}
        <button
          type="button"
          onClick={() => onViewRegion(stat.region)}
          className="flex items-center gap-1 text-[12px] font-semibold text-accent transition-transform hover:translate-x-0.5"
        >
          View region <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

export function RegionDashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-e1 flex flex-col gap-4 rounded-[24px] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="shimmer-base h-3 w-20 rounded-full" />
              <div className="shimmer-base h-5 w-28 rounded-full" />
            </div>
            <div className="shimmer-base h-24 w-24 rounded-full" />
          </div>
          <div className="flex gap-6">
            <div className="shimmer-base h-8 w-12 rounded-[12px]" />
            <div className="shimmer-base h-8 w-12 rounded-[12px]" />
            <div className="shimmer-base h-8 w-12 rounded-[12px]" />
          </div>
          <div className="shimmer-base h-7 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A. Region dashboard row — one card per region with animated completion rings. */
export default function RegionDashboard({
  stats,
  cities,
  onViewRegion,
}: {
  stats: RegionStat[];
  cities: CityStat[];
  onViewRegion: (region: string) => void;
}) {
  const ordered = [...stats].sort((a, b) => {
    const ia = REGION_ORDER.indexOf(a.region);
    const ib = REGION_ORDER.indexOf(b.region);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const topPendingCity = (region: string) => {
    const inRegion = cities.filter((c) => c.region === region && c.pending > 0);
    inRegion.sort((a, b) => b.pending - a.pending);
    return inRegion[0]?.city;
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[20px] font-bold text-primary">Region dashboard</h2>
        <p className="metadata">
          Visit cycle target: every <span className="text-accent">45 days</span> (configurable in Settings)
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {ordered.map((s, i) => (
          <RegionCard
            key={s.region}
            stat={s}
            topPendingCity={topPendingCity(s.region)}
            delay={i * 0.12}
            onViewRegion={onViewRegion}
          />
        ))}
      </div>
    </section>
  );
}
