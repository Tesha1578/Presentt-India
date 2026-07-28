import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp, useInViewOnce } from '@/lib/use-count-up';

interface KpiCardProps {
  label: string;
  value: number;
  format?: 'int' | 'percent' | 'currency';
  delta?: { value: string; positive: boolean };
  spark?: number[];
  delay?: number;
  className?: string;
}

function Sparkline({ data, active }: { data: number[]; active: boolean }) {
  const w = 100;
  const h = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 4 - ((v - min) / range) * (h - 8),
  ]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6FF33" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C6FF33" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" opacity={active ? 1 : 0} style={{ transition: 'opacity 600ms 300ms' }} />
      <motion.path
        d={line}
        fill="none"
        stroke="#C6FF33"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/** surface-1 r-28 p-24 KPI card: label → count-up value → delta chip → sparkline. */
export default function KpiCard({ label, value, format = 'int', delta, spark, delay = 0, className }: KpiCardProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const animated = useCountUp(value, inView);
  const display =
    format === 'percent'
      ? `${animated.toFixed(1)}%`
      : format === 'currency'
        ? `₹${Math.round(animated).toLocaleString('en-IN')}`
        : Math.round(animated).toLocaleString('en-IN');

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
      className={cn('card-e1 rounded-[28px] p-6', className)}
    >
      <p className="metadata">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-primary tabular">
          {display}
        </span>
        {delta && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              delta.positive ? 'bg-accent-dim text-accent' : 'bg-[rgba(255,92,92,0.12)] text-danger',
            )}
          >
            {delta.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta.value}
          </span>
        )}
      </div>
      {spark && (
        <div className="mt-3">
          <Sparkline data={spark} active={inView} />
        </div>
      )}
    </motion.div>
  );
}
