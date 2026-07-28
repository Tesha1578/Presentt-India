import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hhmm, useDashboardHome } from '@/pages/home/use-dashboard';
import type { DashboardHome } from '@/pages/home/use-dashboard';
import type { Priority, Task } from '@/lib/mock-data';

const PRIORITY_DOT: Record<string, string> = {
  High: '#FF5C5C',
  Medium: '#FFB224',
  Low: '#8A8A8A',
};

const PRIORITY_MAP: Record<string, Priority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

type Tab = 'today' | 'overdue' | 'done';

type ApiTask = DashboardHome['tasks'][number];

function formatDue(due: string, overdue: boolean): string {
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return due; // "—" / "never"
  if (overdue) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return hhmm(d);
}

function toUiTask(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    entityName: t.entityName,
    entityHref: t.entityHref,
    dueTime: formatDue(t.due, t.overdue),
    priority: PRIORITY_MAP[t.priority] ?? 'Medium',
    done: false,
    overdue: t.overdue,
  };
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: task.done ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-[20px] bg-surface-2 p-3.5',
        task.overdue && !task.done && 'before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-danger before:opacity-70 before:animate-pulse-dot',
      )}
    >
      <button
        type="button"
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        onClick={() => onToggle(task.id)}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.done ? 'border-accent bg-accent text-accent-foreground' : 'border-line hover:border-accent',
        )}
      >
        {task.done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
            <Check size={13} strokeWidth={3} />
          </motion.span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] font-medium text-primary transition-all', task.done && 'line-through')}>
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
          <Link to={task.entityHref} onClick={(e) => e.stopPropagation()} className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-secondary hover:text-accent">
            {task.entityName}
          </Link>
          <span className={cn('tabular', task.overdue && !task.done && 'text-danger')}>{task.dueTime}</span>
        </div>
      </div>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_DOT[task.priority] }} />
    </motion.div>
  );
}

/** Today's Tasks — derived live from overdue invoices, open queries, overdue visits, pending quotations. */
export default function Tasks() {
  const { data } = useDashboardHome();
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('salesos.tasks.done') ?? '{}');
    } catch {
      return {};
    }
  });
  const [tab, setTab] = useState<Tab>('today');

  const tasks = (data?.tasks ?? []).map((t) => {
    const ui = toUiTask(t);
    return { ...ui, done: doneIds[ui.id] ?? false };
  });

  const toggle = (id: string) =>
    setDoneIds((cur) => {
      const next = { ...cur, [id]: !cur[id] };
      try {
        localStorage.setItem('salesos.tasks.done', JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const overdueCount = tasks.filter((t) => t.overdue && !t.done).length;
  const visible =
    tab === 'today'
      ? tasks.filter((t) => !t.done && !t.overdue)
      : tab === 'overdue'
        ? tasks.filter((t) => t.overdue && !t.done)
        : tasks.filter((t) => t.done);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'today', label: 'Today' },
    { id: 'overdue', label: 'Overdue', badge: overdueCount },
    { id: 'done', label: 'Done' },
  ];

  return (
    <section className="card-e1 rounded-[28px] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-[18px] font-bold text-primary">Today's Tasks</h3>
          <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] font-bold text-secondary tabular">
            {tasks.filter((t) => !t.done).length}
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full bg-surface-3 px-3 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <Plus size={13} /> New
        </button>
      </div>

      <div className="mb-4 flex gap-4 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative pb-2.5 text-[13px] font-semibold transition-colors',
              tab === t.id ? 'text-primary' : 'text-muted hover:text-secondary',
            )}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1.5 rounded-full bg-[rgba(255,92,92,0.15)] px-1.5 py-0.5 text-[10px] font-bold text-danger tabular">
                {t.badge}
              </span>
            )}
            {tab === t.id && (
              <motion.span layoutId="tasks-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={toggle} />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            All clear. The AI will ping you when something needs you.
          </p>
        )}
      </div>
    </section>
  );
}
