import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';
import CountUp from '@/components/analytics/CountUp';
import { EASE } from '@/components/analytics/utils';

interface FunnelConversionProps {
  stages: { stage: string; label: string; count: number; connectorPct?: number }[];
  invalid: number;
  conversionRate: number;
  avgConversionDays: number;
}

const GAUGE_R = 64;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

/** Section F — compact lead funnel beside a conversion-rate radial gauge. */
export default function FunnelConversion({ stages, invalid, conversionRate, avgConversionDays }: FunnelConversionProps) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <ChartCard title="Lead Funnel + Conversion">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* funnel bars */}
        <div className="flex-1 space-y-2">
          {stages.map((s, i) => (
            <div key={s.stage}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-[0.06em] text-muted">{s.label}</span>
                <span className="font-semibold text-primary tabular">{s.count}</span>
              </div>
              <div className="h-7 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{
                    background: i === stages.length - 1 ? '#4ADE80' : 'linear-gradient(90deg, rgba(198,255,51,0.85), rgba(198,255,51,0.35))',
                  }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: Math.max(s.count / max, 0.04) }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
                />
              </div>
              {s.connectorPct !== undefined && (
                <p className="mt-0.5 text-right text-[10px] text-muted tabular">{s.connectorPct}% from previous stage</p>
              )}
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between rounded-[12px] bg-[rgba(255,92,92,0.08)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-danger">Invalid tail</span>
            <span className="text-[12px] font-semibold text-danger tabular">{invalid}</span>
          </div>
        </div>

        {/* conversion gauge */}
        <div className="flex w-full flex-col items-center justify-center lg:w-[190px]">
          <div className="relative" style={{ width: 160, height: 160 }}>
            <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
              <circle cx={80} cy={80} r={GAUGE_R} fill="none" stroke="#2A2A2A" strokeWidth={12} />
              <motion.circle
                cx={80}
                cy={80}
                r={GAUGE_R}
                fill="none"
                stroke="#C6FF33"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRC}
                initial={{ strokeDashoffset: GAUGE_CIRC }}
                whileInView={{ strokeDashoffset: GAUGE_CIRC * (1 - conversionRate / 100) }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(198,255,51,0.35))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-primary">
                <CountUp value={conversionRate} format={(n) => `${n.toFixed(1)}%`} />
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Conversion</span>
            </div>
          </div>
          <span className="mt-3 rounded-full bg-surface-2 px-3.5 py-1.5 text-[11px] font-semibold text-secondary tabular">
            Avg conversion {avgConversionDays.toFixed(1)} days
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
