import { BadgePercent, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  GRADE_COLORS,
  PAYMENT_HEALTH_COLORS,
  PAYMENT_HEALTH_LABELS,
  TREND_COLORS,
  TREND_LABELS,
  gradeLabel,
  type PaymentHealth,
} from './utils';

function ChipBase({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        className,
      )}
      style={{ backgroundColor: `${color}1F`, color }}
    >
      {children}
    </span>
  );
}

/** Category badge — Small grey / Medium info / Large lime. */
export function CategoryBadge({ category }: { category?: string | null }) {
  const key = category ?? 'small';
  return (
    <ChipBase color={CATEGORY_COLORS[key] ?? '#8A8A8A'}>
      {CATEGORY_LABELS[key] ?? 'Small'}
    </ChipBase>
  );
}

/** Sales trend chip — Increasing lime ▲ / Stable grey / Decreasing red ▼. */
export function TrendChip({ trend }: { trend?: string | null }) {
  const key = trend ?? 'stable';
  const Icon = key === 'increasing' ? TrendingUp : key === 'decreasing' ? TrendingDown : Minus;
  return (
    <ChipBase color={TREND_COLORS[key] ?? '#8A8A8A'}>
      <Icon size={11} strokeWidth={2} />
      {TREND_LABELS[key] ?? 'Stable'}
    </ChipBase>
  );
}

/** Region · City chip. */
export function RegionChip({ region, city }: { region?: string | null; city?: string | null }) {
  return (
    <ChipBase color="#B8B8B8" className="bg-surface-3">
      {[region, city].filter(Boolean).join(' · ') || 'Unassigned'}
    </ChipBase>
  );
}

/** Payment status chip — Regular lime / Occasional Delays amber / Poor red. */
export function PaymentHealthChip({ health, loading }: { health: PaymentHealth; loading?: boolean }) {
  if (loading) {
    return <span className="shimmer-base inline-block h-[22px] w-24 rounded-full" />;
  }
  return (
    <ChipBase color={PAYMENT_HEALTH_COLORS[health]}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PAYMENT_HEALTH_COLORS[health] }} />
      {PAYMENT_HEALTH_LABELS[health]}
    </ChipBase>
  );
}

/** Discounted tag — amber BadgePercent. */
export function DiscountedTag() {
  return (
    <ChipBase color="#FFB224">
      <BadgePercent size={11} strokeWidth={2} />
      Discounted
    </ChipBase>
  );
}

/** Health dot + score, grade-colored. */
export function HealthDot({ score, grade }: { score: number; grade?: string | null }) {
  const color = GRADE_COLORS[grade ?? ''] ?? '#8A8A8A';
  return (
    <span className="inline-flex items-center gap-1.5" title={`Health: ${gradeLabel(grade)}`}>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
      />
      <span className="text-[12px] font-semibold tabular" style={{ color }}>
        {score}
      </span>
    </span>
  );
}

/** Match-key chip — "GSTIN + Address ✓" with the never-merge-by-name explainer. */
export function MatchKeyChip({ className }: { className?: string }) {
  return (
    <span
      title="Customers are never merged by name alone — same name with a different GSTIN or address is a separate customer."
      className={cn(
        'inline-flex cursor-help items-center gap-1.5 rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent',
        className,
      )}
    >
      GSTIN + Address ✓
    </span>
  );
}

/** Pulsing amber "VISIT OVERDUE" tag. */
export function VisitOverdueTag({ days }: { days: number }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
      style={{ backgroundColor: 'rgba(255,178,36,0.14)', color: '#FFB224' }}
      title={`Last visit ${days} days ago (limit 45)`}
    >
      Visit overdue
    </motion.span>
  );
}
