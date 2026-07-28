import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc-shim';
import CountUp from '@/components/analytics/CountUp';
import { EASE, GRADE_COLORS } from '@/components/analytics/utils';
import { HealthRules } from '@contracts/constants';

const GRADE_OF: Record<number, string> = { 0: 'excellent', 1: 'good', 2: 'average', 3: 'poor' };

/** Panel 3 — verbatim MoM health matrix with live counts. */
export default function HealthRulesPanel() {
  const health = trpc.analytics.healthDistribution.useQuery();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="card-e1 rounded-[24px] p-6"
    >
      <h4 className="text-[15px] font-semibold text-primary">Customer Health Rules</h4>
      <p className="mt-1 text-[12px] text-muted">Large customers · trailing 3 months · read-only matrix</p>

      <div className="mt-5 space-y-2.5">
        {HealthRules.map((rule, i) => {
          const grade = GRADE_OF[i];
          const count = health.data?.find((d) => d.grade === grade)?.count;
          return (
            <motion.div
              key={rule}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: EASE }}
              whileHover={{ x: 4 }}
              className="group flex items-center gap-4 rounded-[16px] bg-surface-2 px-5 py-4"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: GRADE_COLORS[grade], boxShadow: `0 0 12px ${GRADE_COLORS[grade]}55` }}
              />
              <p className="flex-1 text-[14px] font-medium text-primary">{rule}</p>
              <span className="shrink-0 rounded-full bg-surface-3 px-3 py-1 text-[12px] font-semibold text-secondary tabular">
                {count === undefined ? (
                  <span className="shimmer-base inline-block h-3 w-8 rounded-full" />
                ) : (
                  <>
                    <CountUp value={count} /> <span className="text-muted">currently</span>
                  </>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-5 rounded-[16px] bg-surface-2 px-4 py-3 text-[12px] leading-relaxed text-muted">
        Health grades are computed nightly from sales + payment history; thresholds for High/Moderate/Low follow the
        classification limits above.
      </p>
    </motion.div>
  );
}
