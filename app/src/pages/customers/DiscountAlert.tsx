import { motion } from 'framer-motion';
import { BadgePercent, BellRing, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useCopilot } from '@/components/Copilot';
import { useToasts } from '@/components/Toasts';
import {
  fmtDate,
  formatINR,
  monthlyTotals,
  type CustomerDetail,
  type DiscountRow,
} from '@/components/customers/utils';

interface DiscountAlertProps {
  customer: CustomerDetail;
  alert: DiscountRow;
}

/**
 * §10.4 — Discount-decline alert card. Only rendered when the rule fires:
 * discounted customer sales fell beyond threshold over the window while
 * discounts continued. Threshold values deep-link to Settings.
 */
export default function DiscountAlert({ customer, alert }: DiscountAlertProps) {
  const { push } = useToasts();
  const { openWith } = useCopilot();

  const spark = monthlyTotals(customer.invoices, 6);
  const max = Math.max(...spark.map((s) => s.total), 1);
  const contributing = customer.invoices.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      animate={{
        boxShadow: [
          '0 0 0 2px rgba(255,92,92,0.0), 0 8px 32px rgba(0,0,0,0.45)',
          '0 0 0 2px rgba(255,92,92,0.55), 0 8px 32px rgba(0,0,0,0.45)',
          '0 0 0 2px rgba(255,92,92,0.0), 0 8px 32px rgba(0,0,0,0.45)',
          '0 0 0 2px rgba(255,92,92,0.55), 0 8px 32px rgba(0,0,0,0.45)',
          '0 0 0 2px rgba(255,92,92,0.3), 0 8px 32px rgba(0,0,0,0.45)',
        ],
      }}
      transition={{
        duration: 0.35,
        boxShadow: { duration: 1.6, times: [0, 0.25, 0.5, 0.75, 1] },
      }}
      className="relative overflow-hidden rounded-[24px] bg-surface-1 p-6"
      style={{ border: '1px solid rgba(255,92,92,0.25)' }}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-danger" />

      <div className="flex flex-wrap items-start gap-5 pl-2">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: 'rgba(255,92,92,0.12)', color: '#FF5C5C' }}
        >
          <BadgePercent size={18} strokeWidth={1.75} />
        </span>

        <div className="min-w-[260px] flex-1">
          <p className="text-[15px] leading-relaxed text-secondary">
            <span className="font-bold text-danger">Discount Alert.</span> This discounted customer's sales
            fell <span className="font-bold text-danger tabular">{alert.dropPct}%</span> over the previous{' '}
            <span className="font-semibold text-primary tabular">{alert.windowMonths} months</span> while
            discounts continued (threshold:{' '}
            <Link to="/settings" className="font-semibold text-primary underline decoration-danger/60 underline-offset-2 hover:text-accent">
              {alert.thresholdPct}%
            </Link>
            ).
          </p>

          {/* contributing invoices */}
          <div className="mt-3 flex flex-wrap gap-2">
            {contributing.map((inv) => (
              <span key={inv.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-secondary tabular">
                {inv.number} · {fmtDate(inv.date)} · {formatINR(inv.amount, true)}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                openWith('Suggested Actions');
                push({
                  type: 'ai-insight',
                  title: 'Pause-discount suggestion drafted',
                  body: `AI drafted a discount-pause proposal for ${customer.name} in the Copilot.`,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-4 py-2 text-[12px] font-semibold text-accent transition-shadow hover:shadow-accent-glow"
            >
              <Sparkles size={13} strokeWidth={1.75} /> Pause discount suggestion
            </button>
            <button
              type="button"
              onClick={() =>
                push({
                  type: 'discount-decline',
                  title: 'Manager notified',
                  body: `Discounted customer ${customer.name} declining beyond ${alert.thresholdPct}% / ${alert.windowMonths} mo — flagged to the sales manager.`,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-primary"
            >
              <BellRing size={13} strokeWidth={1.75} /> Notify manager
            </button>
          </div>
        </div>

        {/* 3-mo decline spark */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex h-16 items-end gap-1.5">
            {spark.map((s, i) => (
              <motion.span
                key={s.key}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-2 origin-bottom rounded-full"
                style={{
                  height: `${Math.max(6, (s.total / max) * 100)}%`,
                  backgroundColor: i >= spark.length - alert.windowMonths ? '#FF5C5C' : '#3A3A3A',
                }}
                title={`${s.key}: ${formatINR(s.total)}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted tabular">
            {formatINR(alert.previousWindowSales, true)} → {formatINR(alert.currentWindowSales, true)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
