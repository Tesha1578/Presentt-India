import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import { HistoryNode } from '@/pages/queries/QueryDetailDrawer';
import { EASE_OUT, SPRING } from './shared';
import type { CustomerRow } from './shared';
import type { QueryStatus } from '@contracts/types';

/** C. Per-customer Query History mode — full vertical timeline page-within-page. */
export default function CustomerHistory({
  customer,
  onBack,
  onStatusChange,
  onAddComment,
  commentPending,
}: {
  customer: CustomerRow;
  onBack: () => void;
  onStatusChange: (id: number, status: QueryStatus, note?: string) => void;
  onAddComment: (queryId: number, body: string) => void;
  commentPending: boolean;
}) {
  const historyQ = trpc.queries.byCustomer.useQuery({ customerId: customer.id });
  const history = useMemo(() => historyQ.data ?? [], [historyQ.data]);

  const avgResolution = useMemo(() => {
    const resolved = history.filter((h) => h.resolvedAt && h.dateRaised);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((s, h) => {
      const a = h.dateRaised instanceof Date ? h.dateRaised : new Date(h.dateRaised);
      const b = h.resolvedAt instanceof Date ? h.resolvedAt : new Date(h.resolvedAt!);
      return s + (b.getTime() - a.getTime()) / 86_400_000;
    }, 0);
    return Math.round((total / resolved.length) * 10) / 10;
  }, [history]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="card-e1 rounded-[28px] p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft size={13} /> Back to board
        </button>
        <span className="flex items-center gap-2 rounded-full bg-accent-dim px-3.5 py-2 text-[13px] font-semibold text-accent">
          <Building2 size={14} /> {customer.name}
          <span className="text-[11px] font-medium text-muted tabular">GSTIN {customer.gstin}</span>
        </span>
        <span className="text-[12px] tabular text-muted">{history.length} total queries</span>
        {avgResolution !== null && (
          <span className="rounded-full bg-[rgba(74,222,128,0.12)] px-3 py-1 text-[12px] font-semibold tabular text-success">
            avg resolution {avgResolution}d
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative pl-1">
        <motion.div
          className="absolute bottom-4 left-[21px] top-2 w-0.5 origin-top bg-surface-3"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
        <div className="flex flex-col gap-4">
          {historyQ.isLoading &&
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer-base h-28 rounded-[16px]" />)}
          {history.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...SPRING, delay: i * 0.08 }}
            >
              <HistoryNode
                q={h}
                isFocus={false}
                onResolve={(id) => onStatusChange(id, 'resolved')}
                onAddComment={onAddComment}
                commentPending={commentPending}
              />
            </motion.div>
          ))}
          {!historyQ.isLoading && history.length === 0 && (
            <p className="py-10 text-center text-[13px] text-muted">No queries on record for this customer.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
