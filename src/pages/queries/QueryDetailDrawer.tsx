import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, CheckCircle2, MessageSquare, Paperclip, Send, Sparkles, X,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';
import {
  CATEGORY_STYLE,
  COLUMNS,
  EASE_OUT,
  PRIORITY_DOT,
  QueryCategoryLabels,
  SPRING,
  daysSince,
  fmtDate,
  qRef,
} from './shared';
import type { CustomerQuery, KanbanQuery } from './shared';
import type { QueryStatus } from '@contracts/types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="metadata mb-1">{label}</p>
      <div className="text-[13px] font-medium text-primary">{children}</div>
    </div>
  );
}

/** 3-node status stepper; backward moves ask for a note. */
function StatusStepper({
  status,
  onChange,
}: {
  status: QueryStatus;
  onChange: (next: QueryStatus, note?: string) => void;
}) {
  const idx = COLUMNS.findIndex((c) => c.id === status);
  const [noteFor, setNoteFor] = useState<QueryStatus | null>(null);
  const [note, setNote] = useState('');

  return (
    <div>
      <div className="flex items-center">
        {COLUMNS.map((c, i) => {
          const done = i <= idx;
          return (
            <div key={c.id} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (i === idx) return;
                  if (i < idx) {
                    setNoteFor(c.id);
                    setNote('');
                  } else {
                    onChange(c.id);
                  }
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <motion.span
                  initial={false}
                  animate={{ scale: i === idx ? [1, 1.2, 1] : 1 }}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                    done ? 'bg-accent text-accent-foreground' : 'bg-surface-3 text-muted',
                  )}
                >
                  {i < idx ? <Check size={13} /> : i + 1}
                </motion.span>
                <span className={cn('text-[10px] font-semibold uppercase tracking-[0.06em]', done ? 'text-accent' : 'text-muted')}>
                  {c.label}
                </span>
              </button>
              {i < COLUMNS.length - 1 && (
                <div className="mx-2 mb-5 h-0.5 flex-1 rounded-full bg-surface-3">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: i < idx ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {noteFor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-[16px] bg-surface-1 p-3">
              <p className="mb-2 text-[11px] font-semibold text-muted">
                Moving back to {COLUMNS.find((c) => c.id === noteFor)?.label} — add a note:
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Why is this moving back?"
                className="w-full resize-none rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-primary outline-none placeholder:text-muted"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(noteFor, note || undefined);
                    setNoteFor(null);
                  }}
                  className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-foreground"
                >
                  Confirm move
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFor(null)}
                  className="rounded-full bg-surface-3 px-3.5 py-1.5 text-[12px] font-semibold text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One query node in the customer history timeline (with comments thread). */
export function HistoryNode({
  q,
  isFocus,
  onResolve,
  onAddComment,
  commentPending,
}: {
  q: CustomerQuery;
  isFocus: boolean;
  onResolve: (id: number) => void;
  onAddComment: (queryId: number, body: string) => void;
  commentPending: boolean;
}) {
  const [open, setOpen] = useState(isFocus);
  const [draft, setDraft] = useState('');
  const [flashComment, setFlashComment] = useState(false);
  const cat = CATEGORY_STYLE[q.category];
  const age = daysSince(q.dateRaised);
  const resolvedDays =
    q.resolvedAt && q.dateRaised
      ? Math.max(0, Math.round(((q.resolvedAt instanceof Date ? q.resolvedAt : new Date(q.resolvedAt)).getTime() - (q.dateRaised instanceof Date ? q.dateRaised : new Date(q.dateRaised)).getTime()) / 86_400_000 * 10) / 10)
      : null;

  const submit = () => {
    if (!draft.trim()) return;
    onAddComment(q.id, draft.trim());
    setDraft('');
    setFlashComment(true);
    window.setTimeout(() => setFlashComment(false), 1200);
  };

  return (
    <div className="relative flex gap-3">
      <span
        className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: cat.bg, color: cat.color }}
      >
        <MessageSquare size={14} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 rounded-[16px] bg-surface-2 p-3.5" style={isFocus ? { boxShadow: 'inset 0 0 0 1.5px rgba(198,255,51,0.35)' } : undefined}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-primary">
            {qRef(q.id)} · {QueryCategoryLabels[q.category]}
          </button>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
              q.status === 'resolved' ? 'bg-[rgba(74,222,128,0.12)] text-success' : q.status === 'in_progress' ? 'bg-[rgba(106,184,255,0.12)] text-info' : 'bg-[rgba(255,92,92,0.12)] text-danger',
            )}
          >
            {COLUMNS.find((c) => c.id === q.status)?.label}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-secondary">{q.description}</p>
        <p className="mt-1.5 text-[11px] tabular text-muted">
          Raised {fmtDate(q.dateRaised)} · {age}d old
          {resolvedDays !== null && <span className="text-success"> · resolved in {resolvedDays}d</span>}
        </p>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
                {(q.comments ?? []).map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    <Avatar name={c.author?.name ?? '?'} src={c.author?.avatar ?? undefined} size={24} className="rounded-[8px]" />
                    <div className="min-w-0 flex-1 rounded-[12px] bg-surface-1 px-3 py-2">
                      <p className="text-[11px] font-semibold text-primary">
                        {c.author?.name ?? 'Unknown'} <span className="ml-1 font-normal tabular text-muted">{fmtDate(c.createdAt)}</span>
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-secondary">{c.body}</p>
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.attachments.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-secondary">
                              <Paperclip size={9} /> {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Composer */}
                <motion.div
                  animate={flashComment ? { boxShadow: ['0 0 0 0 rgba(198,255,51,0)', '0 0 16px 2px rgba(198,255,51,0.5)', '0 0 0 0 rgba(198,255,51,0)'] } : {}}
                  transition={{ duration: 1 }}
                  className="flex items-center gap-2 rounded-[16px] bg-surface-1 px-3 py-2"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Add a comment…"
                    className="w-full bg-transparent text-[13px] text-primary outline-none placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={commentPending || !draft.trim()}
                    aria-label="Send comment"
                    className="text-accent transition-transform hover:scale-110 disabled:opacity-40"
                  >
                    <Send size={14} />
                  </button>
                </motion.div>

                {q.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => onResolve(q.id)}
                    className="flex w-fit items-center gap-1.5 rounded-full bg-[rgba(74,222,128,0.12)] px-3 py-1.5 text-[12px] font-semibold text-success transition-transform hover:scale-105"
                  >
                    <CheckCircle2 size={13} /> Resolve this query
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface DrawerProps {
  query: KanbanQuery | null;
  onClose: () => void;
  onStatusChange: (id: number, status: QueryStatus, note?: string) => void;
}

/** Card click → Query Detail Drawer (right slide-over 480px glass). */
export default function QueryDetailDrawer({ query, onClose, onStatusChange }: DrawerProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const bodyRef = useRef<HTMLDivElement>(null);

  const historyQ = trpc.queries.byCustomer.useQuery(
    { customerId: query?.customerId ?? '' },
    { enabled: !!query },
  );

  const addComment = trpc.queries.addComment.useMutation({
    onSuccess: async () => {
      await utils.queries.byCustomer.invalidate({ customerId: query?.customerId ?? '' });
      await utils.queries.kanban.invalidate();
    },
  });

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [query?.id]);

  const cat = query ? CATEGORY_STYLE[query.category] : null;
  const history = useMemo(() => historyQ.data ?? [], [historyQ.data]);
  const raisedByName = history.find((h) => h.id === query?.id)?.raisedBy?.name;

  return (
    <AnimatePresence>
      {query && (
        <motion.div className="fixed inset-0 z-[85]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" style={{ backdropFilter: 'blur(8px)' }} onClick={onClose} />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="glass-strong absolute bottom-3 right-3 top-3 flex w-[480px] max-w-[92vw] flex-col overflow-hidden rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-4">
              <div className="min-w-0">
                <p className="metadata">{qRef(query.id)} · {QueryCategoryLabels[query.category]}</p>
                <h2 className="mt-1 truncate font-display text-[20px] font-bold text-primary">
                  {query.customer?.name ?? query.customerId}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-secondary hover:text-primary">
                <X size={15} />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 pb-6">
              <p className="text-[14px] leading-relaxed text-secondary">{query.description}</p>

              {/* Field grid */}
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-[20px] bg-surface-2 p-4">
                <Field label="Customer">{query.customer?.name ?? query.customerId}</Field>
                <Field label="Category">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: cat?.color, backgroundColor: cat?.bg }}>
                    {QueryCategoryLabels[query.category]}
                  </span>
                </Field>
                <Field label="Date Raised"><span className="tabular">{fmtDate(query.dateRaised)}</span></Field>
                <Field label="Raised By">{raisedByName ?? '—'}</Field>
                <Field label="Status">{COLUMNS.find((c) => c.id === query.status)?.label}</Field>
                <Field label="Priority">
                  <span className="flex items-center gap-1.5 capitalize">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_DOT[query.priority] }} />
                    {query.priority}
                  </span>
                </Field>
                <Field label="Assigned To">
                  {query.assignedTo ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={query.assignedTo.name ?? '?'} src={query.assignedTo.avatar ?? undefined} size={20} className="rounded-[7px]" />
                      {query.assignedTo.name}
                    </span>
                  ) : 'Unassigned'}
                </Field>
                <Field label="Due Date"><span className="tabular">{fmtDate(query.dueDate)}</span></Field>
              </div>

              {/* Status stepper */}
              <div className="mt-5">
                <p className="metadata mb-3">Status</p>
                <StatusStepper status={query.status} onChange={(next, note) => onStatusChange(query.id, next, note)} />
              </div>

              {/* AI suggested solution (expanded) */}
              {query.aiSuggestedSolution && (
                <div className="mt-5 rounded-[20px] bg-accent-dim p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-accent">
                    <Sparkles size={13} /> AI Suggested Solution
                  </p>
                  <p className="text-[13px] leading-relaxed text-secondary">{query.aiSuggestedSolution}</p>
                </div>
              )}

              {/* Per-customer query history timeline */}
              <div className="mt-6">
                <p className="metadata mb-3">
                  Query history · {query.customer?.name ?? ''} <span className="tabular">({history.length})</span>
                </p>
                <div className="relative pl-1">
                  <motion.div
                    className="absolute bottom-4 left-[21px] top-2 w-0.5 origin-top bg-surface-3"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                  />
                  <div className="flex flex-col gap-4">
                    {historyQ.isLoading &&
                      Array.from({ length: 2 }).map((_, i) => <div key={i} className="shimmer-base h-24 rounded-[16px]" />)}
                    {history.map((h, i) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, scale: 0.92, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ ...SPRING, delay: 0.15 + i * 0.08 }}
                      >
                        <HistoryNode
                          q={h}
                          isFocus={h.id === query.id}
                          onResolve={(id) => onStatusChange(id, 'resolved')}
                          onAddComment={(queryId, body) => addComment.mutate({ queryId, body })}
                          commentPending={addComment.isPending}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-muted">Commenting as {user?.name ?? 'you'} · multiple open queries per customer resolve independently.</p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
