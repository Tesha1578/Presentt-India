import { motion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import { useCountUp } from '@/lib/use-count-up';
import { CATEGORY_STYLE, SPRING, QueryCategoryLabels } from './shared';
import type { Reminder } from './shared';
import type { QueryCategory } from '@contracts/types';

function CountChip({ category, count, index }: { category: QueryCategory; count: number; index: number }) {
  const v = useCountUp(count, true);
  const style = CATEGORY_STYLE[category];
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {QueryCategoryLabels[category]}
      <span className="font-display font-extrabold tabular">{Math.round(v)}</span>
    </motion.span>
  );
}

/** A. Summary strip — category distribution + unresolved-reminder banner. */
export default function SummaryStrip({
  distribution,
  reminders,
  onReview,
}: {
  distribution: [QueryCategory, number][];
  reminders: Reminder[];
  onReview: () => void;
}) {
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-[20px] p-3">
      {distribution.map(([cat, count], i) => (
        <CountChip key={cat} category={cat} count={count} index={i} />
      ))}

      {reminders.length > 0 && (
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...SPRING, delay: 0.25 }}
          className="ml-auto flex items-center gap-3 rounded-full bg-[rgba(255,178,36,0.10)] py-1.5 pl-3 pr-1.5"
        >
          <BellRing size={14} className="text-warning" />
          <p className="text-[12px] font-semibold text-warning">
            {reminders.length} {reminders.length === 1 ? 'query' : 'queries'} unresolved &gt; 5 days — reminders active
          </p>
          <button
            type="button"
            onClick={onReview}
            className="rounded-full bg-warning px-3 py-1 text-[11px] font-bold text-canvas transition-transform hover:scale-105"
          >
            Review
          </button>
        </motion.div>
      )}

      <p className="w-full text-[11px] text-muted">
        Unresolved queries re-notify daily until resolved (MoM rule).
      </p>
    </div>
  );
}
