import { useMemo, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';
import { cn } from '@/lib/utils';
import {
  TREND_COLORS,
  TREND_LABELS,
  formatINR,
  monthKeyOf,
  monthLabel,
  toDate,
  trailingMonthKeysInclusive,
  type CustomerDetail,
} from '@/components/customers/utils';

const WINDOWS = [
  { key: '1m', label: 'Monthly', months: 1 },
  { key: '3m', label: 'Last 3 Months', months: 3 },
  { key: '6m', label: 'Last 6 Months', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
] as const;

interface SalesGraphProps {
  customer: CustomerDetail;
}

interface ChartDatum {
  key: string;
  label: string;
  total: number;
  ma: number | null;
  delay: number | null; // marker value (bar top) when month had payment delays
  currentYear: boolean;
}

/** Glass tooltip chip. */
function GlassTooltip({ active, payload }: { active?: boolean; payload?: { payload?: ChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="glass-strong rounded-[14px] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{monthLabel(d.key, true)} {d.key.slice(0, 4)}</p>
      <p className="mt-0.5 font-display text-[16px] font-extrabold text-accent tabular">{formatINR(d.total)}</p>
      {d.ma !== null && <p className="text-[11px] text-secondary tabular">3-mo avg {formatINR(Math.round(d.ma), true)}</p>}
      {d.delay !== null && <p className="text-[11px] font-semibold text-warning">payment delay this month</p>}
    </div>
  );
}

/** 12-month bar + 3-mo moving-average combo, MoM report windows + delay markers. */
export default function SalesGraph({ customer: c }: SalesGraphProps) {
  const [windowKey, setWindowKey] = useState<string>('6m');
  const [showDelays, setShowDelays] = useState(true);

  const fullSeries = useMemo<ChartDatum[]>(() => {
    const keys = trailingMonthKeysInclusive(12);
    const totals = new Map<string, number>();
    const delayMonths = new Set<string>();
    for (const inv of c.invoices) {
      const dt = toDate(inv.date);
      if (!dt) continue;
      const k = monthKeyOf(dt);
      totals.set(k, (totals.get(k) ?? 0) + inv.amount);
    }
    for (const p of c.payments) {
      const dt = toDate(p.date);
      if (dt && (p.delayDays ?? 0) > 0) delayMonths.add(monthKeyOf(dt));
    }
    const year = new Date().getFullYear();
    const raw = keys.map((k) => ({
      key: k,
      label: monthLabel(k),
      total: totals.get(k) ?? 0,
      currentYear: Number(k.slice(0, 4)) === year,
    }));
    return raw.map((d, i) => {
      const window3 = raw.slice(Math.max(0, i - 2), i + 1);
      const ma = window3.reduce((a, x) => a + x.total, 0) / window3.length;
      return {
        ...d,
        ma: Math.round(ma),
        delay: delayMonths.has(d.key) ? d.total : null,
      };
    });
  }, [c.invoices, c.payments]);

  const months = WINDOWS.find((w) => w.key === windowKey)?.months ?? 6;
  const data = fullSeries.slice(-months);

  const trendKey = c.salesTrend ?? 'stable';
  const trendColor = TREND_COLORS[trendKey] ?? '#8A8A8A';

  return (
    <ChartCard
      title="Sales Graph"
      periods={WINDOWS.map((w) => w.label)}
      activePeriod={WINDOWS.find((w) => w.key === windowKey)?.label}
      onPeriodChange={(label) => {
        const w = WINDOWS.find((x) => x.label === label);
        if (w) setWindowKey(w.key);
      }}
      footer={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: `${trendColor}1F`, color: trendColor }}
          >
            Trend: {TREND_LABELS[trendKey] ?? 'Stable'}
          </span>
          <button
            type="button"
            onClick={() => setShowDelays((s) => !s)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              showDelays ? 'bg-[rgba(255,178,36,0.12)] text-warning' : 'bg-surface-3 text-muted hover:text-secondary',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Payment-delay markers
          </button>
          <span className="text-[11px] text-muted">bars: monthly invoiced value · line: 3-mo moving average</span>
        </>
      }
    >
      <motion.div
        key={windowKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-[300px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#8A8A8A', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatINR(v, true)}
              tick={{ fill: '#8A8A8A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar
              dataKey="total"
              radius={[8, 8, 8, 8]}
              animationDuration={600}
              animationEasing="ease-out"
              shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: ChartDatum }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={8}
                    fill={payload?.currentYear ? '#C6FF33' : '#3A3A3A'}
                    fillOpacity={payload?.currentYear ? 0.9 : 0.7}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="ma"
              stroke="#6AB8FF"
              strokeWidth={2}
              dot={false}
              animationDuration={800}
              animationBegin={600}
            />
            {showDelays && (
              <Scatter
                dataKey="delay"
                fill="#FFB224"
                shape={(props: { cx?: number; cy?: number }) => (
                  <circle cx={props.cx} cy={(props.cy ?? 0) - 10} r={4} fill="#FFB224" stroke="#090909" strokeWidth={1.5} />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </ChartCard>
  );
}
