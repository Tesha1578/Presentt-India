import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '@/components/ChartCard';
import { inrCompact, monthLabel } from '@/components/analytics/utils';

interface TrendForecastProps {
  trend: { month: string; total: number }[];
  forecast: { month: string; projected: number }[];
  period: string;
  onPeriodChange: (p: string) => void;
}

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === 'actual')?.value;
  const forecast = payload.find((p) => p.dataKey === 'forecast')?.value;
  return (
    <div className="glass rounded-[14px] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label ? monthLabel(label) : ''}</p>
      {actual !== undefined && (
        <p className="mt-0.5 text-[13px] font-semibold text-accent tabular">Actual {inrCompact(actual)}</p>
      )}
      {forecast !== undefined && (
        <p className="mt-0.5 text-[13px] font-semibold text-secondary tabular">Forecast {inrCompact(forecast)}</p>
      )}
    </div>
  );
}

/** Section D — 12-month actuals (lime area) + dotted forecast with confidence band. */
export default function TrendForecast({ trend, forecast, period, onPeriodChange }: TrendForecastProps) {
  const data = useMemo(() => {
    const rows: { month: string; actual?: number; forecast?: number; bandBase?: number; band?: number }[] =
      trend.map((t) => ({ month: t.month, actual: t.total }));
    // bridge: last actual point starts the forecast line
    const last = trend[trend.length - 1];
    if (last) {
      rows[rows.length - 1] = { ...rows[rows.length - 1], forecast: last.total, bandBase: last.total * 0.92, band: last.total * 0.16 };
    }
    for (const f of forecast) {
      rows.push({
        month: f.month,
        forecast: f.projected,
        bandBase: f.projected * 0.92,
        band: f.projected * 0.16,
      });
    }
    return rows;
  }, [trend, forecast]);

  const nextTotal = forecast[0]?.projected;

  return (
    <ChartCard
      title="Sales Trend + Forecast"
      periods={['30D', '3M', '6M', '1Y']}
      activePeriod={period}
      onPeriodChange={onPeriodChange}
      footer={
        <>
          <span className="flex items-center gap-2 text-[12px] text-secondary">
            <span className="h-2 w-2 rounded-full bg-accent" /> Actuals
          </span>
          <span className="flex items-center gap-2 text-[12px] text-secondary">
            <span className="h-0.5 w-4 rounded-full bg-accent/50" style={{ backgroundImage: 'linear-gradient(90deg,#C6FF33 50%,transparent 50%)', backgroundSize: '6px 2px' }} /> Forecast (dotted)
          </span>
          <span className="flex items-center gap-2 text-[12px] text-secondary">
            <span className="h-2 w-2 rounded-full bg-[#3A3A3A]" /> ±8% confidence band
          </span>
          {nextTotal !== undefined && (
            <span className="ml-auto text-[12px] font-semibold text-primary tabular">
              Next month · {inrCompact(nextTotal)}
            </span>
          )}
        </>
      }
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6FF33" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#C6FF33" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ fill: '#8A8A8A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => inrCompact(v)}
              tick={{ fill: '#8A8A8A', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
            {/* confidence band (stacked: transparent base + lime 8% band) */}
            <Area dataKey="bandBase" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area
              dataKey="band"
              stackId="band"
              stroke="none"
              fill="#C6FF33"
              fillOpacity={0.08}
              animationDuration={500}
              animationBegin={900}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#C6FF33"
              strokeWidth={2.5}
              fill="url(#trend-fill)"
              animationDuration={900}
              dot={false}
              activeDot={{ r: 4, fill: '#C6FF33', stroke: '#090909' }}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#C6FF33"
              strokeOpacity={0.5}
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="transparent"
              animationDuration={500}
              animationBegin={900}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
