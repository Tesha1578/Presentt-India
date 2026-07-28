import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import { useToasts } from '@/components/Toasts';
import GlassModal from '@/components/GlassModal';
import CountUp from '@/components/analytics/CountUp';
import { EASE, inrCompact } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';
import type { ThresholdSettings } from '@contracts/types';

const MAX_SCALE = 2000000; // ₹20L axis
const STEP = 10000; // snap to ₹10K

interface ClassificationPanelProps {
  settings: ThresholdSettings;
  editable: boolean;
}

function classify(avg: number, smallMax: number, mediumMax: number): 'small' | 'medium' | 'large' {
  if (avg <= smallMax) return 'small';
  if (avg <= mediumMax) return 'medium';
  return 'large';
}

/** Panel 2 — classification limits: dual-handle range band + live reclassification preview. */
export default function ClassificationPanel({ settings, editable }: ClassificationPanelProps) {
  const { push } = useToasts();
  const utils = trpc.useUtils();
  const [smallMax, setSmallMax] = useState(settings.classificationSmallMax);
  const [mediumMax, setMediumMax] = useState(settings.classificationMediumMax);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [lastChanged, setLastChanged] = useState<{ id: string; name: string; from: string | null; to: string }[]>([]);

  const dirty = smallMax !== settings.classificationSmallMax || mediumMax !== settings.classificationMediumMax;

  const top = trpc.analytics.topCustomers.useQuery({ limit: 50 });
  const update = trpc.thresholds.update.useMutation();
  const recompute = trpc.customers.classificationRecompute.useMutation();

  // Live impact preview: trailing monthly avg from 6-month revenue vs edited limits.
  const preview = useMemo(() => {
    return (top.data ?? [])
      .map((c) => {
        const avg = c.revenue6m / 6;
        const next = classify(avg, smallMax, mediumMax);
        return { name: c.name, from: c.category ?? 'small', to: next, avg };
      })
      .filter((c) => c.from !== c.to);
  }, [top.data, smallMax, mediumMax]);

  const pct = (v: number) => (v / MAX_SCALE) * 100;

  const drag = (which: 'small' | 'medium') => (e: React.PointerEvent) => {
    if (!editable) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * MAX_SCALE;
      const snapped = Math.round(raw / STEP) * STEP;
      if (which === 'small') setSmallMax(Math.max(STEP, Math.min(snapped, mediumMax - STEP)));
      else setMediumMax(Math.min(MAX_SCALE, Math.max(snapped, smallMax + STEP)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const apply = async () => {
    setApplying(true);
    try {
      await update.mutateAsync({ classificationSmallMax: smallMax, classificationMediumMax: mediumMax });
      const result = await recompute.mutateAsync();
      setLastChanged(result.changed);
      await Promise.all([utils.thresholds.get.invalidate(), utils.customers.invalidate(), utils.analytics.invalidate()]);
      push({
        type: 'ai-insight',
        title: 'Classification limits applied',
        body: `${result.changed.length} customer${result.changed.length === 1 ? '' : 's'} reclassified — badges updated everywhere.`,
      });
      setConfirmOpen(false);
    } catch (err) {
      push({
        type: 'sales-drop',
        title: 'Apply failed',
        body: err instanceof Error ? err.message : 'Could not update classification limits.',
      });
    } finally {
      setApplying(false);
    }
  };

  const segments = [
    { label: 'Small', range: `< ${inrCompact(smallMax)}`, width: pct(smallMax), color: '#3A3A3A' },
    { label: 'Medium', range: `${inrCompact(smallMax)}–${inrCompact(mediumMax)}`, width: pct(mediumMax - smallMax), color: '#6AB8FF' },
    { label: 'Large', range: `> ${inrCompact(mediumMax)}`, width: 100 - pct(mediumMax), color: '#C6FF33' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="card-e1 rounded-[24px] p-6"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-[15px] font-semibold text-primary">Customer Classification Limits</h4>
          <p className="mt-1 text-[13px] leading-relaxed text-secondary">
            Classification is automatic from monthly sales value. Badge updates everywhere; reclassification fires a
            notification.
          </p>
        </div>
        {!editable && (
          <span className="flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-semibold text-muted">
            <Lock size={10} /> Admin only
          </span>
        )}
      </div>

      {/* range slider band */}
      <div className="mt-8 px-1">
        <div ref={trackRef} className="relative h-16 select-none">
          <div className="absolute inset-x-0 top-1/2 flex h-9 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2">
            {segments.map((s) => (
              <motion.div
                key={s.label}
                animate={{ width: `${s.width}%` }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex h-full items-center justify-center overflow-hidden"
                style={{ backgroundColor: `${s.color}26` }}
              >
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: s.color }}>
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
          {/* handles */}
          {(
            [
              ['small', smallMax],
              ['medium', mediumMax],
            ] as ['small' | 'medium', number][]
          ).map(([which, val]) => (
            <motion.button
              key={which}
              type="button"
              aria-label={`${which} boundary`}
              onPointerDown={drag(which)}
              animate={{ left: `calc(${pct(val)}% - 14px)` }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              disabled={!editable}
              className={cn(
                'absolute top-1/2 z-10 flex h-14 w-7 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-full bg-surface-3 shadow-e2 active:cursor-grabbing',
                !editable && 'cursor-not-allowed opacity-50',
              )}
              style={{ touchAction: 'none' }}
            >
              <span className="h-5 w-1 rounded-full bg-accent" />
            </motion.button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted tabular">
          <span>₹0</span>
          <span>
            Small &lt; <span className="text-primary">{inrCompact(smallMax)}</span> · Medium {inrCompact(smallMax)}–
            {inrCompact(mediumMax)} · Large &gt; <span className="text-accent">{inrCompact(mediumMax)}</span>
          </span>
          <span>{inrCompact(MAX_SCALE)}</span>
        </div>
      </div>

      {/* live impact preview */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-[16px] bg-surface-2 p-4">
              <p className="text-[13px] text-secondary">
                Moving the boundaries reclassifies{' '}
                <span className="font-display text-[18px] font-extrabold text-accent tabular">
                  <CountUp value={preview.length} duration={400} />
                </span>{' '}
                of your top-50 customers
                {preview.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {preview.slice(0, 8).map((c, i) => (
                      <motion.span
                        key={c.name}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.04, type: 'spring', stiffness: 500, damping: 26 }}
                        className="flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary"
                      >
                        {c.name}
                        <span className="capitalize text-muted">{c.from}</span>
                        <ArrowRight size={9} />
                        <span className="font-semibold capitalize text-accent">{c.to}</span>
                      </motion.span>
                    ))}
                    {preview.length > 8 && (
                      <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] text-muted">+{preview.length - 8} more</span>
                    )}
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <motion.button
                type="button"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                onClick={() => setConfirmOpen(true)}
                disabled={!editable}
                className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-foreground hover:shadow-accent-glow disabled:opacity-50"
              >
                Apply changes
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* last apply result */}
      {lastChanged.length > 0 && !dirty && (
        <div className="mt-4 rounded-[16px] bg-surface-2 p-4">
          <p className="metadata mb-2">Last reclassification</p>
          <div className="flex flex-wrap gap-1.5">
            {lastChanged.slice(0, 10).map((c) => (
              <span key={c.id} className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] text-secondary">
                {c.name} · <span className="capitalize text-muted">{c.from ?? '—'}</span> →{' '}
                <span className="font-semibold capitalize text-accent">{c.to}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* confirm modal */}
      <GlassModal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Apply classification limits?" maxWidth={520}>
        <p className="text-[13px] leading-relaxed text-secondary">
          Small &lt; <span className="font-semibold text-primary">{inrCompact(smallMax)}</span> · Medium up to{' '}
          <span className="font-semibold text-primary">{inrCompact(mediumMax)}</span>.{' '}
          {preview.length > 0
            ? `${preview.length} top-customer${preview.length === 1 ? '' : 's'} change category immediately (full reclassification runs against all customers):`
            : 'No top-50 customer changes category; the full reclassification still runs against every customer.'}
        </p>
        {preview.length > 0 && (
          <div className="no-scrollbar mt-3 max-h-[220px] space-y-1.5 overflow-y-auto">
            {preview.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-[12px] bg-surface-2 px-3 py-2 text-[12px]">
                <span className="font-medium text-primary">{c.name}</span>
                <span className="text-muted tabular">
                  {inrCompact(c.avg)}/mo · <span className="capitalize">{c.from}</span> →{' '}
                  <span className="font-semibold capitalize text-accent">{c.to}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="rounded-full bg-accent px-5 py-2 text-[12px] font-semibold text-accent-foreground hover:shadow-accent-glow disabled:opacity-60"
          >
            {applying ? 'Applying…' : 'Confirm & reclassify'}
          </button>
        </div>
      </GlassModal>
    </motion.div>
  );
}
