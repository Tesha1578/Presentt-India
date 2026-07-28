import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Files, History, Mail, MapPin, NotebookPen, ListChecks, Users as UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { LeadStage } from '@contracts/types';
import { LeadStageLabels } from '@contracts/constants';
import { trpc } from '@/lib/trpc-shim';
import { Shimmer } from '@/components/leads/leads-ui';
import Header from '@/pages/leads/profile/Header';
import Details from '@/pages/leads/profile/Details';
import AiSummary from '@/pages/leads/profile/AiSummary';
import { NotesPanel, TasksPanel, TimelinePanel, initialTasks } from '@/pages/leads/profile/TimelinePanels';
import type { Task } from '@/pages/leads/profile/TimelinePanels';
import { EmailsPanel, FilesPanel, MeetingsPanel } from '@/pages/leads/profile/CollabPanels';
import EditLeadModal from '@/components/leads/EditLeadModal';
import { MapsPanel, QuotationsPanel } from '@/pages/leads/profile/GeoQuotePanels';

type TabId = 'timeline' | 'notes' | 'tasks' | 'meetings' | 'files' | 'emails' | 'maps' | 'quotations';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'meetings', label: 'Meetings', icon: UsersIcon },
  { id: 'files', label: 'Files', icon: Files },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'maps', label: 'Maps', icon: MapPin },
  { id: 'quotations', label: 'Quotations', icon: FileText },
];

function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-8 py-8">
      <Shimmer className="h-[220px] rounded-[28px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Shimmer className="h-[300px] rounded-[28px]" />
        <Shimmer className="h-[300px] rounded-[28px]" />
      </div>
      <Shimmer className="h-12 rounded-full" />
      <div className="flex flex-col gap-4">
        <Shimmer className="h-20" />
        <Shimmer className="h-20" />
        <Shimmer className="h-20" />
      </div>
    </div>
  );
}

/** Lead 360° — route `/leads/:id`. */
export default function LeadProfile() {
  const { id } = useParams();
  const leadId = Number(id);
  const navigate = useNavigate();
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const { data: lead, isLoading } = trpc.leads.byId.useQuery(
    { id: leadId },
    { enabled: Number.isFinite(leadId) && leadId > 0 },
  );

  const [tab, setTab] = useState<TabId>('timeline');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (lead) setTasks(initialTasks(lead));
  }, [lead]);

  const invalidate = async () => {
    await Promise.all([
      utils.leads.byId.invalidate({ id: leadId }),
      utils.leads.list.invalidate(),
      utils.leads.stageCounts.invalidate(),
      utils.leads.funnel.invalidate(),
      utils.leads.conversionStats.invalidate(),
    ]);
  };

  const update = trpc.leads.update.useMutation();
  const addActivity = trpc.leads.addActivity.useMutation();

  const stageAdvance = async (stage: LeadStage) => {
    if (!lead) return;
    await update.mutateAsync({ id: lead.id, stage });
    await invalidate();
    if (stage === 'order_confirmed') {
      push({
        type: 'lead-converted',
        title: 'Lead converted',
        body: `${lead.companyName ?? 'Lead'} converted to Order Confirmed`,
      });
    } else {
      push({
        type: 'ai-insight',
        title: 'Stage updated',
        body: `${lead.companyName ?? 'Lead'} → ${LeadStageLabels[stage]} · logged to timeline`,
      });
    }
  };

  const markInvalid = async (reason: string) => {
    if (!lead) return;
    await update.mutateAsync({ id: lead.id, status: 'invalid_customer' });
    await addActivity.mutateAsync({
      leadId: lead.id,
      activity: 'note',
      remarks: `Marked Invalid Customer${reason ? ` — ${reason}` : ''}`,
    });
    await invalidate();
    push({
      type: 'customer-inactive',
      title: 'Marked Invalid Customer',
      body: `${lead.companyName ?? 'Lead'} flagged invalid. Reactivate anytime from the header.`,
    });
  };

  const reactivate = async () => {
    if (!lead) return;
    await update.mutateAsync({ id: lead.id, status: 'active' });
    await addActivity.mutateAsync({ leadId: lead.id, activity: 'note', remarks: 'Lead reactivated' });
    await invalidate();
    push({ type: 'ai-insight', title: 'Lead reactivated', body: 'Pipeline stepper resumed.' });
  };

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);

  if (isLoading || !lead) {
    return (
      <div className="ambient-glow">
        <ProfileSkeleton />
      </div>
    );
  }

  const panel = (() => {
    switch (tab) {
      case 'timeline':
        return <TimelinePanel lead={lead} />;
      case 'notes':
        return <NotesPanel lead={lead} />;
      case 'tasks':
        return <TasksPanel tasks={tasks} setTasks={setTasks} />;
      case 'meetings':
        return (
          <MeetingsPanel
            lead={lead}
            onCreateTasks={(items) =>
              setTasks((cur) => [
                ...items.map((a, i) => ({
                  id: `t-mom-${Date.now()}-${i}`,
                  title: a.text + (a.owner ? ` · ${a.owner}` : ''),
                  due: new Date(Date.now() + 3 * 86400000),
                  done: false,
                })),
                ...cur,
              ])
            }
          />
        );
      case 'files':
        return <FilesPanel lead={lead} />;
      case 'emails':
        return <EmailsPanel lead={lead} />;
      case 'maps':
        return <MapsPanel lead={lead} onRelocated={invalidate} />;
      case 'quotations':
        return <QuotationsPanel lead={lead} />;
    }
  })();

  return (
    <div className="ambient-glow">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-8 py-8">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="flex w-fit items-center gap-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>

        {/* A. Header */}
        <Header
          lead={lead}
          onStageAdvance={stageAdvance}
          onMarkInvalid={markInvalid}
          onReactivate={reactivate}
          onEdit={() => setEditOpen(true)}
        />

        {/* B + C */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Details lead={lead} onSaved={invalidate} />
          <AiSummary lead={lead} onGenerateQuotation={() => setTab('quotations')} />
        </div>

        {/* D. Tab bar */}
        <div className="glass no-scrollbar sticky top-20 z-30 flex items-center gap-1 overflow-x-auto rounded-full p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const count = id === 'tasks' ? openTasks : id === 'quotations' ? lead.quotations.length : undefined;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
                  active ? 'text-accent' : 'text-muted hover:text-secondary',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="lead-tab-indicator"
                    className="absolute inset-0 rounded-full bg-accent-dim"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={13} className="relative" strokeWidth={1.75} />
                <span className="relative">{label}</span>
                {count !== undefined && count > 0 && (
                  <span className="relative rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-secondary tabular">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* E. Active panel */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {panel}
          </motion.div>
        </AnimatePresence>
      </div>

      <EditLeadModal
        lead={lead}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  );
}
