import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import ChartCard from '@/components/ChartCard';
import CountUp from '@/components/analytics/CountUp';
import { EASE, GRADE_COLORS } from '@/components/analytics/utils';
import { HealthRules } from '@contracts/constants';
import { cn } from '@/lib/utils';

interface HealthDonutProps {
  distribution: { grade: string; count: number }[];
}

const GRADE_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor',
};

const SIZE = 200;
const R = 78;
const CIRC = 2 * Math.PI * R;

/** Section E — customer health distribution donut (grade-colored, hover expands +6px). */
export default function HealthDonut({ distribution }: HealthDonutProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const total = distribution.reduce((a, d) => a + d.count, 0);

  const segments = useMemo(() => {
    let offset = 0;
    return distribution
      .filter((d) => d.count > 0)
      .map((d) => {
        const frac = total > 0 ? d.count / total : 0;
        const seg = { ...d, frac, offset };
        offset += frac;
        return seg;
      });
  }, [distribution, total]);

  return (
    <ChartCard
      title="Customer Health Distribution"
      footer={
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setRulesOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-accent"
          >
            <Info size={13} strokeWidth={1.75} /> Health rule definitions
          </button>
          {rulesOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="glass-strong absolute bottom-full left-0 z-30 mb-2 w-full rounded-[20px] p-4"
            >
              <p className="metadata mb-2">Rules · Large customers · trailing 3 months</p>
              {HealthRules.map((rule) => {
                const grade = rule.split(' ')[0].toLowerCase();
                return (
                  <p key={rule} className="flex items-center gap-2 py-1 text-[12px] text-secondary">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade] }} />
                    {rule}
                  </p>
                );
              })}
            </motion.div>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#2A2A2A" strokeWidth={22} />
            {segments.map((seg, i) => {
              const isHover = hovered === seg.grade;
              return (
                <motion.circle
                  key={seg.grade}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={GRADE_COLORS[seg.grade]}
                  strokeWidth={isHover ? 28 : 22}
                  strokeLinecap="butt"
                  strokeDasharray={`${Math.max(seg.frac * CIRC - 3, 0)} ${CIRC}`}
                  onMouseEnter={() => setHovered(seg.grade)}
                  onMouseLeave={() => setHovered(null)}
                  initial={{ strokeDashoffset: CIRC, opacity: 0 }}
                  whileInView={{ strokeDashoffset: -seg.offset * CIRC, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[36px] font-extrabold leading-none tracking-[-0.03em] text-primary">
              <CountUp value={hovered ? distribution.find((d) => d.grade === hovered)?.count ?? 0 : total} />
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {hovered ? GRADE_LABELS[hovered] : 'Customers'}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          {distribution.map((d, i) => {
            const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
            return (
              <motion.button
                key={d.grade}
                type="button"
                onMouseEnter={() => setHovered(d.grade)}
                onMouseLeave={() => setHovered(null)}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.06, ease: EASE }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors',
                  hovered === d.grade ? 'bg-surface-3' : 'bg-transparent',
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: GRADE_COLORS[d.grade] }} />
                <span className="flex-1 text-[13px] font-medium text-secondary">{GRADE_LABELS[d.grade]}</span>
                <span className="text-[13px] font-semibold text-primary tabular">
                  <CountUp value={d.count} />
                </span>
                <span className="w-9 text-right text-[11px] text-muted tabular">{pct}%</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
