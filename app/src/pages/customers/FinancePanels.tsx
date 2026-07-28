import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, IndianRupee } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  fmtDate,
  formatINR,
  type CustomerDetail,
  type DetailInvoice,
  type DetailPayment,
} from '@/components/customers/utils';

// ---------------------------------------------------------------------------
// E. Payment History
// ---------------------------------------------------------------------------

function paymentTone(p: DetailPayment): string {
  if (p.status === 'failed') return '#FF5C5C';
  if ((p.delayDays ?? 0) > 0) return '#FFB224';
  return '#C6FF33';
}

export function PaymentHistory({ customer }: { customer: CustomerDetail }) {
  const { payments, invoices } = customer;
  const invoiceNumber = useMemo(
    () => new Map<number, string>(invoices.map((i: any) => [i.id, i.number])),
    [invoices],
  );

  const summary = useMemo(() => {
    const invoiced = invoices.reduce((a, i) => a + i.amount, 0);
    const collected = payments.filter((p) => p.status === 'completed').reduce((a, p) => a + p.amount, 0);
    const completed = payments.filter((p) => p.status === 'completed');
    const avgDelay = completed.length
      ? Math.round((completed.reduce((a, p) => a + (p.delayDays ?? 0), 0) / completed.length) * 10) / 10
      : null;
    const pct = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;
    return { pct, avgDelay, outstanding: Math.max(invoiced - collected, 0) };
  }, [invoices, payments]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <p className="mb-3 text-[16px] font-semibold text-primary">Payment History</p>

      {/* summary strip */}
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 rounded-[14px] bg-surface-2 px-4 py-2.5 text-[12px]">
        <span className="text-secondary">
          Collected <span className="font-bold text-accent tabular">{summary.pct}%</span>
        </span>
        <span className="text-secondary">
          Avg delay <span className="font-bold text-primary tabular">{summary.avgDelay ?? '—'}d</span>
        </span>
        <span className="text-secondary">
          Outstanding <span className={cn('font-bold tabular', summary.outstanding > 0 ? 'text-warning' : 'text-primary')}>{formatINR(summary.outstanding, true)}</span>
        </span>
      </div>

      <div className="flex max-h-[380px] flex-col gap-2.5 overflow-y-auto pr-1">
        {payments.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">No payments synced yet.</p>
        )}
        {payments.map((p, i) => {
          const tone = paymentTone(p);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-[16px] bg-surface-2 p-3"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: `${tone}1F`, color: tone }}
              >
                <IndianRupee size={15} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-[16px] font-bold text-primary tabular">{formatINR(p.amount)}</p>
                  {p.invoiceId && invoiceNumber.get(p.invoiceId) && (
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-secondary tabular">
                      {invoiceNumber.get(p.invoiceId)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted tabular">
                  {fmtDate(p.date)} · {(p.mode ?? 'neft').toUpperCase()}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: `${tone}1F`, color: tone }}
              >
                {p.status === 'failed' ? 'bounced' : (p.delayDays ?? 0) > 0 ? `+${p.delayDays} days` : 'on time'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// F. Invoice Timeline
// ---------------------------------------------------------------------------

export function InvoiceTimeline({ customer }: { customer: CustomerDetail }) {
  const [selected, setSelected] = useState<DetailInvoice | null>(null);
  const { push } = useToasts();
  const { invoices, payments } = customer;

  const linkedPayments = useMemo(() => {
    if (!selected) return [];
    return payments.filter((p) => p.invoiceId === selected.id);
  }, [selected, payments]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col rounded-[24px] bg-surface-1 p-5 shadow-e1"
    >
      <p className="mb-4 text-[16px] font-semibold text-primary">Invoice Timeline</p>

      <div className="relative max-h-[380px] overflow-y-auto pl-2 pr-1">
        <motion.div
          className="absolute bottom-4 left-[21px] top-2 w-0.5 origin-top bg-surface-3"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="flex flex-col gap-3">
          {invoices.length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">No invoices synced yet.</p>
          )}
          {invoices.map((inv, i) => {
            const color = INVOICE_STATUS_COLORS[inv.status] ?? '#8A8A8A';
            const overdue = inv.status === 'overdue';
            return (
              <motion.button
                key={inv.id}
                type="button"
                onClick={() => setSelected(inv)}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 420, damping: 32, delay: Math.min(i, 8) * 0.09 }}
                whileHover={{ scale: 1.01 }}
                className="relative flex items-center gap-3 rounded-[16px] bg-surface-2 p-3 text-left"
                style={overdue ? { boxShadow: '0 0 0 1px rgba(255,92,92,0.35), 0 0 18px rgba(255,92,92,0.08)' } : undefined}
              >
                <span
                  className="z-10 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-primary tabular">{inv.number}</p>
                    <p className="font-display text-[14px] font-bold text-primary tabular">{formatINR(inv.amount, true)}</p>
                  </div>
                  <p className="text-[11px] text-muted tabular">
                    {fmtDate(inv.date)}
                    {inv.dueDate ? ` · due ${fmtDate(inv.dueDate)}` : ''}
                  </p>
                </div>
                <motion.span
                  animate={overdue ? { opacity: [1, 0.6, 1] } : undefined}
                  transition={overdue ? { duration: 1.6, repeat: 1 } : undefined}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: `${color}1F`, color }}
                >
                  {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Invoice detail modal */}
      <GlassModal open={!!selected} onClose={() => setSelected(null)} title={selected?.number ?? 'Invoice'} maxWidth={520}>
        {selected && (
          <div>
            <div className="mb-4 flex items-center justify-between rounded-[16px] bg-surface-2 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Amount</p>
                <p className="mt-0.5 font-display text-[26px] font-extrabold text-primary tabular">
                  {formatINR(selected.amount)}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1.5 text-[12px] font-bold"
                style={{
                  backgroundColor: `${INVOICE_STATUS_COLORS[selected.status]}1F`,
                  color: INVOICE_STATUS_COLORS[selected.status],
                }}
              >
                {INVOICE_STATUS_LABELS[selected.status]}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between rounded-[12px] bg-surface-2 px-4 py-2.5">
                <span className="text-muted">Invoice date</span>
                <span className="font-semibold text-primary tabular">{fmtDate(selected.date)}</span>
              </div>
              {selected.dueDate && (
                <div className="flex justify-between rounded-[12px] bg-surface-2 px-4 py-2.5">
                  <span className="text-muted">Due date</span>
                  <span className="font-semibold text-primary tabular">{fmtDate(selected.dueDate)}</span>
                </div>
              )}
              {linkedPayments.map((p) => (
                <div key={p.id} className="flex justify-between rounded-[12px] bg-surface-2 px-4 py-2.5">
                  <span className="text-muted">Payment · {fmtDate(p.date)} · {(p.mode ?? '').toUpperCase()}</span>
                  <span className="font-semibold text-accent tabular">{formatINR(p.amount)}</span>
                </div>
              ))}
              {linkedPayments.length === 0 && (
                <p className="rounded-[12px] bg-surface-2 px-4 py-2.5 text-[12px] text-muted">
                  No payments recorded against this invoice yet.
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  push({
                    type: 'ai-insight',
                    title: 'Invoice PDFs',
                    body: 'Invoice PDFs are generated by your accounting software and attach on the next sync.',
                  })
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-3 px-4 py-2.5 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
              >
                <Download size={14} strokeWidth={1.75} /> Download PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  push({
                    type: 'payment-received',
                    title: 'Payments via accounting sync',
                    body: 'Record the payment in your accounting software — it syncs into SalesOS automatically.',
                  })
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12px] font-bold text-canvas transition-shadow hover:shadow-accent-glow"
              >
                <IndianRupee size={14} strokeWidth={2} /> Record payment
              </button>
            </div>
          </div>
        )}
      </GlassModal>
    </motion.div>
  );
}
