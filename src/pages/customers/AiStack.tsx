import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { useCopilot } from '@/components/Copilot';
import { useToasts } from '@/components/Toasts';
import { useCountUp } from '@/lib/use-count-up';
import { formatINR, monthLabel, type CustomerDetail } from '@/components/customers/utils';

/** Words fade+rise in, 12ms stagger — streaming-text effect. */
function StreamedText({ text, className }: { text: string; className?: string }) {
  const words = useMemo(() => text.split(' '), [text]);
  return (
    <p className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${i}-${w}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.012 }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
}

export interface ForecastData {
  low: number;
  high: number;
  confidence: number;
  spark: number[]; // last 6 months totals
  drivers: string[];
}

function ForecastSpark({ spark }: { spark: number[] }) {
  const w = 220;
  const h = 56;
  const max = Math.max(...spark, 1);
  const min = Math.min(...spark, 0);
  const range = max - min || 1;
  const px = (i: number, n: number) => (i / (n - 1)) * w;
  const py = (v: number) => h - 6 - ((v - min) / range) * (h - 12);

  const solidPts = spark.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i, spark.length).toFixed(1)},${py(v).toFixed(1)}`);
  const lastX = px(spark.length - 1, spark.length);
  const lastY = py(spark[spark.length - 1]);
  const forecastEndY = py(spark[spark.length - 1] * 1.06);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
      <motion.path
        d={solidPts.join(' ')}
        fill="none"
        stroke="#C6FF33"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d={`M${lastX.toFixed(1)},${lastY.toFixed(1)} L${w},${forecastEndY.toFixed(1)}`}
        fill="none"
        stroke="#C6FF33"
        strokeWidth="2"
        strokeDasharray="2 5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.7 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

interface AiStackProps {
  customer: CustomerDetail;
  summary: string;
  nba: { text: string; primaryLabel: string };
  forecast: ForecastData;
}

/** Left column — AI Summary (streamed) · Next Best Action · Forecast. */
export default function AiStack({ customer: c, summary, nba, forecast }: AiStackProps) {
  const { openWith } = useCopilot();
  const { push } = useToasts();
  const animatedConf = useCountUp(forecast.confidence, true);
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-5">
      {/* AI Summary — lime-tinted, streamed */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[24px] bg-surface-2 p-5"
        style={{ boxShadow: 'inset 3px 0 0 0 #C6FF33, 0 8px 32px rgba(0,0,0,0.45)' }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent-dim text-accent">
            <Sparkles size={13} strokeWidth={1.75} />
          </span>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">AI Summary</p>
        </div>
        <StreamedText text={summary} className="text-[14px] leading-relaxed text-secondary" />
      </motion.div>

      {/* Next Best Action — blur→sharp entrance + lime edge sweep */}
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[24px] bg-surface-1 p-5 shadow-e1"
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ delay: 0.5, duration: 0.9, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-y-0 w-1/2"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(198,255,51,0.08), transparent)' }}
        />
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent-dim text-accent">
            <Zap size={13} strokeWidth={1.75} />
          </span>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Next Best Action</p>
        </div>
        <p className="text-[14px] leading-relaxed text-secondary">{nba.text}</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              push({
                type: 'visit-overdue',
                title: 'Visit scheduling',
                body: `Schedule visits for ${c.name} from the Visits module.`,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-bold text-canvas transition-shadow hover:shadow-accent-glow"
          >
            <CalendarPlus size={13} strokeWidth={2} />
            {nba.primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => openWith('Email Generator')}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3.5 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
          >
            <MessageCircle size={13} strokeWidth={1.75} />
            Draft WhatsApp
          </button>
        </div>
      </motion.div>

      {/* Forecast mini-card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] bg-surface-1 p-5 shadow-e1"
      >
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Forecast</p>
          <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[11px] font-bold text-accent tabular">
            {Math.round(animatedConf)}% confidence
          </span>
        </div>
        <p className="font-display text-[22px] font-extrabold text-primary tabular">
          {formatINR(forecast.low, true)}–{formatINR(forecast.high, true).replace('₹', '')}
          <span className="ml-2 text-[12px] font-semibold text-muted">
            next month ({monthLabel(nextMonthKey)})
          </span>
        </p>
        <ForecastSpark spark={forecast.spark} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {forecast.drivers.map((d) => (
            <span key={d} className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
              {d}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
