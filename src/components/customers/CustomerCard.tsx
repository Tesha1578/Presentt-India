import { motion } from 'framer-motion';
import { ArrowRight, CalendarPlus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router';
import Avatar from '@/components/Avatar';
import { trpc } from '@/lib/trpc-shim';
import { useToasts } from '@/components/Toasts';
import { useCountUp } from '@/lib/use-count-up';
import { cn } from '@/lib/utils';
import {
  CategoryBadge,
  DiscountedTag,
  HealthDot,
  PaymentHealthChip,
  RegionChip,
  TrendChip,
  VisitOverdueTag,
} from './chips';
import {
  avgPaymentDelay,
  daysSince,
  fmtDate,
  fmtDateShort,
  formatINR,
  mapsUrl,
  monthlyTotals,
  paymentHealthFromDelay,
  relDays,
  type CustomerListItem,
} from './utils';

const VISIT_LIMIT_DAYS = 45;

interface CustomerCardProps {
  customer: CustomerListItem;
  index: number;
  highlightGstin: boolean;
}

/** Animated customer RecordCard — identity → badges → match-key → metrics → hover dock. */
export default function CustomerCard({ customer: c, index, highlightGstin }: CustomerCardProps) {
  const navigate = useNavigate();
  const { push } = useToasts();

  // Per-card finance stats (batched via httpBatchLink, cached for profile nav)
  const statsQuery = trpc.customers.byId.useQuery(
    { id: c.id },
    { staleTime: 60_000 },
  );
  const detail = statsQuery.data;

  const thisMonth = detail ? (monthlyTotals(detail.invoices, 1)[0]?.total ?? 0) : 0;
  const avgDelay = detail ? avgPaymentDelay(detail.payments) : null;
  const paymentHealth = paymentHealthFromDelay(avgDelay);

  const animatedRevenue = useCountUp(thisMonth, !!detail);
  const lastPurchaseDays = daysSince(c.lastPurchaseAt);
  const lastVisitDays = daysSince(c.lastVisitAt);
  const visitOverdue = lastVisitDays !== null && lastVisitDays > VISIT_LIMIT_DAYS;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 11) * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => navigate(`/customers/${c.id}`)}
      className="card-e1 group cursor-pointer rounded-[24px] p-5 transition-shadow hover:shadow-e2"
    >
      {/* Row 1: avatar · name · id · health */}
      <div className="flex items-start gap-3.5">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-primary">{c.name}</p>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted tabular">{c.id}</p>
        </div>
        <HealthDot score={c.healthScore} grade={c.healthGrade} />
      </div>

      {/* Row 2: badge cluster */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <CategoryBadge category={c.category} />
        <TrendChip trend={c.salesTrend} />
        <RegionChip region={c.region} city={c.city} />
        <PaymentHealthChip health={paymentHealth} loading={statsQuery.isLoading} />
        {c.isDiscounted && <DiscountedTag />}
      </div>

      {/* Row 3: match-key metadata (GSTIN + address) */}
      <div className="mt-3.5">
        <p
          className={cn(
            'text-[12px] font-semibold tabular',
            highlightGstin ? 'text-accent' : 'text-secondary',
          )}
        >
          GSTIN {c.gstin}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted" title={c.companyAddress}>
          {c.companyAddress}
        </p>
      </div>

      {/* Row 4: metric trio */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">This Month</p>
          {statsQuery.isLoading ? (
            <span className="shimmer-base mt-1.5 block h-4 w-16 rounded-full" />
          ) : (
            <p className="mt-1 font-display text-[15px] font-bold text-primary tabular">
              {formatINR(Math.round(animatedRevenue), true)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Last Purchase</p>
          <p className="mt-1 text-[13px] font-semibold text-primary tabular">{fmtDateShort(c.lastPurchaseAt)}</p>
          <p className="text-[11px] text-muted tabular">{relDays(lastPurchaseDays)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Last Visit</p>
          <p className={cn('mt-1 text-[13px] font-semibold tabular', visitOverdue ? 'text-danger' : 'text-primary')}>
            {fmtDate(c.lastVisitAt).replace(` ${new Date().getFullYear()}`, '')}
          </p>
          {visitOverdue ? (
            <span className="mt-0.5 inline-block">
              <VisitOverdueTag days={lastVisitDays} />
            </span>
          ) : (
            <p className="text-[11px] text-muted tabular">{relDays(lastVisitDays)}</p>
          )}
        </div>
      </div>

      {/* Row 5 (hover-reveal): quick actions + profile link */}
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div
            className="flex items-center justify-between pt-3.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <motion.a
                href={mapsUrl(c.companyAddress)}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in Maps"
                title="Maps"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
              >
                <MapPin size={15} strokeWidth={1.75} />
              </motion.a>
              <motion.button
                type="button"
                aria-label="Schedule visit"
                title="Schedule visit"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.94 }}
                onClick={() =>
                  push({
                    type: 'visit-overdue',
                    title: 'Visit scheduling',
                    body: `Schedule visits for ${c.name} from the Visits module.`,
                    actionLabel: 'Open Visits',
                    onAction: () => navigate('/visits'),
                  })
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
              >
                <CalendarPlus size={15} strokeWidth={1.75} />
              </motion.button>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
              Profile <ArrowRight size={13} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
