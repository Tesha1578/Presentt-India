import { motion } from 'framer-motion';
import { Sparkles, UserX } from 'lucide-react';
import CountUp from '@/components/analytics/CountUp';
import { EASE } from '@/components/analytics/utils';
import { useToasts } from '@/components/Toasts';

interface InactiveCustomersProps {
  rows: {
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    idleDays: number;
  }[];
  windowDays: number;
}

/** Section K — inactive customers (zero sales 30d+), severity-gradient chips, win-back CTA. */
export default function InactiveCustomers({ rows, windowDays }: InactiveCustomersProps) {
  const { push } = useToasts();
  const maxIdle = Math.max(...rows.map((r) => r.idleDays), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="card-e1 rounded-[28px] bg-gradient-to-br from-[rgba(255,92,92,0.06)] to-transparent p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(255,92,92,0.12)] text-danger">
            <UserX size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="font-display text-[24px] font-bold tracking-[-0.02em] text-primary">
              <CountUp value={rows.length} /> inactive
            </h3>
            <p className="text-[12px] text-muted">no sales in {windowDays}+ days · fires customer-inactive notifications</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            push({
              type: 'ai-insight',
              title: 'Win-back campaign drafting',
              body: `Copilot is drafting a segment WhatsApp for ${rows.length} inactive customers.`,
              actionLabel: 'Open Copilot',
            })
          }
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          <Sparkles size={13} /> Win-back campaign
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {rows.map((r, i) => {
          const severity = r.idleDays / maxIdle;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.5), ease: EASE }}
              whileHover={{ y: -3 }}
              className="shrink-0 rounded-[16px] px-4 py-3"
              style={{
                background: `linear-gradient(135deg, rgba(255,92,92,${0.06 + severity * 0.16}), rgba(255,92,92,${0.02 + severity * 0.05}))`,
              }}
            >
              <p className="max-w-[150px] truncate text-[12px] font-semibold text-primary">{r.name}</p>
              <p className="mt-0.5 text-[11px] text-muted">{[r.city, r.region].filter(Boolean).join(' · ') || '—'}</p>
              <p className="mt-1.5 font-display text-[18px] font-bold text-danger tabular">
                <CountUp value={r.idleDays} />
                <span className="ml-1 text-[11px] font-medium text-muted">days</span>
              </p>
            </motion.div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-4 text-[13px] text-muted">Every customer purchased within the alert window. Nothing inactive.</p>
        )}
      </div>
    </motion.div>
  );
}
