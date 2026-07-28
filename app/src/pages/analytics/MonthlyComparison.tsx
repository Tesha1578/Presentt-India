import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';
import { EASE, inrCompact, monthLabel } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';

interface MonthlyComparisonProps {
  rows: { month: string; total: number; invoices: number; momPct: number | null }[];
}

const WINDOWS = [
  { label: 'Monthly', months: 2 },
  { label: 'Last 3 Months', months: 4 },
  { label: 'Last 6 Months', months: 6 },
];

/** Section I — this month vs last, grouped columns with MoM delta chips. */
export default function MonthlyComparison({ rows }: MonthlyComparisonProps) {
  const [windowLabel, setWindowLabel] = useState('Monthly');
  const months = WINDOWS.find((w) => w.label === windowLabel)?.months ?? 2;
  const visible = useMemo(() => rows.slice(-months), [rows, months]);
  const max = Math.max(...visible.map((r) => r.total), 1);

  return (
    <ChartCard
      title="Monthly Comparison"
      periods={WINDOWS.map((w) => w.label)}
      activePeriod={windowLabel}
      onPeriodChange={setWindowLabel}
      footer={
        <span className="text-[11px] text-muted">
          Revenue columns with invoice counts · exact MoM windows (monthly / 3-month / 6-month)
        </span>
      }
    >
      <div className="flex items-end gap-3" style={{ minHeight: 220 }}>
        {visible.map((r, i) => {
          const latest = i === visible.length - 1;
          return (
            <div key={r.month} className="flex flex-1 flex-col items-center gap-2">
              <span className={cn('text-[12px] font-semibold tabular', latest ? 'text-accent' : 'text-secondary')}>
                {inrCompact(r.total)}
              </span>
              <motion.div
                className="w-full max-w-[64px] origin-bottom rounded-t-[12px]"
                style={{
                  background: latest ? '#C6FF33' : '#3A3A3A',
                  boxShadow: latest ? '0 0 20px rgba(198,255,51,0.25)' : undefined,
                }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
                animate={{ height: Math.max((r.total / max) * 180, 8) }}
              />
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{monthLabel(r.month)}</p>
                <p className="text-[10px] text-muted tabular">{r.invoices} invoices</p>
                {r.momPct !== null && (
                  <span
                    className={cn(
                      'mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular',
                      r.momPct >= 0 ? 'bg-accent-dim text-accent' : 'bg-[rgba(255,92,92,0.12)] text-danger',
                    )}
                  >
                    {r.momPct >= 0 ? '▲' : '▼'} {Math.abs(r.momPct)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
