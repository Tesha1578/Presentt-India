import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import ChartCard from '@/components/ChartCard';
import { compactINR, monthLabel, useDashboardHome } from '@/pages/home/use-dashboard';
import { customerTrends } from '@/lib/mock-data';

const tooltipStyle = {
  backgroundColor: 'rgba(26,26,26,0.92)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  backdropFilter: 'blur(12px)',
  fontSize: '12px',
  color: '#F5F5F5',
  boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
};

function SalesGrowthChart() {
  const { data } = useDashboardHome();
  const [period, setPeriod] = useState('1Y');

  // Live 12-month revenue trend (₹ → ₹L for the chart axis)
  const series = (data?.salesChart ?? []).map((s) => ({
    m: monthLabel(s.month),
    cur: Math.round((s.total / 1e5) * 10) / 10,
    total: s.total,
  }));
  const chartData = period === '3M' ? series.slice(-3) : period === '6M' ? series.slice(-6) : series;

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const mom =
    last && prev && prev.total > 0
      ? Math.round(((last.total - prev.total) / prev.total) * 100)
      : null;

  return (
    <ChartCard
      title="Sales Growth"
      periods={['3M', '6M', '1Y']}
      activePeriod={period}
      onPeriodChange={setPeriod}
      footer={
        <>
          <span className="text-[12px] text-muted">
            {last ? `${last.m} MTD ` : 'This month '}
            <span className="font-display font-bold text-accent tabular">{compactINR(last?.total ?? 0)}</span>
          </span>
          {mom !== null && (
            <span className="text-[12px] text-muted">
              vs last month{' '}
              <span className={mom >= 0 ? 'font-display font-bold text-accent tabular' : 'font-display font-bold text-danger tabular'}>
                {mom >= 0 ? '▲' : '▼'} {Math.abs(mom)}%
              </span>
            </span>
          )}
        </>
      }
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="sg-lime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6FF33" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#C6FF33" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="m" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={['dataMin - 6', 'dataMax + 4']} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(198,255,51,0.3)' }} />
            <Area type="monotone" dataKey="cur" name="Revenue (₹L)" stroke="#C6FF33" strokeWidth={2.5} fill="url(#sg-lime)" animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function CustomerTrendsChart() {
  return (
    <ChartCard
      title="Customer Trends — 30-day windows"
      footer={
        <>
          <span className="text-[12px] text-muted">
            Increasing <span className="font-display font-bold text-success tabular">33</span>
          </span>
          <span className="text-[12px] text-muted">
            No Sales <span className="font-display font-bold text-danger tabular">6</span>
          </span>
        </>
      }
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={customerTrends} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="m" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="increasing" name="Increasing" stackId="a" fill="#4ADE80" animationDuration={800} radius={[0, 0, 0, 0]} />
            <Bar dataKey="stable" name="Stable" stackId="a" fill="#6AB8FF" animationDuration={800} radius={[0, 0, 0, 0]} />
            <Bar dataKey="decreasing" name="Decreasing" stackId="a" fill="#FFB224" animationDuration={800} radius={[0, 0, 0, 0]} />
            <Bar dataKey="nosales" name="No Sales" stackId="a" fill="#FF5C5C" animationDuration={800} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function RegionPerformanceChart() {
  const { data } = useDashboardHome();

  // Live revenue per region (₹ → ₹L), sorted desc by the backend
  const regions = (data?.regionPerformance ?? []).map((r) => ({
    region: r.region,
    value: Math.round((r.value / 1e5) * 10) / 10,
    total: r.value,
    delta: r.delta,
  }));
  const leader = regions[0];
  const avg = regions.length > 0 ? regions.reduce((a, r) => a + r.total, 0) / regions.length : 0;
  const leaderRatio = leader && avg > 0 ? (leader.total / avg).toFixed(1) : null;

  return (
    <ChartCard
      title="Region Performance"
      footer={
        <span className="text-[12px] text-muted">
          Leader{' '}
          <span className="font-display font-bold text-accent tabular">
            {leader ? `${leader.region} ${compactINR(leader.total)}` : '—'}
          </span>
          {leaderRatio && ` · ${leaderRatio}× average`}
        </span>
      }
    >
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={regions} layout="vertical" margin={{ top: 4, right: 44, bottom: 0, left: 8 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="region" tick={{ fill: '#B8B8B8', fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(v) => [`₹${v}L`, 'Revenue']}
            />
            <Bar dataKey="value" name="Revenue (₹L)" radius={[0, 10, 10, 0]} barSize={22} animationDuration={800}
              label={{ position: 'right', fill: '#8A8A8A', fontSize: 11, formatter: (v: unknown) => `₹${v}L` }}
            >
              {regions.map((r, i) => (
                <Cell key={r.region} fill={i === 0 ? '#C6FF33' : '#3A3A3A'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Bottom charts row — draw-in on scroll into viewport. */
export default function ChartsRow() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <SalesGrowthChart />
      <CustomerTrendsChart />
      <RegionPerformanceChart />
    </div>
  );
}
