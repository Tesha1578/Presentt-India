import KpiCard from '@/components/KpiCard';

interface HeroKpisProps {
  monthlyRevenue: number;
  totalCustomers: number;
  activeLeads: number;
  collectionPct: number;
  trend: number[];
  momPct: number | null;
}

/** Section A — 4 large animated KPI cards (Manrope values, sparklines, stagger 70ms). */
export default function HeroKpis({
  monthlyRevenue,
  totalCustomers,
  activeLeads,
  collectionPct,
  trend,
  momPct,
}: HeroKpisProps) {
  const growth = momPct ?? 0;
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Revenue MTD"
        value={monthlyRevenue}
        format="currency"
        delta={
          momPct !== null
            ? { value: `${growth >= 0 ? '+' : ''}${growth}%`, positive: growth >= 0 }
            : undefined
        }
        spark={trend}
        delay={0}
      />
      <KpiCard
        label="Sales Growth MoM"
        value={Math.abs(growth)}
        format="percent"
        delta={{ value: growth >= 0 ? 'growing' : 'declining', positive: growth >= 0 }}
        spark={trend.map((v, i) => (i > 0 ? ((v - trend[i - 1]) / (trend[i - 1] || 1)) * 100 : 0))}
        delay={0.07}
      />
      <KpiCard
        label="Collection Rate"
        value={collectionPct}
        format="percent"
        delta={{ value: 'of invoiced', positive: collectionPct >= 80 }}
        spark={trend.map((_, i) => Math.max(30, collectionPct - (trend.length - 1 - i) * 2))}
        delay={0.14}
      />
      <KpiCard
        label="Active Customers"
        value={totalCustomers}
        format="int"
        delta={{ value: `${activeLeads} open leads`, positive: true }}
        spark={trend}
        delay={0.21}
      />
    </div>
  );
}
