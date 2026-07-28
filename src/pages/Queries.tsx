import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router';
import { MessageSquareWarning, Plus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import FilterPills from '@/components/FilterPills';
import type { FilterDef } from '@/components/FilterPills';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { useAuth } from '@/hooks/useAuth';
import { useCountUp } from '@/lib/use-count-up';
import { LOGIN_PATH } from '@/const';
import { trpc } from '@/lib/trpc-shim';
import { QueryCategories, QueryCategoryLabels, Priorities, PriorityLabels } from '@contracts/constants';
import KanbanBoard, { KanbanSkeleton } from '@/pages/queries/KanbanBoard';
import SummaryStrip from '@/pages/queries/SummaryStrip';
import QueryDetailDrawer from '@/pages/queries/QueryDetailDrawer';
import CustomerHistory from '@/pages/queries/CustomerHistory';
import NewQueryModal from '@/pages/queries/NewQueryModal';
import { qRef, whatsappUrl } from '@/pages/queries/shared';
import type { KanbanQuery } from '@/pages/queries/shared';
import type { QueryStatus } from '@contracts/types';

function MiniKpi({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone?: string }) {
  const v = useCountUp(value, true);
  return (
    <div className="flex flex-col px-5 first:pl-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      <span className="font-display text-[22px] font-extrabold tabular" style={{ color: tone ?? '#F5F5F5' }}>
        {Math.round(v * 10) / 10}
        {suffix && <span className="ml-0.5 text-[14px] text-muted">{suffix}</span>}
      </span>
    </div>
  );
}

/** Customer Query Management — Kanban, route `/queries`. */
export default function Queries() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const enabled = isAuthenticated;
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const kanbanQ = trpc.queries.kanban.useQuery(undefined, { enabled });
  const remindersQ = trpc.queries.unresolvedReminders.useQuery({ minAgeDays: 5 }, { enabled });
  const customersQ = trpc.customers.list.useQuery(undefined, { enabled });

  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [flashAged, setFlashAged] = useState(false);
  const [justResolvedId, setJustResolvedId] = useState<number | null>(null);
  const [drawerQueryId, setDrawerQueryId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [backMove, setBackMove] = useState<{ query: KanbanQuery; target: QueryStatus } | null>(null);
  const [backNote, setBackNote] = useState('');
  const remindedRef = useRef(false);

  const loading = authLoading || (enabled && kanbanQ.isLoading);
  const customers = useMemo<any[]>(() => customersQ.data ?? [], [customersQ.data]);
  const customerById = useMemo(() => new Map<string, any>(customers.map((c) => [c.id, c])), [customers]);
  const reminders = useMemo(() => remindersQ.data ?? [], [remindersQ.data]);
  const agedIds = useMemo(() => new Set<number>(reminders.map((r: any) => r.id)), [reminders]);

  const board = useMemo<any>(
    () => kanbanQ.data ?? { open: [], in_progress: [], resolved: [] },
    [kanbanQ.data],
  );

  // query-reminder toast on entry (notification catalog §11)
  useEffect(() => {
    if (loading || reminders.length === 0 || remindedRef.current) return;
    remindedRef.current = true;
    const top = reminders[0];
    const t = window.setTimeout(() => {
      push({
        type: 'query-reminder',
        title: 'Unresolved query reminder',
        body: `Query ${qRef(top.id)} (${QueryCategoryLabels[top.category]}) unresolved for ${top.unresolvedDays} days`,
        actionLabel: 'Open query',
        onAction: () => setDrawerQueryId(top.id),
      });
    }, 1800);
    return () => window.clearTimeout(t);
  }, [loading, reminders, push]);

  // ------- mutations -------
  const updateStatus = trpc.queries.updateStatus.useMutation({
    onSuccess: async (data, vars) => {
      await utils.queries.invalidate();
      if (vars.status === 'resolved') {
        setJustResolvedId(vars.id);
        window.setTimeout(() => setJustResolvedId(null), 1600);
        push({
          type: 'query-reminder',
          title: 'Query resolved',
          body: `Query ${qRef(vars.id)} resolved — reminders cleared.`,
          actionLabel: 'Notify customer ✨',
          onAction: () => {
            window.open(whatsappUrl(`Good news — your query ${qRef(vars.id)} has been resolved. Thank you for your patience.`), '_blank');
          },
        });
      }
      return data;
    },
  });
  const addComment = trpc.queries.addComment.useMutation({
    onSuccess: () => utils.queries.invalidate(),
  });

  const doMove = (q: KanbanQuery, target: QueryStatus, note?: string) => {
    if (note) addComment.mutate({ queryId: q.id, body: note });
    updateStatus.mutate({ id: q.id, status: target });
  };

  const ORDER: QueryStatus[] = ['open', 'in_progress', 'resolved'];
  const onMove = (q: KanbanQuery, target: QueryStatus) => {
    if (ORDER.indexOf(target) < ORDER.indexOf(q.status)) {
      setBackMove({ query: q, target });
      setBackNote('');
      return;
    }
    doMove(q, target);
  };

  const onStatusChangeById = (id: number, status: QueryStatus, note?: string) => {
    const q = [...board.open, ...board.in_progress, ...board.resolved].find((x) => x.id === id);
    if (!q) return;
    if (note) addComment.mutate({ queryId: id, body: note });
    updateStatus.mutate({ id, status });
  };

  // ------- filters -------
  const assigneeNames = useMemo(() => {
    const set = new Set<string>();
    for (const q of [...board.open, ...board.in_progress, ...board.resolved]) {
      if (q.assignedTo?.name) set.add(q.assignedTo.name);
    }
    return [...set];
  }, [board]);

  const customerOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const q of [...board.open, ...board.in_progress, ...board.resolved]) ids.add(q.customerId);
    return [...ids]
      .map((id) => customerById.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => `${c.name} · ${c.city ?? c.id}`);
  }, [board, customerById]);

  const filterDefs: FilterDef[] = useMemo(
    () => [
      { id: 'category', label: 'Category', options: QueryCategories.map((c) => QueryCategoryLabels[c]) },
      { id: 'priority', label: 'Priority', options: Priorities.map((p) => PriorityLabels[p]) },
      { id: 'assignee', label: 'Assigned To', options: assigneeNames },
      { id: 'customer', label: 'Customer', options: customerOptions },
      { id: 'region', label: 'Region', options: ['West', 'North', 'South', 'East'] },
    ],
    [assigneeNames, customerOptions],
  );

  const matchCard = (q: KanbanQuery): boolean => {
    const cats = filters.category ?? [];
    const pris = filters.priority ?? [];
    const ass = filters.assignee ?? [];
    const regs = filters.region ?? [];
    if (cats.length && !cats.includes(QueryCategoryLabels[q.category])) return false;
    if (pris.length && !pris.includes(PriorityLabels[q.priority])) return false;
    if (ass.length && !ass.includes(q.assignedTo?.name ?? '')) return false;
    if (regs.length) {
      const c = customerById.get(q.customerId);
      if (!regs.includes(c?.region ?? '')) return false;
    }
    return true;
  };

  const filteredBoard = useMemo(
    () => ({
      open: board.open.filter(matchCard),
      in_progress: board.in_progress.filter(matchCard),
      resolved: board.resolved.filter(matchCard),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, filters, customerById],
  );

  // Per-customer history mode when exactly one customer is picked.
  const selectedCustomerLabel = (filters.customer ?? []).length === 1 ? filters.customer[0] : null;
  const historyCustomer = useMemo(() => {
    if (!selectedCustomerLabel) return null;
    return customers.find((c) => `${c.name} · ${c.city ?? c.id}` === selectedCustomerLabel) ?? null;
  }, [selectedCustomerLabel, customers]);

  // ------- KPIs -------
  const all = [...board.open, ...board.in_progress, ...board.resolved];
  const avgResolution = useMemo(() => {
    const resolved = board.resolved.filter((q) => q.resolvedAt && q.dateRaised);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((s, q) => {
      const a = q.dateRaised instanceof Date ? q.dateRaised : new Date(q.dateRaised);
      const b = q.resolvedAt instanceof Date ? q.resolvedAt : new Date(q.resolvedAt!);
      return s + (b.getTime() - a.getTime()) / 86_400_000;
    }, 0);
    return Math.round((total / resolved.length) * 10) / 10;
  }, [board.resolved]);
  const overdueCount = useMemo(
    () =>
      all.filter((q) => {
        if (q.status === 'resolved' || !q.dueDate) return false;
        const d = q.dueDate instanceof Date ? q.dueDate : new Date(q.dueDate);
        return d.getTime() < Date.now();
      }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board],
  );

  const distribution = useMemo(
    () =>
      QueryCategories.map(
        (c) => [c, all.filter((q) => q.category === c).length] as [typeof c, number],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board],
  );

  const drawerQuery = useMemo(
    () => all.find((q) => q.id === drawerQueryId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawerQueryId, board],
  );

  const onReview = () => {
    setFlashAged(true);
    window.setTimeout(() => setFlashAged(false), 2600);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <EmptyState
          icon={MessageSquareWarning}
          title="Sign in to manage queries"
          body="The query Kanban, reminders and history timelines need a signed-in session."
          ctaLabel="Sign in"
          onCta={() => undefined}
        />
        <Link to={LOGIN_PATH} className="sr-only">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="ambient-glow min-h-full">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6 px-8 py-8">
            <div className="shimmer-base h-12 w-[460px] rounded-full" />
            <div className="shimmer-base h-16 rounded-[20px]" />
            <KanbanSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 px-8 py-8"
          >
            {/* KPI strip */}
            <div className="flex flex-wrap items-center divide-x divide-line">
              <MiniKpi label="Open" value={board.open.length} tone="#FF5C5C" />
              <MiniKpi label="In Progress" value={board.in_progress.length} tone="#6AB8FF" />
              <MiniKpi label="Avg Resolution" value={avgResolution} suffix="d" tone="#C6FF33" />
              <MiniKpi label="Overdue" value={overdueCount} tone="#FFB224" />
            </div>

            <FilterPills filters={filterDefs} selected={filters} onChange={setFilters} />

            <SummaryStrip distribution={distribution} reminders={reminders} onReview={onReview} />

            {/* Board ↔ per-customer history cross-fade */}
            <AnimatePresence mode="wait">
              {historyCustomer ? (
                <CustomerHistory
                  key="history"
                  customer={historyCustomer}
                  onBack={() => setFilters((f) => ({ ...f, customer: [] }))}
                  onStatusChange={onStatusChangeById}
                  onAddComment={(queryId, body) => addComment.mutate({ queryId, body })}
                  commentPending={addComment.isPending}
                />
              ) : (
                <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <KanbanBoard
                    board={filteredBoard}
                    flashAged={flashAged}
                    justResolvedId={justResolvedId}
                    onOpen={(q) => setDrawerQueryId(q.id)}
                    onMove={onMove}
                    onFilterCustomer={(customerId) => {
                      const c = customerById.get(customerId);
                      if (c) setFilters((f) => ({ ...f, customer: [`${c.name} · ${c.city ?? c.id}`] }));
                    }}
                    agedIds={agedIds}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* + New Query floating lime pill (above Copilot orb) */}
      <motion.button
        type="button"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26, delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setNewOpen(true)}
        className="fixed bottom-24 right-6 z-[75] flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 text-[14px] font-bold text-accent-foreground shadow-accent-glow"
      >
        <Plus size={17} strokeWidth={2.5} /> New Query
      </motion.button>

      <QueryDetailDrawer
        query={drawerQuery}
        onClose={() => setDrawerQueryId(null)}
        onStatusChange={onStatusChangeById}
      />

      <NewQueryModal open={newOpen} onClose={() => setNewOpen(false)} customers={customers} />

      {/* Backward-move note prompt */}
      <GlassModal open={!!backMove} onClose={() => setBackMove(null)} title="Move back with a note" maxWidth={480}>
        <p className="mb-3 text-[13px] leading-relaxed text-secondary">
          Moving {backMove ? qRef(backMove.query.id) : ''} back to{' '}
          <span className="font-semibold text-primary">{backMove?.target.replace('_', ' ')}</span>. A short note keeps the
          history honest.
        </p>
        <textarea
          value={backNote}
          onChange={(e) => setBackNote(e.target.value)}
          rows={3}
          placeholder="Why is this moving back?"
          className="w-full resize-none rounded-[16px] bg-surface-2 px-4 py-3 text-[14px] text-primary outline-none placeholder:text-muted"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
        />
        <button
          type="button"
          onClick={() => {
            if (backMove) doMove(backMove.query, backMove.target, backNote || undefined);
            setBackMove(null);
          }}
          className="mt-4 w-full rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          Confirm move
        </button>
      </GlassModal>
    </div>
  );
}
