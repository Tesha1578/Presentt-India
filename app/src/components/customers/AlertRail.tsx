import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgePercent, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCopilot } from '@/components/Copilot';
import { useToasts } from '@/components/Toasts';
import { formatINR, type DiscountRow } from './utils';

function DeclineSpark({ current, previous }: { current: number; previous: number }) {
  // simple 4-bar interpolated decline spark (previous window → current window)
  const steps = [previous, previous * 0.82 + current * 0.18, previous * 0.45 + current * 0.55, current];
  const max = Math.max(...steps, 1);
  return (
    <div className="flex h-8 items-end gap-1">
      {steps.map((v, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.25 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-1.5 origin-bottom rounded-full"
          style={{ height: `${Math.max(10, (v / max) * 100)}%`, backgroundColor: '#FF5C5C', opacity: 0.35 + i * 0.2 }}
        />
      ))}
    </div>
  );
}

interface AlertRailProps {
  alerts: DiscountRow[];
}

/**
 * §10.4 — red-edged discount-monitoring alert cards. One per flagged
 * discounted customer (threshold/window from Settings, default 15% / 3 months).
 */
export default function AlertRail({ alerts }: AlertRailProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { openWith } = useCopilot();
  const { push } = useToasts();

  const visible = alerts.filter((a) => a.declining && !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
      <AnimatePresence>
        {visible.map((a, i) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{
              opacity: 1,
              x: 0,
              boxShadow: [
                '0 0 0 2px rgba(255,92,92,0.0), 0 8px 32px rgba(0,0,0,0.45)',
                '0 0 0 2px rgba(255,92,92,0.55), 0 8px 32px rgba(0,0,0,0.45)',
                '0 0 0 2px rgba(255,92,92,0.0), 0 8px 32px rgba(0,0,0,0.45)',
                '0 0 0 2px rgba(255,92,92,0.55), 0 8px 32px rgba(0,0,0,0.45)',
                '0 0 0 2px rgba(255,92,92,0.35), 0 8px 32px rgba(0,0,0,0.45)',
              ],
            }}
            exit={{ width: 0, opacity: 0, marginRight: -16, paddingLeft: 0, paddingRight: 0 }}
            transition={{
              delay: i * 0.09,
              duration: 0.35,
              boxShadow: { duration: 1.6, times: [0, 0.25, 0.5, 0.75, 1] },
              layout: { type: 'spring', stiffness: 420, damping: 32 },
            }}
            className="relative w-[380px] shrink-0 overflow-hidden rounded-[24px] bg-surface-1 p-5"
            style={{ border: '1px solid rgba(255,92,92,0.25)' }}
          >
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-danger" />
            <div className="flex items-start gap-3 pl-1.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: 'rgba(255,92,92,0.12)', color: '#FF5C5C' }}
              >
                <BadgePercent size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-secondary">
                  <span className="font-semibold text-primary">{a.name}</span> — discounted, sales down{' '}
                  <span className="font-bold text-danger tabular">{a.dropPct}%</span> over previous{' '}
                  {a.windowMonths} months (threshold {a.thresholdPct}%) while discounts continue
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <DeclineSpark current={a.currentWindowSales} previous={a.previousWindowSales} />
                  <span className="text-[11px] text-muted tabular">
                    {formatINR(a.previousWindowSales, true)} → {formatINR(a.currentWindowSales, true)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${a.id}`)}
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:text-accent"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openWith('Suggested Actions');
                      push({
                        type: 'ai-insight',
                        title: 'Drafting recovery plan',
                        body: `AI is preparing a discount-recovery plan for ${a.name}.`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:shadow-accent-glow"
                  >
                    <Sparkles size={12} strokeWidth={1.75} />
                    Draft recovery plan
                  </button>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss alert"
                onClick={() => setDismissed((cur) => new Set(cur).add(a.id))}
                className="text-muted transition-colors hover:text-primary"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
