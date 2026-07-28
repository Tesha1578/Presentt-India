import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '@/components/ChartCard';
import { inrCompact, monthLabel } from '@/components/analytics/utils';

interface PaymentCollectionProps {
  monthly: { month: string; total: number }[];
  collectionPct: number;
  totalCollected: number;
  outstanding: number;
  overdueAmount: number;
  avgDelayDays: number;
}

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-[14px] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label ? monthLabel(label) : ''}</p>
      {payload
        .filter((p) => p.value !== undefined && ['collected', 'outstanding', 'overdue'].includes(p.dataKey ?? ''))
        .map((p) => (
          <p key={p.dataKey} className="mt-0.5 text-[12px] font-semibold text-secondary tabular">
            <span className="capitalize">{p.dataKey}</span> {inrCompact(p.value ?? 0)}
          </p>
        ))}
    </div>
  );
}

/** Section G — collected vs outstanding vs overdue stacked area + collection-rate line. */
export default function PaymentCollection({
  monthly,
  collectionPct,
  totalCollected,
  outstanding,
  overdueAmount,
  avgDelayDays,
}: PaymentCollectionProps) {
  const data = useMemo(() => {
    const overdueShare = outstanding > 0 ? overdueAmount / outstanding : 0;
    return monthly.map((m) => {
      const collected = Math.round(m.total * (collectionPct / 100));
      const due = m.total - collected;
      return {
        month: m.month,
        collected,
        outstanding: Math.round(due * (1 - overdueShare)),
        overdue: Math.round(due * overdueShare),
        rate: collectionPct,
      };
    });
  }, [monthly, collectionPct, outstanding, overdueAmount]);

  return (
    <ChartCard
      title="Payment Collection"
      footer={
        <>
          <span className="text-[12px] font-semibold text-accent tabular">{inrCompact(totalCollected)} collected</span>
          <span className="text-[12px] font-semibold text-secondary tabular">{inrCompact(outstanding)} outstanding</span>
          <span className="text-[12px] font-semibold text-danger tabular">{inrCompact(overdueAmount)} overdue</span>
          <span className="ml-auto text-[11px] text-muted tabular">avg delay {avgDelayDays.toFixed(1)}d</span>
        </>
      }
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => inrCompact(v)} tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
            <Area stackId="pay" type="monotone" dataKey="collected" stroke="#C6FF33" strokeWidth={2} fill="#C6FF33" fillOpacity={0.18} animationDuration={800} />
            <Area stackId="pay" type="monotone" dataKey="outstanding" stroke="#3A3A3A" strokeWidth={1.5} fill="#3A3A3A" fillOpacity={0.4} animationDuration={800} animationBegin={150} />
            <Area stackId="pay" type="monotone" dataKey="overdue" stroke="#FF5C5C" strokeWidth={1.5} fill="#FF5C5C" fillOpacity={0.3} animationDuration={800} animationBegin={300} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
