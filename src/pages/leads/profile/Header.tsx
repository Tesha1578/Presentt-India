import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Check, RotateCcw } from 'lucide-react';
import Avatar from '@/components/Avatar';
import GlassModal from '@/components/GlassModal';
import QuickActionDock from '@/components/QuickActionDock';
import { cn } from '@/lib/utils';
import type { LeadStage } from '@contracts/types';
import {
  GhostButton,
  LeadStageBadge,
  LeadStageLabels,
  LimeButton,
  PriorityChip,
  STAGE_ORDER,
  formatDate,
  timeAgo,
} from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';

/** Stage stepper — 4 nodes + animated progress line; click a future node to advance. */
function Stepper({ stage, muted, onAdvance }: { stage: LeadStage; muted: boolean; onAdvance: (s: LeadStage) => void }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div className={cn(muted && 'opacity-40 saturate-0')}>
      <div className="relative flex items-start">
        {/* track */}
        <div className="absolute left-5 right-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-surface-3" />
        <motion.div
          className="absolute left-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-accent"
          initial={false}
          animate={{ width: `calc((100% - 40px) * ${idx / (STAGE_ORDER.length - 1)})` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {STAGE_ORDER.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <button
              key={s}
              type="button"
              disabled={muted || i <= idx}
              onClick={() => onAdvance(s)}
              className={cn(
                'relative z-10 flex flex-1 flex-col items-center gap-2',
                i > idx && !muted ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26, delay: i * 0.1 }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  done || current
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-surface-3 bg-surface-2 text-muted hover:border-accent/50',
                )}
              >
                {done ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : (
                  <span className="text-[12px] font-bold tabular">{i + 1}</span>
                )}
                {current && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    animate={{ scale: [1, 1.3], opacity: [0.9, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
              </motion.span>
              <span
                className={cn(
                  'max-w-[120px] text-center text-[11px] font-semibold uppercase tracking-[0.05em] leading-tight',
                  done || current ? 'text-accent' : 'text-muted',
                )}
              >
                {LeadStageLabels[s]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface HeaderProps {
  lead: LeadDetail;
  onStageAdvance: (s: LeadStage) => void;
  onMarkInvalid: (reason: string) => void;
  onReactivate: () => void;
}

/** A — profile header: identity + stage stepper + metadata stack + quick actions. */
export default function Header({ lead, onStageAdvance, onMarkInvalid, onReactivate }: HeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const invalid = lead.status === 'invalid_customer';
  const lastActivity = lead.activities[0];
  const lastUpdater = lead.lastUpdatedBy ?? lastActivity?.updatedBy ?? lead.owner;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass relative overflow-hidden rounded-[28px] p-7"
    >
      {invalid && (
        <motion.span
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute right-[-36px] top-6 rotate-45 bg-danger px-12 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary"
        >
          Invalid
        </motion.span>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
        {/* Left — identity */}
        <div className="flex items-start gap-4">
          <Avatar name={lead.companyName ?? `Lead ${lead.id}`} size={72} className="rounded-[20px]" />
          <div className="min-w-0">
            <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-primary">
              {lead.companyName ?? 'Unnamed lead'}
            </h2>
            <p className="mt-1 text-[14px] text-secondary">
              {[lead.contactPerson, lead.designation].filter(Boolean).join(' · ') || 'No contact added yet'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${lead.stage}-${lead.status}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                >
                  <LeadStageBadge stage={lead.stage} invalid={invalid} />
                </motion.span>
              </AnimatePresence>
              <PriorityChip priority={lead.priority} />
              {lead.source && (
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
                  {lead.source}
                </span>
              )}
              {lead.region && (
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
                  {lead.region}{lead.city ? ` · ${lead.city}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center — stepper */}
        <div className="flex flex-col justify-center">
          <Stepper stage={lead.stage ?? 'new_lead'} muted={invalid} onAdvance={onStageAdvance} />
          <div className="mt-4 flex justify-center">
            {invalid ? (
              <button
                type="button"
                onClick={onReactivate}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-dim"
              >
                <RotateCcw size={13} /> Reactivate lead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-[rgba(255,92,92,0.1)]"
              >
                <Ban size={13} /> Mark Invalid Customer
              </button>
            )}
          </div>
        </div>

        {/* Right — metadata + dock */}
        <div className="flex min-w-[190px] flex-col justify-center gap-3 border-t border-line pt-4 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <div>
            <p className="metadata">Last Activity</p>
            <p className="mt-1 text-[13px] font-medium text-secondary">
              {lead.lastActivitySummary ?? 'No activity yet'}
              {lead.lastActivityAt && <span className="text-muted"> · {timeAgo(lead.lastActivityAt)}</span>}
            </p>
          </div>
          <div>
            <p className="metadata">Last Updated By</p>
            <div className="mt-1 flex items-center gap-2">
              {lastUpdater && <Avatar name={lastUpdater.name ?? 'User'} src={lastUpdater.avatar ?? undefined} size={20} className="rounded-[6px]" />}
              <span className="text-[13px] font-medium text-secondary">{lastUpdater?.name ?? '—'}</span>
            </div>
          </div>
          <div>
            <p className="metadata">Last Updated</p>
            <p className="mt-1 text-[13px] font-medium text-secondary tabular">{formatDate(lead.updatedAt)}</p>
          </div>
          <QuickActionDock
            phone={lead.phone ?? undefined}
            email={lead.email ?? undefined}
            mapsLink={lead.googleMapsUrl ?? undefined}
          />
        </div>
      </div>

      {/* Invalid banner */}
      <AnimatePresence>
        {invalid && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 flex items-center justify-between rounded-[20px] bg-[rgba(255,92,92,0.08)] px-5 py-3.5">
              <p className="text-[13px] text-secondary">
                Marked <span className="font-semibold text-danger">Invalid Customer</span>
                {lastUpdater?.name ? ` by ${lastUpdater.name}` : ''} on {formatDate(lead.updatedAt)} — the pipeline
                stepper is paused.
              </p>
              <GhostButton onClick={onReactivate} className="text-accent">
                <RotateCcw size={13} /> Reactivate
              </GhostButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark invalid confirm */}
      <GlassModal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Mark Invalid Customer" maxWidth={480}>
        <p className="text-[14px] leading-relaxed text-secondary">
          Flag <span className="font-semibold text-primary">{lead.companyName ?? 'this lead'}</span> as an Invalid
          Customer? This is a status flag, not a stage — it can be set at any pipeline stage and reversed later.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason (optional) — logged to the timeline"
          className="mt-4 w-full resize-none rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-surface-2 px-4 py-3 text-[14px] text-primary placeholder:text-muted outline-none focus:border-accent"
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <GhostButton onClick={() => setConfirmOpen(false)}>Cancel</GhostButton>
          <LimeButton
            onClick={() => {
              setConfirmOpen(false);
              onMarkInvalid(reason.trim());
              setReason('');
            }}
            className="bg-danger text-primary hover:shadow-[0_0_24px_rgba(255,92,92,0.35)]"
          >
            Mark Invalid
          </LimeButton>
        </div>
      </GlassModal>
    </motion.section>
  );
}
