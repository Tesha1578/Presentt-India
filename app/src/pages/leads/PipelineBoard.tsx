import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, ChevronDown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { Lead, LeadStage } from '@contracts/types';
import { trpc } from '@/lib/trpc-shim';
import {
  GhostButton,
  LeadStageBadge,
  LimeButton,
  PriorityChip,
  STAGE_COLOR,
  STAGE_ORDER,
  LeadStageLabels,
  timeAgo,
} from '@/components/leads/leads-ui';

interface PipelineBoardProps {
  leads: Lead[];
  onChanged: () => void;
}

function BoardCard({ lead, onMarkInvalid }: { lead: Lead; onMarkInvalid: (l: Lead) => void }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const utils = trpc.useUtils();
  const { push } = useToasts();

  const update = trpc.leads.update.useMutation({
    onSuccess: async (_d, vars) => {
      await Promise.all([
        utils.leads.list.invalidate(),
        utils.leads.stageCounts.invalidate(),
        utils.leads.funnel.invalidate(),
        utils.leads.conversionStats.invalidate(),
      ]);
      if (vars.stage === 'order_confirmed') {
        push({
          type: 'lead-converted',
          title: 'Lead converted',
          body: `${lead.companyName ?? 'Lead'} converted to Order Confirmed`,
        });
      } else if (vars.stage) {
        push({
          type: 'ai-insight',
          title: 'Stage updated',
          body: `${lead.companyName ?? 'Lead'} → ${LeadStageLabels[vars.stage]} · logged to timeline`,
        });
      }
    },
  });

  const moveTo = (stage: LeadStage) => {
    setMenuOpen(false);
    if (stage === lead.stage) return;
    update.mutate({ id: lead.id, stage });
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      onClick={() => navigate(`/leads/${lead.id}`)}
      className="group cursor-grab rounded-[20px] bg-surface-1 p-3.5 shadow-e1 transition-shadow active:cursor-grabbing hover:shadow-e2"
      // HTML5 drag — framer reserves onDragStart/onDragEnd for pan gestures,
      // so native handlers attach via a plain wrapper below.
    >
      <div
        draggable
        onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
          e.dataTransfer.setData('text/lead-id', String(lead.id));
          e.dataTransfer.effectAllowed = 'move';
          (e.currentTarget.parentElement as HTMLElement).style.opacity = '0.6';
        }}
        onDragEnd={(e: React.DragEvent<HTMLDivElement>) => {
          (e.currentTarget.parentElement as HTMLElement).style.opacity = '1';
        }}
      >
      <div className="flex items-center gap-2.5">
        <Avatar name={lead.companyName ?? `Lead ${lead.id}`} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-primary">
            {lead.companyName ?? 'Unnamed lead'}
          </p>
          <p className="truncate text-[11px] text-muted">{lead.contactPerson ?? '—'}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Move stage"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted opacity-0 transition-all hover:bg-surface-3 hover:text-primary group-hover:opacity-100"
          >
            <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ scale: 0.96, y: -4, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: -4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="glass-strong absolute right-0 top-full z-40 mt-1 w-52 rounded-[16px] p-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {STAGE_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => moveTo(s)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-surface-3',
                      s === lead.stage ? 'text-accent' : 'text-secondary',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_COLOR[s] }} />
                    {LeadStageLabels[s]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onMarkInvalid(lead);
                  }}
                  className="mt-1 flex w-full items-center gap-2 border-t border-line rounded-[12px] px-3 py-2 text-left text-[12px] font-medium text-danger transition-colors hover:bg-[rgba(255,92,92,0.1)]"
                >
                  <Ban size={12} /> Mark Invalid Customer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PriorityChip priority={lead.priority} />
        <span className="text-[11px] text-muted tabular">{timeAgo(lead.lastActivityAt ?? lead.updatedAt)}</span>
      </div>
      </div>
    </motion.div>
  );
}

/** Pipeline board — 4 stage lanes + collapsed red Invalid bin. HTML5 drag & drop. */
export default function PipelineBoard({ leads, onChanged }: PipelineBoardProps) {
  const [overLane, setOverLane] = useState<string | null>(null);
  const [invalidTarget, setInvalidTarget] = useState<Lead | null>(null);
  const [reason, setReason] = useState('');
  const utils = trpc.useUtils();
  const { push } = useToasts();

  const update = trpc.leads.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.leads.list.invalidate(),
        utils.leads.stageCounts.invalidate(),
        utils.leads.funnel.invalidate(),
        utils.leads.conversionStats.invalidate(),
      ]);
      onChanged();
    },
  });
  const addActivity = trpc.leads.addActivity.useMutation();

  const active = leads.filter((l) => l.status !== 'invalid_customer');
  const invalid = leads.filter((l) => l.status === 'invalid_customer');

  const dropOnLane = (stage: LeadStage) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverLane(null);
    const id = Number(e.dataTransfer.getData('text/lead-id'));
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    update.mutate({ id, stage });
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

  const dropOnBin = (e: React.DragEvent) => {
    e.preventDefault();
    setOverLane(null);
    const id = Number(e.dataTransfer.getData('text/lead-id'));
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.status !== 'invalid_customer') setInvalidTarget(lead);
  };

  const confirmInvalid = async () => {
    if (!invalidTarget) return;
    const lead = invalidTarget;
    setInvalidTarget(null);
    await update.mutateAsync({ id: lead.id, status: 'invalid_customer' });
    await addActivity.mutateAsync({
      leadId: lead.id,
      activity: 'note',
      remarks: `Marked Invalid Customer${reason.trim() ? ` — ${reason.trim()}` : ''}`,
    });
    await utils.leads.byId.invalidate({ id: lead.id });
    push({
      type: 'customer-inactive',
      title: 'Marked Invalid Customer',
      body: `${lead.companyName ?? 'Lead'} flagged invalid${reason.trim() ? ` — ${reason.trim()}` : ''}`,
    });
    setReason('');
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {STAGE_ORDER.map((stage) => {
          const laneLeads = active.filter((l) => (l.stage ?? 'new_lead') === stage);
          const highlight = overLane === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverLane(stage);
              }}
              onDragLeave={() => setOverLane((o) => (o === stage ? null : o))}
              onDrop={dropOnLane(stage)}
              className={cn(
                'flex min-h-[280px] flex-col rounded-[24px] p-3 transition-colors duration-200',
                highlight ? 'bg-accent-dim shadow-accent-glow' : 'bg-surface-2',
              )}
            >
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_COLOR[stage] }} />
                  {LeadStageLabels[stage]}
                </p>
                <motion.span
                  key={laneLeads.length}
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-primary tabular"
                >
                  {laneLeads.length}
                </motion.span>
              </div>
              <div className="flex flex-col gap-2.5">
                <AnimatePresence>
                  {laneLeads.map((l) => (
                    <BoardCard key={l.id} lead={l} onMarkInvalid={setInvalidTarget} />
                  ))}
                </AnimatePresence>
                {laneLeads.length === 0 && (
                  <p className="rounded-[16px] border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">
                    Drop leads here
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Invalid bin */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOverLane('invalid');
          }}
          onDragLeave={() => setOverLane((o) => (o === 'invalid' ? null : o))}
          onDrop={dropOnBin}
          className={cn(
            'flex min-h-[280px] flex-col rounded-[24px] p-3 transition-colors duration-200',
            overLane === 'invalid' ? 'bg-[rgba(255,92,92,0.12)]' : 'bg-[rgba(255,92,92,0.05)]',
          )}
        >
          <div className="mb-3 flex items-center justify-between px-2 pt-1">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-danger">
              <Ban size={12} /> Invalid
            </p>
            <motion.span
              key={invalid.length}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-[rgba(255,92,92,0.15)] px-2 py-0.5 text-[11px] font-bold text-danger tabular"
            >
              {invalid.length}
            </motion.span>
          </div>
          <div className="flex flex-col gap-2.5">
            {invalid.slice(0, 4).map((l) => (
              <div key={l.id} className="rounded-[20px] bg-surface-1/60 p-3.5 opacity-70">
                <p className="truncate text-[13px] font-semibold text-secondary">
                  {l.companyName ?? 'Unnamed lead'}
                </p>
                <div className="mt-2">
                  <LeadStageBadge stage={l.stage} invalid />
                </div>
              </div>
            ))}
            {invalid.length === 0 && (
              <p className="rounded-[16px] border border-dashed border-[rgba(255,92,92,0.25)] px-3 py-6 text-center text-[12px] text-muted">
                Drag here to mark invalid
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mark-invalid confirm modal */}
      <GlassModal
        open={invalidTarget !== null}
        onClose={() => setInvalidTarget(null)}
        title="Mark Invalid Customer"
        maxWidth={480}
      >
        <p className="text-[14px] leading-relaxed text-secondary">
          Flag <span className="font-semibold text-primary">{invalidTarget?.companyName ?? 'this lead'}</span> as
          an Invalid Customer? This is a status flag, not a stage — the lead stays in the pipeline history and can
          be reactivated later.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional) — logged to the timeline"
          rows={3}
          className="mt-4 w-full resize-none rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-surface-2 px-4 py-3 text-[14px] text-primary placeholder:text-muted outline-none focus:border-accent"
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <GhostButton onClick={() => setInvalidTarget(null)}>Cancel</GhostButton>
          <LimeButton
            onClick={confirmInvalid}
            className="bg-danger text-primary hover:shadow-[0_0_24px_rgba(255,92,92,0.35)]"
          >
            Mark Invalid
          </LimeButton>
        </div>
      </GlassModal>
    </>
  );
}
