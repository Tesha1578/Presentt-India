import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock, Check, FileText, GitBranch, Lock, Mail, MapPin, Phone, Plus, StickyNote, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AnimatedTimeline from '@/components/AnimatedTimeline';
import type { TimelineEntry } from '@/components/AnimatedTimeline';
import Avatar from '@/components/Avatar';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { LeadActivityKind } from '@contracts/types';
import { trpc } from '@/lib/trpc-shim';
import {
  GhostButton,
  LimeButton,
  formatDate,
  inputCls,
  timeAgo,
} from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';

const KIND_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  call: { icon: Phone, color: '#6AB8FF', label: 'Call' },
  email: { icon: Mail, color: '#C6FF33', label: 'Email' },
  visit: { icon: MapPin, color: '#FFB224', label: 'Visit' },
  note: { icon: StickyNote, color: '#B8B8B8', label: 'Note' },
  'stage-change': { icon: GitBranch, color: '#4ADE80', label: 'Stage change' },
  quotation: { icon: FileText, color: '#C6FF33', label: 'Quotation' },
};

const COMPOSER_KINDS: LeadActivityKind[] = ['call', 'email', 'visit', 'note'];

/* ---------------------------------------------------------------- E1 Timeline */

export function TimelinePanel({ lead }: { lead: LeadDetail }) {
  const [kind, setKind] = useState<LeadActivityKind>('call');
  const [remarks, setRemarks] = useState('');
  const [flashId, setFlashId] = useState<number | null>(null);
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const addActivity = trpc.leads.addActivity.useMutation({
    onSuccess: async (a) => {
      await utils.leads.byId.invalidate({ id: lead.id });
      setFlashId(a!.id);
      window.setTimeout(() => setFlashId(null), 1200);
      push({ type: 'ai-insight', title: 'Activity logged', body: `${KIND_META[a!.activity].label} added to the timeline.` });
    },
  });

  const entries: TimelineEntry[] = lead.activities.map((a) => {
    const meta = KIND_META[a.activity] ?? KIND_META.note;
    return {
      id: String(a.id),
      icon: meta.icon,
      iconColor: meta.color,
      title: a.activity === 'stage-change' ? a.remarks ?? 'Stage changed' : meta.label,
      body: a.activity === 'stage-change' ? undefined : a.remarks ?? undefined,
      date: timeAgo(a.date),
      activity: meta.label,
      remarks: a.activity === 'stage-change' ? undefined : undefined,
      updatedBy: a.updatedBy?.name ?? 'Unknown',
    };
  });

  const log = async () => {
    if (!remarks.trim()) return;
    await addActivity.mutateAsync({ leadId: lead.id, activity: kind, remarks: remarks.trim() });
    setRemarks('');
  };

  return (
    <div>
      {/* Composer */}
      <div className="mb-6 rounded-[20px] bg-surface-2 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {COMPOSER_KINDS.map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.icon;
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all',
                  active ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-3 text-muted hover:text-secondary',
                )}
              >
                <Icon size={13} /> {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2.5">
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && log()}
            placeholder="Log an activity…"
            className={cn(inputCls, 'rounded-[20px]')}
          />
          <LimeButton onClick={log} disabled={!remarks.trim() || addActivity.isPending}>
            Log
          </LimeButton>
        </div>
      </div>

      {/* New-entry lime flash */}
      <AnimatePresence>
        {flashId !== null && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none mb-3 rounded-[20px] bg-accent-dim px-4 py-2 text-[12px] font-semibold text-accent"
          >
            New activity added
          </motion.div>
        )}
      </AnimatePresence>

      {entries.length > 0 ? (
        <AnimatedTimeline entries={entries} />
      ) : (
        <p className="py-10 text-center text-[13px] text-muted">No activity yet — log the first touch above.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- E2 Notes */

interface Note {
  id: string;
  author: string;
  avatar?: string;
  body: string;
  at: Date;
}

export function NotesPanel({ lead }: { lead: LeadDetail }) {
  const [notes, setNotes] = useState<Note[]>(() =>
    lead.activities
      .filter((a) => a.activity === 'note')
      .map((a) => ({
        id: `n-${a.id}`,
        author: a.updatedBy?.name ?? 'Unknown',
        avatar: a.updatedBy?.avatar ?? undefined,
        body: a.remarks ?? '',
        at: new Date(a.date),
      })),
  );
  const [draft, setDraft] = useState('');
  const addActivity = trpc.leads.addActivity.useMutation();

  const add = () => {
    const body = draft.trim();
    if (!body) return;
    // Persist as a lead activity of kind "note" (survives reloads)
    addActivity.mutate({ leadId: lead.id, activity: 'note', remarks: body });
    setNotes((cur) => [
      { id: `n-new-${Date.now()}`, author: 'You', body, at: new Date() },
      ...cur,
    ]);
    setDraft('');
  };

  return (
    <div>
      <p className="metadata mb-4 flex items-center gap-1.5">
        <Lock size={12} /> Internal notes · Private to your team
      </p>
      <div className="mb-5 flex items-center gap-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add an internal note…"
          className={cn(inputCls, 'rounded-[20px]')}
        />
        <LimeButton onClick={add} disabled={!draft.trim()}>
          Add
        </LimeButton>
      </div>
      <div className="columns-1 gap-4 md:columns-2">
        <AnimatePresence>
          {notes.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="group mb-4 break-inside-avoid rounded-[20px] bg-surface-2 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar name={n.author} src={n.avatar} size={24} className="rounded-[8px]" />
                  <span className="text-[12px] font-semibold text-secondary">{n.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted tabular">{timeAgo(n.at)}</span>
                  <button
                    type="button"
                    aria-label="Delete note"
                    onClick={() => setNotes((cur) => cur.filter((x) => x.id !== n.id))}
                    className="text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-secondary">{n.body}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {notes.length === 0 && (
        <p className="py-10 text-center text-[13px] text-muted">No internal notes yet.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- E3 Tasks */

export interface Task {
  id: string;
  title: string;
  due?: Date;
  done: boolean;
}

export function initialTasks(lead: LeadDetail): Task[] {
  return lead.meetings
    .flatMap((m) => m.actionItems ?? [])
    .map((a, i) => ({
      id: `t-${i}`,
      title: a.text + (a.owner ? ` · ${a.owner}` : ''),
      due: a.dueDate ? new Date(a.dueDate) : undefined,
      done: false,
    }));
}

export function TasksPanel({
  tasks,
  setTasks,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const [draft, setDraft] = useState('');
  const [dueDays, setDueDays] = useState('3');

  const add = () => {
    if (!draft.trim()) return;
    const due = new Date(Date.now() + Number(dueDays || 0) * 86400000);
    setTasks((cur) => [{ id: `t-new-${Date.now()}`, title: draft.trim(), due, done: false }, ...cur]);
    setDraft('');
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New task…"
          className={cn(inputCls, 'max-w-sm rounded-[20px]')}
        />
        <select
          value={dueDays}
          onChange={(e) => setDueDays(e.target.value)}
          className="rounded-full border border-[rgba(255,255,255,0.08)] bg-surface-2 px-3.5 py-2.5 text-[12px] font-semibold text-secondary outline-none"
        >
          <option value="1">Due tomorrow</option>
          <option value="3">Due in 3d</option>
          <option value="7">Due in 7d</option>
          <option value="14">Due in 14d</option>
        </select>
        <LimeButton onClick={add} disabled={!draft.trim()}>
          <Plus size={14} /> New task
        </LimeButton>
      </div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence>
          {tasks.map((t) => {
            const overdue = !t.done && t.due && t.due.getTime() < Date.now();
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'flex items-center gap-3 rounded-[20px] bg-surface-2 px-4 py-3.5',
                  overdue && 'shadow-[inset_3px_0_0_0_rgba(255,92,92,0.7)]',
                )}
              >
                <button
                  type="button"
                  aria-label={t.done ? 'Mark open' : 'Mark done'}
                  onClick={() => setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    t.done ? 'border-accent bg-accent text-accent-foreground' : 'border-surface-3 text-transparent hover:border-accent/60',
                  )}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <span className={cn('flex-1 text-[14px]', t.done ? 'text-muted line-through' : 'text-secondary')}>
                  {t.title}
                </span>
                {t.due && (
                  <motion.span
                    animate={overdue ? { opacity: [1, 0.5, 1] } : {}}
                    transition={overdue ? { duration: 1.6, repeat: Infinity } : {}}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular',
                      overdue ? 'bg-[rgba(255,92,92,0.12)] text-danger' : 'bg-surface-3 text-muted',
                    )}
                  >
                    <CalendarClock size={11} />
                    {overdue ? 'Overdue · ' : ''}
                    {formatDate(t.due)}
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {tasks.length === 0 && (
          <p className="py-10 text-center text-[13px] text-muted">No open tasks for this lead.</p>
        )}
      </div>
    </div>
  );
}

export function PanelEmpty({ text, cta, onCta }: { text: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <p className="text-[13px] text-muted">{text}</p>
      {cta && (
        <GhostButton onClick={onCta} className="mt-4">
          {cta}
        </GhostButton>
      )}
    </div>
  );
}
