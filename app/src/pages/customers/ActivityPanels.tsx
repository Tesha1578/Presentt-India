import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarPlus, ChevronDown, FileText, Image, IndianRupee, MapPin,
  MessageSquareWarning, Mic, Play, Sparkles, Square,
} from 'lucide-react';
import { Link } from 'react-router';
import Avatar from '@/components/Avatar';
import GlassModal from '@/components/GlassModal';
import { useCopilot } from '@/components/Copilot';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import {
  daysSince,
  fmtDate,
  formatINR,
  relDays,
  type CustomerDetail,
} from '@/components/customers/utils';

const QUERY_CATEGORY_LABELS: Record<string, string> = {
  quality: 'Quality',
  delivery: 'Delivery',
  price: 'Price',
  communication: 'Communication',
  others: 'Others',
};

const QUERY_STATUS_COLORS: Record<string, string> = {
  open: '#FFB224',
  in_progress: '#6AB8FF',
  resolved: '#4ADE80',
};

// ---------------------------------------------------------------------------
// H. Visit History
// ---------------------------------------------------------------------------

/** Voice-note chip — waveform bars animate (randomized heights loop) while playing. */
function VoiceNoteChip({ index }: { index: number }) {
  const [playing, setPlaying] = useState(false);
  const bars = useMemo(
    () => Array.from({ length: 12 }, (_, i) => 4 + ((i * 37 + index * 13) % 12)),
    [index],
  );

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), 3200);
    return () => window.clearTimeout(t);
  }, [playing]);

  return (
    <button
      type="button"
      onClick={() => setPlaying((p) => !p)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
        playing ? 'bg-accent-dim text-accent' : 'bg-surface-3 text-secondary hover:text-primary',
      )}
      aria-label={playing ? 'Stop voice note' : 'Play voice note'}
    >
      {playing ? <Square size={10} strokeWidth={2} /> : <Play size={10} strokeWidth={2} />}
      <span className="flex h-3.5 items-center gap-[2px]">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-[2px] rounded-full bg-current"
            animate={playing ? { height: [h * 0.35, h, h * 0.5, h * 0.9, h * 0.35] } : { height: h * 0.45 }}
            transition={
              playing
                ? { duration: 0.9, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          />
        ))}
      </span>
      <Mic size={10} strokeWidth={2} />
      voice note
    </button>
  );
}

export function VisitHistory({ customer }: { customer: CustomerDetail }) {
  const { push } = useToasts();
  const lastVisitDays = daysSince(customer.lastVisitAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[16px] font-semibold text-primary">Visit History</p>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-muted tabular">
            Last visit {relDays(lastVisitDays)} · cadence target 45d
          </p>
          <button
            type="button"
            onClick={() =>
              push({
                type: 'visit-overdue',
                title: 'Log a visit',
                body: `Log field visits for ${customer.name} from the Visits module.`,
                actionLabel: 'Open Visits',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-secondary transition-colors hover:text-accent"
          >
            <CalendarPlus size={12} strokeWidth={1.75} /> Log Visit
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {customer.visits.length === 0 && (
          <p className="py-6 text-[13px] text-muted">No visits logged yet.</p>
        )}
        {customer.visits.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i, 6) * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="w-[280px] shrink-0 rounded-[20px] bg-surface-2 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-[12px] bg-surface-3 px-3 py-1.5 text-center">
                <p className="font-display text-[16px] font-extrabold leading-none text-primary tabular">
                  {fmtDate(v.date).split(' ')[0]}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {fmtDate(v.date).split(' ').slice(1).join(' ')}
                </p>
              </div>
              {v.salesRep && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary">
                  <Avatar name={v.salesRep.name ?? 'Rep'} src={v.salesRep.avatar ?? undefined} size={22} className="rounded-[7px]" />
                  {v.salesRep.name?.split(' ')[0]}
                </span>
              )}
            </div>

            <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-secondary">
              {v.remarks ?? 'Field visit — no remarks recorded.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(v.photos ?? []).length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
                  <Image size={10} strokeWidth={2} /> ×{(v.photos ?? []).length}
                </span>
              )}
              {(v.voiceNotes ?? []).map((_, vi) => (
                <VoiceNoteChip key={vi} index={vi + v.id} />
              ))}
              {v.outcome && (
                <span className="inline-flex items-center rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {v.outcome}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// I. Open Queries
// ---------------------------------------------------------------------------

export function OpenQueries({ customer }: { customer: CustomerDetail }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const open = customer.openQueries;
  const resolved = customer.queries.filter((q) => q.status === 'resolved');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[16px] font-semibold text-primary">Open Queries</p>
        <Link
          to="/queries"
          className="text-[12px] font-semibold text-accent transition-opacity hover:opacity-80"
        >
          Open board →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {open.length === 0 && (
          <p className="rounded-[16px] bg-surface-2 px-4 py-5 text-center text-[13px] text-muted">
            No open queries — all resolved.
          </p>
        )}
        {open.map((q, i) => {
          const age = daysSince(q.dateRaised) ?? 0;
          const ageColor = age > 7 ? '#FF5C5C' : age > 3 ? '#FFB224' : '#8A8A8A';
          const expanded = expandedId === q.id;
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[16px] bg-surface-2 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                  {QUERY_CATEGORY_LABELS[q.category] ?? q.category}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: `${QUERY_STATUS_COLORS[q.status]}1F`,
                    color: QUERY_STATUS_COLORS[q.status],
                  }}
                >
                  {q.status === 'in_progress' ? 'In Progress' : 'Open'}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold tabular"
                  style={{ backgroundColor: `${ageColor}1F`, color: ageColor }}
                >
                  {age} day{age === 1 ? '' : 's'} open
                </span>
                <span className="ml-auto text-[11px] text-muted tabular">raised {fmtDate(q.dateRaised)}</span>
              </div>

              <p className="mt-2.5 text-[13px] leading-relaxed text-secondary">{q.description}</p>

              {q.aiSuggestedSolution && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : q.id)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent"
                  >
                    <Sparkles size={12} strokeWidth={1.75} />
                    AI Suggested Solution
                    <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={12} strokeWidth={2} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 rounded-[12px] bg-accent-dim p-3 text-[12px] leading-relaxed text-secondary">
                          {q.aiSuggestedSolution}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {resolved.length > 0 && (
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="mt-4 self-start text-[12px] font-semibold text-muted transition-colors hover:text-accent"
        >
          {resolved.length} resolved quer{resolved.length === 1 ? 'y' : 'ies'} — view history →
        </button>
      )}

      <GlassModal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Query History" maxWidth={560}>
        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {resolved.map((q) => (
            <div key={q.id} className="rounded-[16px] bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                  {QUERY_CATEGORY_LABELS[q.category] ?? q.category}
                </span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}
                >
                  Resolved
                </span>
                <span className="ml-auto text-[11px] text-muted tabular">
                  {fmtDate(q.dateRaised)} → {fmtDate(q.resolvedAt)}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-secondary">{q.description}</p>
              {(q.comments ?? []).length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                  {q.comments.map((cm) => (
                    <p key={cm.id} className="text-[12px] text-muted">
                      <span className="text-secondary">{cm.body}</span> · {fmtDate(cm.createdAt)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassModal>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// J. Communication Log — unified interaction feed (meetings, visits,
// payments, query events) with filter pills.
// ---------------------------------------------------------------------------

type FeedKind = 'meeting' | 'visit' | 'payment' | 'query';

const FEED_PILLS: { key: FeedKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'meeting', label: 'Meetings' },
  { key: 'visit', label: 'Visits' },
  { key: 'payment', label: 'Payments' },
  { key: 'query', label: 'Queries' },
];

interface FeedItem {
  id: string;
  kind: FeedKind;
  date: Date;
  title: string;
  body: string;
}

const KIND_STYLE: Record<FeedKind, { icon: typeof MapPin; color: string; label: string }> = {
  meeting: { icon: FileText, color: '#C6FF33', label: 'Meeting' },
  visit: { icon: MapPin, color: '#6AB8FF', label: 'Visit' },
  payment: { icon: IndianRupee, color: '#4ADE80', label: 'Payment' },
  query: { icon: MessageSquareWarning, color: '#FFB224', label: 'Query' },
};

export function CommunicationLog({ customer }: { customer: CustomerDetail }) {
  const [filter, setFilter] = useState<FeedKind | 'all'>('all');
  const { openWith } = useCopilot();

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const m of customer.meetings) {
      items.push({
        id: `m-${m.id}`,
        kind: 'meeting',
        date: new Date(m.date),
        title: m.aiSummary ? 'Meeting · AI minutes' : 'Meeting',
        body: m.aiSummary ?? m.rawNotes ?? 'Meeting logged.',
      });
    }
    for (const v of customer.visits) {
      items.push({
        id: `v-${v.id}`,
        kind: 'visit',
        date: new Date(v.date),
        title: `Field visit${v.salesRep?.name ? ` · ${v.salesRep.name}` : ''}`,
        body: v.remarks ?? 'Visit completed.',
      });
    }
    for (const p of customer.payments) {
      items.push({
        id: `p-${p.id}`,
        kind: 'payment',
        date: new Date(p.date),
        title: `${formatINR(p.amount)} received`,
        body: `${(p.mode ?? 'neft').toUpperCase()} · ${(p.delayDays ?? 0) > 0 ? `+${p.delayDays} days late` : 'on time'}`,
      });
    }
    for (const q of customer.queries) {
      items.push({
        id: `q-${q.id}`,
        kind: 'query',
        date: new Date(q.dateRaised),
        title: `${QUERY_CATEGORY_LABELS[q.category] ?? q.category} query raised`,
        body: q.description,
      });
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 14);
  }, [customer]);

  const visibleFeed = filter === 'all' ? feed : feed.filter((f) => f.kind === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[16px] font-semibold text-primary">Communication</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {FEED_PILLS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilter(p.key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  filter === p.key ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openWith('Email Generator')}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[11px] font-semibold text-accent transition-shadow hover:shadow-accent-glow"
          >
            <Sparkles size={12} strokeWidth={1.75} /> Compose
          </button>
        </div>
      </div>

      <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {visibleFeed.map((f, i) => {
            const style = KIND_STYLE[f.kind];
            const Icon = style.icon;
            return (
              <motion.div
                key={f.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.25 }}
                className="flex items-start gap-3 rounded-[14px] bg-surface-2 p-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: `${style.color}1F`, color: style.color }}
                >
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-primary">{f.title}</p>
                    <span className="shrink-0 text-[11px] text-muted tabular">{fmtDate(f.date)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-secondary">{f.body}</p>
                </div>
                <span className="mt-1 shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {style.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {visibleFeed.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">No interactions in this view.</p>
        )}
      </div>
    </motion.div>
  );
}
