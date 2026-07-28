import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HealthRules } from '@contracts/constants';
import HealthRing from '@/components/HealthRing';
import { GRADE_COLORS, gradeLabel, toMockGrade } from '@/components/customers/utils';

interface HealthCardProps {
  grade?: string | null;
  score: number;
}

/**
 * §10.7 — Customer Health (Large customers, trailing 3 months).
 * Renders the exact MoM rule matrix; the current grade row glows lime.
 */
export default function HealthCard({ grade, score }: HealthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <div className="mb-4 flex items-center gap-4">
        <HealthRing score={score} grade={toMockGrade(grade)} size={64} stroke={6} showLabel={false} />
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Customer Health</p>
          <p
            className="mt-0.5 font-display text-[20px] font-extrabold"
            style={{ color: GRADE_COLORS[grade ?? ''] ?? '#8A8A8A' }}
          >
            {gradeLabel(grade)}
          </p>
          <p className="text-[11px] text-muted">Large customers · trailing 3 months</p>
        </div>
      </div>

      {/* Exact MoM rule matrix */}
      <div className="flex flex-col gap-2">
        {HealthRules.map((rule, i) => {
          const [ruleGrade, ruleText] = rule.split(' = ');
          const isCurrent = ruleGrade === gradeLabel(grade);
          const color = GRADE_COLORS[ruleGrade.toLowerCase()] ?? '#8A8A8A';
          return (
            <motion.div
              key={rule}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center gap-3 overflow-hidden rounded-[14px] px-3.5 py-2.5"
              style={{
                backgroundColor: isCurrent ? 'rgba(198,255,51,0.08)' : '#1A1A1A',
                boxShadow: isCurrent ? 'inset 0 0 0 1px rgba(198,255,51,0.35), 0 0 18px rgba(198,255,51,0.08)' : 'none',
              }}
            >
              {isCurrent && (
                <motion.span
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ delay: 0.7, duration: 0.4, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-y-0 w-1/2"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(198,255,51,0.12), transparent)' }}
                />
              )}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color, boxShadow: isCurrent ? `0 0 8px ${color}` : 'none' }}
              />
              <p className="text-[13px]">
                <span className="font-semibold" style={{ color }}>{ruleGrade}</span>
                <span className="text-muted"> = </span>
                <span className="text-secondary">{ruleText}</span>
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
                    current
                  </span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      <Link
        to="/settings"
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-semibold text-muted transition-colors hover:text-accent"
      >
        Configured in Settings <ArrowRight size={13} strokeWidth={2} />
      </Link>
    </motion.div>
  );
}
