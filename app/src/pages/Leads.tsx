import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, LayoutGrid, Plus, Search, Trello, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import FilterPills from '@/components/FilterPills';
import type { FilterDef } from '@/components/FilterPills';
import { cn } from '@/lib/utils';
import type { Lead } from '@contracts/types';
import { LeadStageLabels, PriorityLabels } from '@contracts/constants';
import { trpc } from '@/lib/trpc-shim';
import {
  LeadStatusLabels,
  LeadStageLabels as StageLabels,
  REGION_OPTIONS,
  STAGE_ORDER,
} from '@/components/leads/leads-ui';
import Widgets from '@/pages/leads/Widgets';
import LeadCard from '@/pages/leads/LeadCard';
import PipelineBoard from '@/pages/leads/PipelineBoard';
import CreateLeadModal from '@/pages/leads/CreateLeadModal';

const PAGE_SIZE = 12;

const FILTERS: FilterDef[] = [
  { id: 'region', label: 'Region', options: [...REGION_OPTIONS] },
  {
    id: 'stage',
    label: 'Lead Stage',
    options: STAGE_ORDER.map((s) => LeadStageLabels[s]),
  },
  { id: 'status', label: 'Lead Status', options: [LeadStatusLabels.active, LeadStatusLabels.invalid_customer] },
  { id: 'priority', label: 'Priority', options: Object.values(PriorityLabels) },
];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card-e1 rounded-[24px] p-5">
          <div className="flex items-center gap-3.5">
            <div className="shimmer-base h-12 w-12 rounded-[14px]" />
            <div className="flex-1">
              <div className="shimmer-base h-3.5 w-3/4 rounded-full" />
              <div className="shimmer-base mt-2 h-3 w-1/2 rounded-full" />
            </div>
          </div>
          <div className="shimmer-base mt-4 h-6 w-40 rounded-full" />
          <div className="shimmer-base mt-3 h-3 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Lead Management — route `/leads`. */
export default function Leads() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'cards' | 'pipeline'>('cards');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: leads, isLoading } = trpc.leads.list.useQuery();

  // ⌘K palette quick action: /leads?new=1 opens the create modal.
  useEffect(() => {
    if (params.get('new') === '1' || params.get('quotation') === '1') {
      setCreateOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtersActive = useMemo(
    () => Object.values(selected).some((v) => v.length > 0),
    [selected],
  );

  const filtered = useMemo(() => {
    const all = leads ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((l) => {
      if (q) {
        const hay = `${l.companyName ?? ''} ${l.contactPerson ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const regions = selected.region ?? [];
      if (regions.length && !regions.includes(l.region ?? '')) return false;
      const stages = selected.stage ?? [];
      if (stages.length && !stages.includes(StageLabels[(l.stage ?? 'new_lead') as keyof typeof StageLabels]))
        return false;
      const statuses = selected.status ?? [];
      if (statuses.length) {
        const label = l.status === 'invalid_customer' ? 'Invalid Customer' : 'Active';
        if (!statuses.includes(label)) return false;
      }
      const priorities = selected.priority ?? [];
      if (priorities.length) {
        const label = PriorityLabels[(l.priority ?? 'medium') as keyof typeof PriorityLabels];
        if (!priorities.includes(label)) return false;
      }
      return true;
    });
  }, [leads, query, selected]);

  // Reset pagination when filters change
  useEffect(() => setVisible(PAGE_SIZE), [query, selected, view]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Company', 'Contact', 'Phone', 'Email', 'Stage', 'Status', 'Priority', 'Region', 'City', 'Source'],
      ...filtered.map((l: Lead) => [
        l.companyName ?? '',
        l.contactPerson ?? '',
        l.phone ?? '',
        l.email ?? '',
        l.stage ? StageLabels[l.stage] : '',
        l.status === 'invalid_customer' ? 'Invalid Customer' : 'Active',
        l.priority ?? '',
        l.region ?? '',
        l.city ?? '',
        l.source ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salesos-leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setSelected({});
    setQuery('');
  };

  return (
    <div className="ambient-glow flex flex-col gap-6 px-8 py-8">
      {/* Filter row + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterPills filters={FILTERS} selected={selected} onChange={setSelected} className="flex-1" />
        <motion.button
          type="button"
          onClick={exportCsv}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[13px] font-semibold text-secondary transition-colors hover:text-primary"
        >
          <Download size={14} strokeWidth={1.75} /> Export
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setCreateOpen(true)}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.3, delay: 0.24 }}
          className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          <Plus size={15} strokeWidth={2} /> New Lead
        </motion.button>
      </div>

      {/* A. Widget row */}
      <Widgets />

      {/* B. Search + view toggle + result count */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-[420px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or contact person…"
            className="h-11 w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-surface-2 pl-11 pr-10 text-[14px] text-primary placeholder:text-muted outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_2px_rgba(198,255,51,0.28)]"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Segmented view toggle */}
        <div className="glass flex rounded-full p-1">
          {(
            [
              { id: 'cards', label: 'Cards', icon: LayoutGrid },
              { id: 'pipeline', label: 'Pipeline', icon: Trello },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
                view === id ? 'text-accent' : 'text-muted hover:text-secondary',
              )}
            >
              {view === id && (
                <motion.span
                  layoutId="leads-view-toggle"
                  className="absolute inset-0 rounded-full bg-accent-dim"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <Icon size={14} className="relative" strokeWidth={1.75} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        {/* Result count */}
        <AnimatePresence>
          {(filtersActive || query) && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="ml-auto flex items-center gap-3"
            >
              <p className="metadata">
                {leads?.length ?? 0} leads · filtered to {filtered.length}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] font-semibold text-accent hover:underline"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* C. Content */}
      {isLoading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          useIllustration
          title="No leads match"
          body="Widen filters or create one — a lead can start from a single field."
          ctaLabel="+ New Lead"
          onCta={() => setCreateOpen(true)}
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {view === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {filtered.slice(0, visible).map((l, i) => (
                    <LeadCard key={l.id} lead={l} query={query} delay={Math.min(i, 12) * 0.05} />
                  ))}
                </AnimatePresence>
              </div>
              {visible < filtered.length && (
                <div className="mt-8 flex justify-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-full bg-surface-2 px-6 py-3 text-[13px] font-semibold text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
                  >
                    Load more · {filtered.length - visible} remaining
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PipelineBoard leads={filtered} onChanged={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
