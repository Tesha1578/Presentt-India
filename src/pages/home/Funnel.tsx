import { useState } from 'react';
import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';
import { useInViewOnce } from '@/lib/use-count-up';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';
import { useDashboardHome } from '@/pages/home/use-dashboard';

const STAGE_COLOR: Record<string, string> = {
  new_lead: '#6AB8FF',
  enquiry_visit: '#FFB224',
  quotation_negotiation: '#C6FF33',
  order_confirmed: '#4ADE80',
};

interface FunnelBar {
  stage: string;
  count: number;
  color: string;
  connectorPct?: number;
}

/** Horizontal funnel bars, scaleX in staggered, hover dims siblings. */
export default function Funnel() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  const [hovered, setHovered] = useState<number | null>(null);
  const { data } = useDashboardHome();
  const statsQuery = trpc.leads.conversionStats.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  const bars: FunnelBar[] = data
    ? [
        ...data.funnel.stages.map((s) => ({
          stage: s.label,
          count: s.count,
          color: STAGE_COLOR[s.stage] ?? '#8A8A8A',
          connectorPct: s.connectorPct,
        })),
        { stage: 'Invalid', count: data.funnel.invalid, color: '#FF5C5C' },
      ]
    : [];

  const max = Math.max(1, ...bars.map((s) => s.count));
  const isInvalid = (i: number) => bars[i].stage === 'Invalid';
  const avgDays = statsQuery.data?.avgConversionDays ?? 0;
  const convRate = statsQuery.data?.conversionRate ?? 0;
  const invalidCount = data?.funnel.invalid ?? 0;

  return (
    <ChartCard
      title="Lead Funnel — This Quarter"
      className="h-full"
      footer={
        <>
          <span className="text-[12px] text-muted">
            Avg Conversion Time{' '}
            <span className="font-display font-bold text-primary tabular">{avgDays} days</span>
          </span>
          <span className="text-[12px] text-muted">
            Conversion Rate{' '}
            <span className="font-display font-bold text-accent tabular">{convRate}%</span>
          </span>
          <span className="text-[12px] text-muted">
            <span className="text-danger">{invalidCount} invalid</span> excluded from rate
          </span>
        </>
      }
    >
      <div ref={ref} className="flex flex-col gap-3">
        {bars.map((s, i) => {
          const pct = (s.count / max) * 100;
          return (
            <div key={s.stage}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-semibold text-secondary">{s.stage}</span>
                <span className="font-display text-[15px] font-bold text-primary tabular">{s.count}</span>
              </div>
              <div className="relative h-9 w-full overflow-hidden rounded-[12px] bg-surface-2">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isInvalid(i) ? 'rgba(255,92,92,0.35)' : s.color,
                    transformOrigin: 'left',
                  }}
                  className={cn(
                    'h-full rounded-[12px] transition-opacity duration-200',
                    hovered !== null && hovered !== i && 'opacity-40',
                  )}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
                {s.connectorPct !== undefined && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.5 + i * 0.12 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] font-bold text-secondary tabular"
                  >
                    {s.connectorPct}% →
                  </motion.span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
