import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Repeat, TrendingDown, TrendingUp, UserX, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CountUp from '@/components/analytics/CountUp';
import { EASE, inrCompact } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';
import { useToasts } from '@/components/Toasts';

export interface MonitorRow {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
  amount30d: number;
}
export type MonitorBuckets = Record<'regular' | 'no_sales' | 'increasing' | 'decreasing', MonitorRow[]>;

const TILES: {
  key: keyof MonitorBuckets;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { key: 'regular', label: 'Regular Sales', icon: Repeat, color: '#C6FF33' },
  { key: 'no_sales', label: 'No Sales', icon: UserX, color: '#FF5C5C' },
  { key: 'increasing', label: 'Increasing', icon: TrendingUp, color: '#C6FF33' },
  { key: 'decreasing', label: 'Decreasing', icon: TrendingDown, color: '#FF5C5C' },
];

/** Section B — rolling 30-day sales classification tiles + cohort drawer. */
export default function SalesMonitor({ buckets }: { buckets: MonitorBuckets }) {
  const [openBucket, setOpenBucket] = useState<keyof MonitorBuckets | null>(null);
  const [notifyOn, setNotifyOn] = useState(true);
  const { push } = useToasts();

  const activeTile = TILES.find((t) => t.key === openBucket);
  const rows = openBucket ? buckets[openBucket] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="card-e1 relative overflow-visible rounded-[28px] p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-primary">30-Day Sales Monitoring</h3>
          <p className="mt-0.5 text-[12px] text-muted">Rolling 30-day window · every customer classified</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotifyOn((v) => !v);
            push({
              type: 'ai-insight',
              title: notifyOn ? 'Zero-sales alerts paused' : 'Zero-sales alerts enabled',
              body: 'Customers with zero sales in 30 days will ' + (notifyOn ? 'no longer' : 'again') + ' fire customer-inactive notifications.',
            });
          }}
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
            notifyOn ? 'bg-accent-dim text-accent' : 'bg-surface-3 text-muted',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', notifyOn ? 'bg-accent shadow-accent-glow' : 'bg-muted')} />
          Zero-sales alerts {notifyOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TILES.map((tile, i) => {
          const rowsForTile = buckets[tile.key];
          const Icon = tile.icon;
          return (
            <motion.button
              key={tile.key}
              type="button"
              onClick={() => setOpenBucket(tile.key)}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.09, ease: EASE }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="rounded-[24px] bg-surface-2 p-5 text-left transition-shadow hover:shadow-e2"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: `${tile.color}1F`, color: tile.color }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="text-[11px] font-semibold text-muted">view →</span>
              </div>
              <p className="mt-3 font-display text-[36px] font-extrabold leading-none tracking-[-0.03em]" style={{ color: tile.color }}>
                <CountUp value={rowsForTile.length} />
              </p>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{tile.label}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 rounded-[16px] bg-surface-2 p-4 text-[12px] leading-relaxed text-secondary">
        <span className="font-semibold text-primary">Trend legend —</span> Increasing: 30-day sales above the prior
        30 days · Decreasing: below the prior 30 days · Regular: consistent repeat purchases · No Sales: zero sales
        in 30 days (fires a <span className="text-danger">customer-inactive</span> notification).
      </div>

      {/* Cohort drawer — springs in x:480→0 */}
      <AnimatePresence>
        {openBucket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpenBucket(null)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="glass-strong fixed bottom-4 right-4 top-4 z-[70] flex w-[440px] max-w-[92vw] flex-col rounded-[28px] p-6"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="metadata">Cohort</p>
                  <h4 className="mt-1 font-display text-[22px] font-bold text-primary">
                    {activeTile?.label} · {rows.length}
                  </h4>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpenBucket(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-muted hover:text-primary"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="no-scrollbar -mx-1 flex-1 space-y-2 overflow-y-auto px-1">
                {rows.length === 0 && <p className="text-[13px] text-muted">No customers in this cohort.</p>}
                {rows.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4), ease: EASE }}
                    className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-primary">{r.name}</p>
                      <p className="text-[11px] text-muted">
                        {[r.city, r.region].filter(Boolean).join(' · ') || 'Unassigned'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-secondary tabular">
                      {inrCompact(r.amount30d)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
