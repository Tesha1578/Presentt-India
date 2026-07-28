import { motion } from 'framer-motion';
import {
  ArrowUpRight, CalendarPlus, FileText, IndianRupee, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import Avatar from '@/components/Avatar';
import HealthRing from '@/components/HealthRing';
import { useToasts } from '@/components/Toasts';
import { useAuth } from '@/hooks/useAuth';
import { useCountUp } from '@/lib/use-count-up';
import {
  CategoryBadge,
  DiscountedTag,
  MatchKeyChip,
  RegionChip,
} from '@/components/customers/chips';
import {
  PAYMENT_HEALTH_COLORS,
  PAYMENT_HEALTH_LABELS,
  formatINR,
  gradeColor,
  gradeLabel,
  mapsUrl,
  toMockGrade,
  type CustomerDetail,
  type PaymentHealth,
} from '@/components/customers/utils';

interface ProfileHeroProps {
  customer: CustomerDetail;
  currentRevenue: number;
  prevRevenue: number;
  paymentHealth: PaymentHealth;
  avgDelay: number | null;
  inactiveDays: number | null;
}

/** Hero card — identity · health ring · revenue · payment status · quick actions. */
export default function ProfileHero({
  customer: c,
  currentRevenue,
  prevRevenue,
  paymentHealth,
  avgDelay,
  inactiveDays,
}: ProfileHeroProps) {
  const { push } = useToasts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const animatedRevenue = useCountUp(currentRevenue, true);

  const deltaPct =
    prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const prevMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    .toLocaleString('en', { month: 'short' });

  const canLogPayment = user?.role === 'accounts' || user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="card-e1 ambient-glow relative overflow-hidden rounded-[28px] p-7"
    >
      {/* Inactive ribbon (§10.6 — zero sales in 30d) */}
      {inactiveDays !== null && inactiveDays > 30 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-surface-3 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted tabular">
            Inactive {inactiveDays} days
          </span>
          <span className="text-[12px] text-secondary">
            No sales in 30+ days — consider a win-back call or visit.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-8">
        {/* Identity block */}
        <div className="min-w-[280px] flex-1">
          <div className="flex items-center gap-4">
            <Avatar name={c.name} size={72} />
            <div>
              <h2 className="font-display text-[28px] font-bold tracking-[-0.02em] text-primary">
                {c.name}
              </h2>
              <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted tabular">
                {c.id} · GSTIN {c.gstin}
              </p>
            </div>
          </div>

          <a
            href={mapsUrl(c.companyAddress)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex max-w-full items-center gap-1.5 text-[13px] text-secondary transition-colors hover:text-accent"
          >
            <span className="truncate">{c.companyAddress}</span>
            <MapPin size={13} strokeWidth={1.75} className="shrink-0" />
            <ArrowUpRight size={12} strokeWidth={2} className="shrink-0" />
          </a>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={c.category} />
            <RegionChip region={c.region} city={c.city} />
            {c.isDiscounted && <DiscountedTag />}
            <MatchKeyChip />
            {c.owner && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-secondary">
                <Avatar name={c.owner.name ?? 'Owner'} src={c.owner.avatar ?? undefined} size={18} className="rounded-[6px]" />
                {c.owner.name ?? 'Owner'}
              </span>
            )}
          </div>
        </div>

        {/* Three hero stats */}
        <div className="flex items-stretch gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex flex-col items-center justify-center"
          >
            <HealthRing score={c.healthScore} grade={toMockGrade(c.healthGrade)} size={96} showLabel={false} />
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: gradeColor(c.healthGrade) }}>
              {gradeLabel(c.healthGrade)}
            </p>
          </motion.div>

          <div className="w-px bg-line" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex flex-col justify-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Current Revenue</p>
            <p className="mt-1 font-display text-[40px] font-extrabold leading-none text-primary tabular">
              {formatINR(Math.round(animatedRevenue), true)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-muted">this month</span>
              {deltaPct !== null && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular"
                  style={{
                    backgroundColor: deltaPct >= 0 ? 'rgba(198,255,51,0.12)' : 'rgba(255,92,92,0.12)',
                    color: deltaPct >= 0 ? '#C6FF33' : '#FF5C5C',
                  }}
                >
                  {deltaPct >= 0 ? '▲' : '▼'}{Math.abs(deltaPct)}% vs {prevMonthName}
                </span>
              )}
            </div>
          </motion.div>

          <div className="w-px bg-line" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="flex flex-col justify-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Payment Status</p>
            <span
              className="mt-2 w-fit rounded-full px-3.5 py-1.5 text-[13px] font-bold"
              style={{
                backgroundColor: `${PAYMENT_HEALTH_COLORS[paymentHealth]}1F`,
                color: PAYMENT_HEALTH_COLORS[paymentHealth],
              }}
            >
              {PAYMENT_HEALTH_LABELS[paymentHealth]}
            </span>
            <p className="mt-2 text-[11px] text-muted tabular">
              {avgDelay !== null ? `avg delay ${avgDelay} days` : 'no completed payments yet'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <a
          href={mapsUrl(c.companyAddress)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <MapPin size={14} strokeWidth={1.75} /> Maps
        </a>
        <button
          type="button"
          onClick={() =>
            push({
              type: 'visit-overdue',
              title: 'Visit scheduling',
              body: `Schedule visits for ${c.name} from the Visits module.`,
              actionLabel: 'Open Visits',
              onAction: () => navigate('/visits'),
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <CalendarPlus size={14} strokeWidth={1.75} /> Schedule Visit
        </button>
        {canLogPayment && (
          <button
            type="button"
            onClick={() =>
              push({
                type: 'payment-received',
                title: 'Payments via accounting sync',
                body: 'Payments are recorded in your accounting software and sync into SalesOS automatically.',
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
          >
            <IndianRupee size={14} strokeWidth={1.75} /> Log Payment
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            push({
              type: 'ai-insight',
              title: 'Quotations start from a lead',
              body: 'Create a quotation from the Leads module — converted leads become customers here.',
              actionLabel: 'Open Leads',
              onAction: () => navigate('/leads'),
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <FileText size={14} strokeWidth={1.75} /> New Quotation
        </button>
      </div>
    </motion.div>
  );
}
