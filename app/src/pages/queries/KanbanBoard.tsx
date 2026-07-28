import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { CheckCircle2, CircleDot, Loader } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/lib/use-count-up';
import QueryCard from '@/pages/queries/QueryCard';
import { COLUMNS, SPRING } from './shared';
import type { Kanban, KanbanQuery } from './shared';
import type { QueryStatus } from '@contracts/types';

const COLUMN_ICON: Record<QueryStatus, LucideIcon> = {
  open: CircleDot,
  in_progress: Loader,
  resolved: CheckCircle2,
};

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, c) => (
        <div key={c} className="rounded-[28px] bg-surface-2 p-4">
          <div className="shimmer-base mb-4 h-6 w-32 rounded-full" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer-base h-[150px] rounded-[20px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface KanbanBoardProps {
  board: Kanban;
  flashAged: boolean;
  justResolvedId: number | null;
  onOpen: (q: KanbanQuery) => void;
  onMove: (q: KanbanQuery, status: QueryStatus) => void;
  onFilterCustomer: (customerId: string) => void;
  agedIds: Set<number>;
}

/** B. Kanban board — 3 columns, drag between columns + button moves. */
export default function KanbanBoard({
  board,
  flashAged,
  justResolvedId,
  onOpen,
  onMove,
  onFilterCustomer,
  agedIds,
}: KanbanBoardProps) {
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragOver, setDragOver] = useState<QueryStatus | null>(null);

  // Open-count per customer (multi-query signal chip).
  const openCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of [...board.open, ...board.in_progress]) {
      map.set(q.customerId, (map.get(q.customerId) ?? 0) + 1);
    }
    return map;
  }, [board]);

  const hitColumn = (info: PanInfo): QueryStatus | null => {
    for (const { id } of COLUMNS) {
      const el = colRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (info.point.x >= r.left && info.point.x <= r.right && info.point.y >= r.top && info.point.y <= r.bottom) {
        return id;
      }
    }
    return null;
  };

  const trackDrag = (info: PanInfo) => setDragOver(hitColumn(info));

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      {COLUMNS.map(({ id, label, color }, ci) => {
        const cards = board[id];
        const Icon = COLUMN_ICON[id];
        const capHot = id === 'open' && cards.length > 10;
        return (
          <motion.section
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: ci * 0.1, ease: [0.22, 1, 0.36, 1] }}
            ref={(el: HTMLElement | null) => {
              colRefs.current[id] = el as HTMLDivElement | null;
            }}
            className={cn(
              'rounded-[28px] bg-surface-2 p-4 transition-colors',
              dragOver === id && 'bg-[rgba(198,255,51,0.07)]',
            )}
            style={dragOver === id ? { boxShadow: 'inset 0 0 0 2px rgba(198,255,51,0.35)' } : undefined}
          >
            <header className="mb-4 flex items-center gap-2 px-1">
              <Icon size={16} strokeWidth={1.75} style={{ color }} />
              <h3 className="text-[14px] font-semibold text-primary">{label}</h3>
              <ColumnCount value={cards.length} tone={capHot ? '#FF5C5C' : undefined} />
              {capHot && <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-danger">capacity hot</span>}
            </header>

            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
              {cards.map((q) => (
                <QueryCard
                  key={q.id}
                  query={q}
                  openCountForCustomer={openCountByCustomer.get(q.customerId) ?? 0}
                  flash={flashAged && agedIds.has(q.id)}
                  justResolved={justResolvedId === q.id}
                  onOpen={onOpen}
                  onMove={onMove}
                  onFilterCustomer={onFilterCustomer}
                  onDragTrack={trackDrag}
                  onDragEndCard={(query, info) => {
                    setDragOver(null);
                    const target = hitColumn(info);
                    if (target && target !== query.status) onMove(query, target);
                  }}
                />
              ))}
              {cards.length === 0 && id !== 'resolved' && (
                <EmptyState
                  useIllustration
                  title="No open queries — customers are happy."
                  className="py-10"
                />
              )}
              {cards.length === 0 && id === 'resolved' && (
                <p className="rounded-[20px] bg-surface-1 px-4 py-8 text-center text-[12px] text-muted">
                  Resolved queries will land here.
                </p>
              )}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}

function ColumnCount({ value, tone }: { value: number; tone?: string }) {
  const v = useCountUp(value, true);
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      transition={SPRING}
      className="rounded-full bg-surface-3 px-2 py-0.5 font-display text-[12px] font-extrabold tabular"
      style={{ color: tone ?? '#B8B8B8' }}
    >
      {Math.round(v)}
    </motion.span>
  );
}
