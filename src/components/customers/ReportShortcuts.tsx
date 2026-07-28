import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Repeat, UserX, TrendingUp, TrendingDown, Columns2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR, monthLabel, type CustomerReports } from './utils';

export type GrowthWindow = 'monthly' | '3m' | '6m';

export type Cohort =
  | { kind: 'regular' }
  | { kind: 'no-purchases' }
  | { kind: 'growth' | 'decline'; window: GrowthWindow };

export const WINDOW_PILLS: { key: GrowthWindow; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '6m', label: 'Last 6 Months' },
];

function sameCohort(a: Cohort | null, b: Cohort): boolean {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if ((a.kind === 'growth' || a.kind === 'decline') && (b.kind === 'growth' || b.kind === 'decline')) {
    return a.window === b.window;
  }
  return true;
}

function MiniBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-9 items-end gap-1">
      {data.map((v, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-1.5 origin-bottom rounded-full"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.35 + (0.65 * i) / Math.max(1, data.length - 1) }}
        />
      ))}
    </div>
  );
}

interface CardShellProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function CardShell({ active, onClick, children }: CardShellProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'card-e1 relative w-full rounded-[24px] p-5 text-left transition-shadow hover:shadow-e2',
        active && 'shadow-accent-glow',
      )}
    >
      {active && (
        <motion.span
          layoutId="report-card-ring"
          className="pointer-events-none absolute inset-0 rounded-[24px] ring-2 ring-accent"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
      {children}
    </motion.button>
  );
}

interface ReportShortcutsProps {
  reports: CustomerReports;
  longestGapDays: number | null;
  cohort: Cohort | null;
  onSelect: (cohort: Cohort | null) => void;
}

/** MoM report shortcut cards — each is a cohort filter launcher for the grid. */
export default function ReportShortcuts({ reports, longestGapDays, cohort, onSelect }: ReportShortcutsProps) {
  const [window_, setWindow] = useState<GrowthWindow>('monthly');

  const months = reports.monthlyComparison;
  const cur = months[months.length - 1];
  const prev = months[months.length - 2];
  const momPct = cur && prev && prev.total > 0 ? Math.round(((cur.total - prev.total) / prev.total) * 100) : null;

  const growthCount = useMemo(
    () => reports.growth.filter((g) => g.window === window_).length,
    [reports.growth, window_],
  );
  const declineCount = useMemo(
    () => reports.decline.filter((g) => g.window === window_).length,
    [reports.decline, window_],
  );

  const toggle = (c: Cohort) => onSelect(sameCohort(cohort, c) ? null : c);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Regular Purchasing */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <CardShell active={sameCohort(cohort, { kind: 'regular' })} onClick={() => toggle({ kind: 'regular' })}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-accent-dim text-accent">
              <Repeat size={16} strokeWidth={1.75} />
            </span>
            <MiniBars data={months.map((m) => m.total)} color="#C6FF33" />
          </div>
          <p className="mt-3 font-display text-[26px] font-extrabold text-primary tabular">
            {reports.regularPurchasing.length}
            <span className="ml-1.5 text-[13px] font-semibold text-muted">customers</span>
          </p>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Regular Purchasing</p>
        </CardShell>
      </motion.div>

      {/* 2. No Purchases */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <CardShell active={sameCohort(cohort, { kind: 'no-purchases' })} onClick={() => toggle({ kind: 'no-purchases' })}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] text-danger" style={{ backgroundColor: 'rgba(255,92,92,0.12)' }}>
              <UserX size={16} strokeWidth={1.75} />
            </span>
            {longestGapDays !== null && (
              <span className="text-[11px] font-semibold text-muted tabular">longest gap {longestGapDays} days</span>
            )}
          </div>
          <p className="mt-3 font-display text-[26px] font-extrabold text-primary tabular">
            {reports.noPurchases.length}
            <span className="ml-1.5 text-[13px] font-semibold text-muted">customers</span>
          </p>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">No Purchases (30d)</p>
        </CardShell>
      </motion.div>

      {/* 3. Monthly Comparison */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <CardShell active={false} onClick={() => onSelect(null)}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-accent-dim text-accent">
              <Columns2 size={16} strokeWidth={1.75} />
            </span>
            {momPct !== null && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular"
                style={{
                  backgroundColor: momPct >= 0 ? 'rgba(198,255,51,0.12)' : 'rgba(255,92,92,0.12)',
                  color: momPct >= 0 ? '#C6FF33' : '#FF5C5C',
                }}
              >
                {momPct >= 0 ? '▲' : '▼'}{Math.abs(momPct)}%
              </span>
            )}
          </div>
          {cur && prev && (
            <div className="mt-3 flex items-end gap-3">
              <div>
                <p className="text-[11px] font-semibold text-muted">{monthLabel(cur.month)}</p>
                <p className="font-display text-[20px] font-extrabold text-accent tabular">{formatINR(cur.total, true)}</p>
              </div>
              <div className="pb-0.5">
                <p className="text-[11px] font-semibold text-muted">{monthLabel(prev.month)}</p>
                <p className="font-display text-[15px] font-bold text-secondary tabular">{formatINR(prev.total, true)}</p>
              </div>
            </div>
          )}
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Monthly Comparison</p>
        </CardShell>
      </motion.div>

      {/* 4. Growth / Decline with window pills */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="card-e1 relative h-full rounded-[24px] p-5">
          {(sameCohort(cohort, { kind: 'growth', window: window_ }) || sameCohort(cohort, { kind: 'decline', window: window_ })) && (
            <motion.span
              layoutId="report-card-ring"
              className="pointer-events-none absolute inset-0 rounded-[24px] ring-2 ring-accent"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
          )}
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {WINDOW_PILLS.map((p) => (
              <motion.button
                key={p.key}
                type="button"
                onClick={() => setWindow(p.key)}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'flex-1 rounded-full px-1.5 py-1 text-[10px] font-semibold transition-colors',
                  p.key === window_ ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
                )}
              >
                {p.label}
              </motion.button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => toggle({ kind: 'growth', window: window_ })}
              className="group flex items-center gap-2"
            >
              <TrendingUp size={15} strokeWidth={1.75} className="text-accent" />
              <motion.span
                key={`g-${window_}-${growthCount}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="font-display text-[22px] font-extrabold text-accent tabular group-hover:underline"
              >
                {growthCount}
              </motion.span>
              <span className="text-[11px] font-semibold text-muted">Growing</span>
            </button>
            <button
              type="button"
              onClick={() => toggle({ kind: 'decline', window: window_ })}
              className="group flex items-center gap-2"
            >
              <TrendingDown size={15} strokeWidth={1.75} className="text-danger" />
              <motion.span
                key={`d-${window_}-${declineCount}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="font-display text-[22px] font-extrabold text-danger tabular group-hover:underline"
              >
                {declineCount}
              </motion.span>
              <span className="text-[11px] font-semibold text-muted">Declining</span>
            </button>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Growth / Decline</p>
        </div>
      </motion.div>
    </div>
  );
}
