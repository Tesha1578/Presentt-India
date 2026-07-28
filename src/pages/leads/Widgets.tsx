import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp, useInViewOnce } from '@/lib/use-count-up';
import { trpc } from '@/lib/trpc-shim';
import { STAGE_COLOR, STAGE_ORDER, LeadStageLabels, Shimmer } from '@/components/leads/leads-ui';

const card =
  'card-e1 rounded-[28px] p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-e2';

function Num({ value, suffix, className }: { value: number; suffix?: string; className?: string }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>();
  const v = useCountUp(value, inView);
  return (
    <span ref={ref} className={cn('tabular', className)}>
      {value % 1 !== 0 ? v.toFixed(1) : Math.round(v).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/** A1 — mini horizontal 4-bar funnel + connector % chips. */
function FunnelCard({ delay }: { delay: number }) {
  const { data } = trpc.leads.funnel.useQuery();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  const stages = data?.stages ?? [];
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={card}
      ref={ref}
    >
      <p className="metadata">Lead Funnel</p>
      <div className="mt-4 flex flex-col gap-3">
        {stages.map((s, i) => (
          <div key={s.stage}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] font-semibold text-secondary">{s.label}</span>
              <span className="font-display text-[14px] font-bold text-primary tabular">{s.count}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ backgroundColor: STAGE_COLOR[s.stage] }}
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: s.count / max } : {}}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {s.connectorPct !== undefined && (
                <span className="w-10 shrink-0 rounded-full bg-accent-dim px-1.5 py-0.5 text-center text-[10px] font-semibold text-accent tabular">
                  {s.connectorPct}%
                </span>
              )}
            </div>
          </div>
        ))}
        {!data && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-6" />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** A2 — stage-wise counts stacked + invalid in red. */
function StageCountCard({ delay }: { delay: number }) {
  const { data } = trpc.leads.stageCounts.useQuery();
  const max = data ? Math.max(1, ...STAGE_ORDER.map((s) => data.counts[s])) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={card}
    >
      <p className="metadata">Stage-wise Count</p>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3.5">
        {STAGE_ORDER.map((s) => (
          <div key={s}>
            <div className="flex items-baseline gap-2">
              <Num
                value={data?.counts[s] ?? 0}
                className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-primary"
              />
            </div>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: STAGE_COLOR[s] }}>
              {LeadStageLabels[s]}
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ backgroundColor: STAGE_COLOR[s] }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: (data?.counts[s] ?? 0) / max }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
        <span className="font-display font-bold text-danger tabular">{data?.invalidCustomer ?? 0}</span> marked
        Invalid Customer
      </p>
    </motion.div>
  );
}

/** A3 — avg conversion time hero numeral + sparkline + delta chip. */
function AvgTimeCard({ delay }: { delay: number }) {
  const { data } = trpc.leads.conversionStats.useQuery();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  const avg = data?.avgConversionDays ?? 0;
  const spark = [avg + 3.2, avg + 2.4, avg + 2.6, avg + 1.3, avg + 0.8, Math.max(avg, 0.5)];
  const min = Math.min(...spark);
  const maxV = Math.max(...spark);
  const pts = spark.map((v, i) => [(i / (spark.length - 1)) * 100, 36 - 4 - ((v - min) / (maxV - min || 1)) * 28]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={card}
      ref={ref}
    >
      <p className="metadata">Avg Conversion Time</p>
      <div className="mt-2 flex items-end gap-2">
        <Num
          value={avg}
          suffix=" days"
          className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-primary"
        />
        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-semibold text-accent">
          <TrendingDown size={12} /> 2.1d faster
        </span>
      </div>
      <svg viewBox="0 0 100 36" className="mt-3 h-12 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="avg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6FF33" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#C6FF33" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L100,36 L0,36 Z`} fill="url(#avg-fill)" />
        <motion.path
          d={line}
          fill="none"
          stroke="#C6FF33"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </motion.div>
  );
}

/** A4 — 2×2 totals grid. */
function TotalsCard({ delay }: { delay: number }) {
  const { data } = trpc.leads.conversionStats.useQuery();
  const cells = [
    { label: 'Total Leads', value: data?.total ?? 0, color: 'text-primary' },
    { label: 'Converted', value: data?.converted ?? 0, color: 'text-accent' },
    { label: 'Invalid', value: data?.invalid ?? 0, color: 'text-danger' },
    { label: 'Conversion Rate', value: data?.conversionRate ?? 0, suffix: '%', color: 'text-primary' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={card}
    >
      <p className="metadata">Totals</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-[20px] bg-surface-2 p-3.5">
            <Num
              value={c.value}
              suffix={c.suffix}
              className={cn('font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]', c.color)}
            />
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{c.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/** Widget row A — 4 cards, staggered 70ms. */
export default function Widgets() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <FunnelCard delay={0} />
      <StageCountCard delay={0.07} />
      <AvgTimeCard delay={0.14} />
      <TotalsCard delay={0.21} />
    </div>
  );
}
