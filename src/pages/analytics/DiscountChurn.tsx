import { motion } from 'framer-motion';
import { ArrowRight, BadgePercent, Check, Flame, TriangleAlert, X } from 'lucide-react';
import { Link } from 'react-router';
import CountUp from '@/components/analytics/CountUp';
import { EASE, GRADE_COLORS, inrCompact } from '@/components/analytics/utils';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';

export interface DiscountRow {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
  dropPct: number;
  currentWindowSales: number;
  previousWindowSales: number;
  declining: boolean;
  thresholdPct: number;
  windowMonths: number;
}
export interface ChurnRow {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
  healthGrade: string | null;
  salesIdleDays: number;
  visitIdleDays: number | null;
  riskScore: number;
}

function riskColor(score: number): string {
  if (score >= 70) return '#FF5C5C';
  if (score >= 45) return '#FFB224';
  return '#C6FF33';
}

function MiniSpark({ current, previous, breach }: { current: number; previous: number; breach: boolean }) {
  const max = Math.max(current, previous, 1);
  const h = (v: number) => Math.max(6, (v / max) * 28);
  const color = breach ? '#FF5C5C' : '#8A8A8A';
  return (
    <svg width="40" height="30" viewBox="0 0 40 30" className="shrink-0">
      <rect x={6} y={30 - h(previous)} width={10} height={h(previous)} rx={3} fill="#3A3A3A" />
      <rect x={22} y={30 - h(current)} width={10} height={h(current)} rx={3} fill={color} />
    </svg>
  );
}

/** Section L — discount monitoring (15%/3mo rule) + AI churn-risk ranking. */
export default function DiscountChurn({ discounts, churn }: { discounts: DiscountRow[]; churn: ChurnRow[] }) {
  const { push } = useToasts();
  const thresholdPct = discounts[0]?.thresholdPct ?? 15;
  const windowMonths = discounts[0]?.windowMonths ?? 3;
  const breaches = discounts.filter((d) => d.declining);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Discount monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="card-e1 rounded-[28px] p-6"
      >
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-[16px] font-semibold text-primary">
            <BadgePercent size={16} className="text-warning" strokeWidth={1.75} /> Discount Monitoring
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Threshold: <span className="font-semibold text-primary">{thresholdPct}% over previous {windowMonths} months</span>
            {' '}— configured in{' '}
            <Link to="/settings" className="font-semibold text-accent">
              Settings <ArrowRight size={11} className="inline" />
            </Link>
          </p>
        </div>
        <div className="space-y-2.5">
          {discounts.map((d, i) => {
            const status = d.declining ? 'breach' : d.dropPct > thresholdPct * 0.6 ? 'watch' : 'stable';
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: EASE }}
                className={cn(
                  'flex items-center gap-3 rounded-[16px] px-4 py-3',
                  status === 'breach' ? 'bg-[rgba(255,92,92,0.08)]' : 'bg-surface-2',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-primary">{d.name}</p>
                  <p className="text-[11px] text-muted tabular">
                    {inrCompact(d.previousWindowSales)} → {inrCompact(d.currentWindowSales)} / {d.windowMonths}mo
                  </p>
                </div>
                <MiniSpark current={d.currentWindowSales} previous={d.previousWindowSales} breach={status === 'breach'} />
                {status === 'stable' && (
                  <span className="flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted">
                    <Check size={11} /> stable
                  </span>
                )}
                {status === 'watch' && (
                  <span className="flex items-center gap-1 rounded-full bg-[rgba(255,178,36,0.12)] px-2.5 py-1 text-[11px] font-semibold text-warning tabular">
                    <TriangleAlert size={11} /> −{d.dropPct.toFixed(0)}%
                  </span>
                )}
                {status === 'breach' && (
                  <motion.span
                    initial={{ boxShadow: '0 0 0 0 rgba(255,92,92,0.5)' }}
                    whileInView={{ boxShadow: ['0 0 0 0 rgba(255,92,92,0.5)', '0 0 0 10px rgba(255,92,92,0)'] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.4 }}
                    className="flex items-center gap-1 rounded-full bg-[rgba(255,92,92,0.15)] px-2.5 py-1 text-[11px] font-semibold text-danger tabular"
                  >
                    <X size={11} /> −{d.dropPct.toFixed(0)}%
                  </motion.span>
                )}
              </motion.div>
            );
          })}
          {discounts.length === 0 && <p className="py-4 text-[13px] text-muted">No discounted customers right now.</p>}
        </div>
        {breaches.length > 0 && (
          <p className="mt-3 rounded-[12px] bg-[rgba(255,92,92,0.08)] px-3 py-2 text-[11px] font-medium text-danger">
            {breaches.length} beyond the {thresholdPct}% threshold — discount-decline notifications fired.
          </p>
        )}
      </motion.div>

      {/* Churn risk */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, delay: 0.05, ease: EASE }}
        className="card-e1 rounded-[28px] p-6"
      >
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-[16px] font-semibold text-primary">
            <Flame size={16} className="text-danger" strokeWidth={1.75} /> Customer Churn Risk
          </h3>
          <p className="mt-1 text-[12px] text-muted">AI-ranked · no recent sales + overdue visit + weak health</p>
        </div>
        <div className="space-y-3">
          {churn.slice(0, 6).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.07, ease: EASE }}
              className="rounded-[16px] bg-surface-2 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-primary">{c.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.07 }}
                      className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-secondary tabular"
                    >
                      no sales {c.salesIdleDays}d
                    </motion.span>
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.28 + i * 0.07 }}
                      className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-secondary tabular"
                    >
                      {c.visitIdleDays === null ? 'never visited' : `visit ${c.visitIdleDays}d ago`}
                    </motion.span>
                    {c.healthGrade && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.36 + i * 0.07 }}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                        style={{
                          backgroundColor: `${GRADE_COLORS[c.healthGrade] ?? '#3A3A3A'}1F`,
                          color: GRADE_COLORS[c.healthGrade] ?? '#8A8A8A',
                        }}
                      >
                        {c.healthGrade}
                      </motion.span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-display text-[20px] font-extrabold tabular" style={{ color: riskColor(c.riskScore) }}>
                  <CountUp value={c.riskScore} format={(n) => `${Math.round(n)}%`} />
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${riskColor(c.riskScore)}66, ${riskColor(c.riskScore)})` }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${c.riskScore}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: EASE }}
                />
              </div>
            </motion.div>
          ))}
          {churn.length === 0 && <p className="py-4 text-[13px] text-muted">No customers in the risk band.</p>}
        </div>
        {churn.length > 0 && (
          <button
            type="button"
            onClick={() =>
              push({
                type: 'ai-insight',
                title: 'Retention plays drafting',
                body: `Copilot is drafting retention plays for the top ${Math.min(churn.length, 6)} at-risk accounts.`,
              })
            }
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-surface-3 px-4 py-2.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-dim"
          >
            Draft retention play <ArrowRight size={13} />
          </button>
        )}
      </motion.div>
    </div>
  );
}
