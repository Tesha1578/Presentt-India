import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  periods?: string[];
  activePeriod?: string;
  onPeriodChange?: (p: string) => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** surface-1 r-28 p-24 chart container: header (title + period pills) → chart → footer stats. */
export default function ChartCard({
  title,
  periods,
  activePeriod,
  onPeriodChange,
  footer,
  children,
  className,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('card-e1 rounded-[28px] p-6', className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-primary">{title}</h3>
        {periods && (
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange?.(p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  p === activePeriod ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>{children}</div>
      {footer && <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">{footer}</div>}
    </motion.div>
  );
}
