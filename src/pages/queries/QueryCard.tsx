import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import {
  CATEGORY_STYLE,
  PRIORITY_DOT,
  QueryCategoryLabels,
  SPRING,
  daysSince,
  fmtDate,
  whatsappUrl,
} from './shared';
import type { KanbanQuery } from './shared';
import type { QueryStatus } from '@contracts/types';

/** Slow amber left-edge breathe for cards unresolved > 5 days (isolated loop). */
const ReminderEdge = memo(function ReminderEdge() {
  return (
    <motion.span
      className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-warning"
      animate={{ opacity: [0.25, 0.9, 0.25] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

/** Lime check-draw overlay when a card lands in Resolved. */
function ResolveOverlay({ stamp }: { stamp: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[20px] bg-[rgba(9,9,9,0.55)]"
    >
      <svg width="56" height="56" viewBox="0 0 56 56">
        <motion.circle
          cx="28" cy="28" r="24" fill="none" stroke="#C6FF33" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }}
        />
        <motion.path
          d="M17 29 l8 8 l15 -17" fill="none" stroke="#C6FF33" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.15 }}
        />
      </svg>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent"
      >
        Resolved {stamp}
      </motion.p>
    </motion.div>
  );
}

interface QueryCardProps {
  query: KanbanQuery;
  openCountForCustomer: number;
  flash: boolean;
  justResolved: boolean;
  onOpen: (q: KanbanQuery) => void;
  onMove: (q: KanbanQuery, status: QueryStatus) => void;
  onFilterCustomer: (customerId: string) => void;
  onDragEndCard: (q: KanbanQuery, info: PanInfo) => void;
  onDragTrack?: (info: PanInfo) => void;
}

/** Kanban query card (queries.md §B anatomy). */
export default function QueryCard({
  query: q,
  openCountForCustomer,
  flash,
  justResolved,
  onOpen,
  onMove,
  onFilterCustomer,
  onDragEndCard,
  onDragTrack,
}: QueryCardProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const cat = CATEGORY_STYLE[q.category];
  const age = daysSince(q.dateRaised);
  const aged = q.status !== 'resolved' && age > 5;
  const dueDays = q.dueDate ? daysSince(q.dueDate) : 0;
  const dueOverdue = q.dueDate && q.status !== 'resolved' && (q.dueDate instanceof Date ? q.dueDate : new Date(q.dueDate)).getTime() < Date.now();
  const resolved = q.status === 'resolved';

  return (
    <motion.div
      layoutId={`q-${q.id}`}
      drag
      dragSnapToOrigin
      dragElastic={0.12}
      whileDrag={{ scale: 1.04, rotate: 1.5, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', zIndex: 30 }}
      onDrag={onDragTrack ? (_e, info) => onDragTrack(info) : undefined}
      onDragEnd={(_e, info) => onDragEndCard(q, info)}
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: resolved ? 0.7 : 1,
        y: 0,
        backgroundColor: flash ? ['#1A1A1A', 'rgba(255,178,36,0.22)', '#1A1A1A', 'rgba(255,178,36,0.22)', '#1A1A1A'] : '#111111',
      }}
      transition={flash ? { duration: 1.2 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative cursor-grab rounded-[20px] p-4 shadow-e1 active:cursor-grabbing"
    >
      {aged && <ReminderEdge />}
      {justResolved && <ResolveOverlay stamp={fmtDate(q.resolvedAt)} />}

      {/* Row 1: customer + category + priority */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onOpen(q)} className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-primary hover:text-accent">
          {q.customer?.name ?? q.customerId}
        </button>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
          style={{ color: cat.color, backgroundColor: cat.bg }}
        >
          {QueryCategoryLabels[q.category]}
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT[q.priority] ?? '#8A8A8A' }}
          title={`${q.priority} priority`}
        />
      </div>

      {/* Row 2: description */}
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-secondary">{q.description}</p>

      {/* Row 3: AI suggested solution */}
      {q.aiSuggestedSolution && (
        <div className="mt-2.5 overflow-hidden rounded-[14px] bg-accent-dim">
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            <Sparkles size={12} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-accent">
              {q.aiSuggestedSolution}
            </span>
            <ChevronDown size={13} className={cn('shrink-0 text-accent transition-transform', aiOpen && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {aiOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3">
                  <p className="text-[12px] leading-relaxed text-secondary">{q.aiSuggestedSolution}</p>
                  <a
                    href={whatsappUrl(`Update on your query: ${q.aiSuggestedSolution}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-full bg-[rgba(198,255,51,0.18)] px-2.5 py-1 text-[11px] font-semibold text-accent"
                  >
                    Apply as reply draft
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Row 4: metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
        {q.assignedTo && (
          <span className="flex items-center gap-1.5" title={`Assigned to ${q.assignedTo.name ?? ''}`}>
            <Avatar name={q.assignedTo.name ?? '?'} src={q.assignedTo.avatar ?? undefined} size={18} className="rounded-[6px]" />
            <span className="font-medium text-secondary">{q.assignedTo.name?.split(' ')[0]}</span>
          </span>
        )}
        <span className="tabular">Raised {fmtDate(q.dateRaised)}</span>
        {q.dueDate && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-bold tabular',
              dueOverdue ? 'bg-[rgba(255,92,92,0.12)] text-danger' : 'bg-surface-3 text-secondary',
            )}
          >
            {dueOverdue ? `OVERDUE ${Math.max(1, dueDays)}d` : `Due ${fmtDate(q.dueDate)}`}
          </span>
        )}
        <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold tabular text-secondary">
          {resolved ? `Resolved ${fmtDate(q.resolvedAt)}` : q.status === 'open' ? `Open ${age}d` : `In progress ${age}d`}
        </span>
      </div>

      {/* Multi-query signal + move buttons */}
      <div className="mt-3 flex items-center justify-between">
        {openCountForCustomer > 1 ? (
          <button
            type="button"
            onClick={() => onFilterCustomer(q.customerId)}
            className="rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-semibold text-info transition-colors hover:bg-accent-dim hover:text-accent"
          >
            1 of {openCountForCustomer} open for this customer
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-1">
          {q.status !== 'open' && (
            <button
              type="button"
              title={q.status === 'resolved' ? 'Move back to In Progress' : 'Move back to Open'}
              onClick={() => onMove(q, q.status === 'resolved' ? 'in_progress' : 'open')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-muted transition-colors hover:text-primary"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          {q.status !== 'resolved' && (
            <button
              type="button"
              title={q.status === 'open' ? 'Move to In Progress' : 'Resolve'}
              onClick={() => onMove(q, q.status === 'open' ? 'in_progress' : 'resolved')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-accent transition-colors hover:bg-accent-dim"
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
