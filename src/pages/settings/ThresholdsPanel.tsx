import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Lock, Minus, Plus, Save } from 'lucide-react';
import { Link } from 'react-router';
import { trpc } from '@/lib/trpc-shim';
import { useToasts } from '@/components/Toasts';
import { EASE } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';
import type { ThresholdSettings } from '@contracts/types';

interface ThresholdsPanelProps {
  settings: ThresholdSettings;
  editable: boolean;
  customerCount: number;
}

interface RuleCardProps {
  title: string;
  ruleText: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  appliesTo?: { label: string; to: string }[];
  editable: boolean;
  saving: boolean;
  onSave: (v: number) => Promise<void>;
  extra?: React.ReactNode;
  delay?: number;
}

function RuleCard({ title, ruleText, value, unit, min, max, appliesTo, editable, saving, onSave, extra, delay = 0 }: RuleCardProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;

  const commit = async () => {
    try {
      setError(null);
      await onSave(draft);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setShake((s) => s + 1);
    }
  };

  const step = (d: number) => setDraft((v) => Math.min(max, Math.max(min, v + d)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: EASE }}
      className={cn(
        'card-e1 rounded-[24px] p-6 transition-shadow',
        dirty && 'shadow-[0_0_0_1px_rgba(198,255,51,0.35),0_0_28px_rgba(198,255,51,0.12)]',
        flash && 'shadow-[0_0_0_1px_rgba(74,222,128,0.5)]',
      )}
    >
      <motion.div
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.3 }}
        key={shake}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold text-primary">{title}</h4>
            <p className="mt-1 text-[13px] leading-relaxed text-secondary">{ruleText}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!editable && (
              <span className="flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-semibold text-muted" title="Admin only">
                <Lock size={10} /> Admin only
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!editable}
                onClick={() => step(-1)}
                aria-label="Decrease"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent disabled:opacity-40"
              >
                <Minus size={13} />
              </button>
              <div className="min-w-[92px] rounded-[16px] bg-surface-2 px-3 py-1.5 text-center">
                <span className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-primary tabular">
                  {draft}
                </span>
                <span className="ml-1 text-[11px] font-semibold text-muted">{unit}</span>
              </div>
              <button
                type="button"
                disabled={!editable}
                onClick={() => step(1)}
                aria-label="Increase"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent disabled:opacity-40"
              >
                <Plus size={13} />
              </button>
            </div>
            <AnimatePresence>
              {dirty && editable && (
                <motion.button
                  type="button"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  onClick={commit}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground hover:shadow-accent-glow disabled:opacity-60"
                >
                  <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        {extra}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {appliesTo && (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Applies to</span>
              {appliesTo.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-secondary transition-colors hover:bg-accent-dim hover:text-accent"
                >
                  {a.label}
                </Link>
              ))}
            </>
          )}
          {error && <span className="ml-auto text-[11px] font-medium text-danger">{error}</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Panel 1 — live-editable business thresholds (Admin / SuperAdmin). */
export default function ThresholdsPanel({ settings, editable, customerCount }: ThresholdsPanelProps) {
  const { push } = useToasts();
  const utils = trpc.useUtils();
  const update = trpc.thresholds.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.thresholds.get.invalidate(),
        utils.analytics.invalidate(),
        utils.customers.invalidate(),
        utils.visits.invalidate(),
      ]);
    },
  });

  const [queryReminderOn, setQueryReminderOn] = useState(true);
  const [queryInterval, setQueryInterval] = useState(1);

  const save = (patch: Partial<ThresholdSettings>, label: string) => async (v: number) => {
    await update.mutateAsync({ [Object.keys(patch)[0]]: v });
    push({
      type: 'ai-insight',
      title: 'Threshold updated',
      body: `${label} — alerts re-evaluated for ${customerCount} customers.`,
      actionLabel: 'View analytics',
    });
  };

  return (
    <div className="space-y-5">
      <RuleCard
        title="Discount decline threshold"
        ruleText="Alert when a discounted customer's sales drop beyond this threshold over the previous N months while discounts continue."
        value={settings.discountDeclinePct}
        unit="%"
        min={1}
        max={100}
        appliesTo={[
          { label: 'Customers', to: '/customers' },
          { label: 'Analytics', to: '/analytics' },
        ]}
        editable={editable}
        saving={update.isPending}
        onSave={save({ discountDeclinePct: 0 }, 'Discount decline threshold')}
        delay={0}
        extra={
          <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-surface-2 px-4 py-3">
            <span className="text-[12px] text-muted">Window</span>
            <WindowEditor
              value={settings.discountWindowMonths}
              editable={editable}
              saving={update.isPending}
              onSave={save({ discountWindowMonths: 0 }, 'Discount window')}
            />
          </div>
        }
      />
      <RuleCard
        title="Visit reminder duration"
        ruleText="Remind when a customer hasn't been visited within this duration."
        value={settings.visitReminderDays}
        unit="days"
        min={1}
        max={365}
        appliesTo={[
          { label: 'Visits', to: '/visits' },
          { label: 'Notifications', to: '/settings' },
        ]}
        editable={editable}
        saving={update.isPending}
        onSave={save({ visitReminderDays: 0 }, 'Visit reminder duration')}
        delay={0.06}
      />
      <RuleCard
        title="Zero-sales alert window"
        ruleText="Classify 30-day sales activity (Regular / No Sales / Increasing / Decreasing) and notify on zero sales."
        value={settings.noSalesAlertDays}
        unit="days"
        min={1}
        max={365}
        appliesTo={[
          { label: 'Analytics', to: '/analytics' },
          { label: 'Customers', to: '/customers' },
        ]}
        editable={editable}
        saving={update.isPending}
        onSave={save({ noSalesAlertDays: 0 }, 'Zero-sales alert window')}
        delay={0.12}
      />
      <RuleCard
        title="Significant change threshold"
        ruleText="Notify when a customer's sales increase or decrease significantly period-over-period."
        value={settings.significantChangePct}
        unit="%"
        min={1}
        max={100}
        editable={editable}
        saving={update.isPending}
        onSave={save({ significantChangePct: 0 }, 'Significant change threshold')}
        delay={0.18}
      />

      {/* Query reminder cadence (notification-engine cadence, client-side config) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.24, ease: EASE }}
        className="card-e1 rounded-[24px] p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="flex items-center gap-2 text-[15px] font-semibold text-primary">
              <Bell size={14} className="text-warning" strokeWidth={1.75} /> Query reminder cadence
            </h4>
            <p className="mt-1 text-[13px] leading-relaxed text-secondary">
              Unresolved queries keep generating reminders until resolved.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={queryReminderOn}
            onClick={() => setQueryReminderOn((v) => !v)}
            className={cn('relative h-7 w-12 rounded-full transition-colors', queryReminderOn ? 'bg-accent' : 'bg-surface-3')}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-canvas',
                queryReminderOn ? 'right-1' : 'left-1 bg-muted',
              )}
            />
          </button>
        </div>
        {queryReminderOn && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[12px] text-muted">Remind every</span>
            {[1, 2, 3, 7].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setQueryInterval(d)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  queryInterval === d ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-muted hover:text-secondary',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function WindowEditor({ value, editable, saving, onSave }: { value: number; editable: boolean; saving: boolean; onSave: (v: number) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 6].map((m) => (
        <button
          key={m}
          type="button"
          disabled={!editable}
          onClick={() => setDraft(m)}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
            draft === m ? 'bg-accent-dim text-accent' : 'bg-surface-3 text-muted hover:text-secondary',
          )}
        >
          {m}mo
        </button>
      ))}
      <AnimatePresence>
        {dirty && editable && (
          <motion.button
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            onClick={() => onSave(draft)}
            disabled={saving}
            className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground"
          >
            <Save size={10} /> Save
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
