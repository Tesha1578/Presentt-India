import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BadgePercent, Sparkles, Telescope, TrendingUp } from 'lucide-react';
import InsightCard from '@/components/InsightCard';
import { EASE, inrCompact } from '@/components/analytics/utils';
import { useToasts } from '@/components/Toasts';

interface InsightRailProps {
  discountBreachCount: number;
  thresholdPct: number;
  windowMonths: number;
  topRegion?: { region: string; delta: number | null };
  churnCount: number;
  nextForecast?: number;
}

interface Insight {
  id: string;
  tone: 'lime' | 'red' | 'amber' | 'info';
  icon: typeof Sparkles;
  headline: string;
  reasoning: string;
  confidence: 'High' | 'Medium' | 'Low';
}

/** Section C — proactive AI insight rail (auto-surfaced, dismissible, stagger 120ms). */
export default function InsightRail({
  discountBreachCount,
  thresholdPct,
  windowMonths,
  topRegion,
  churnCount,
  nextForecast,
}: InsightRailProps) {
  const { push } = useToasts();
  const insights: Insight[] = [
    {
      id: 'risk',
      tone: 'red',
      icon: BadgePercent,
      headline: `Discounted decline: ${discountBreachCount} customer${discountBreachCount === 1 ? '' : 's'} beyond the ${thresholdPct}%/${windowMonths}-month threshold.`,
      reasoning:
        'Discounted customers whose sales dropped past the configured decline threshold while discounts continue — review pricing before the next cycle.',
      confidence: 'High',
    },
    {
      id: 'growth',
      tone: 'lime',
      icon: TrendingUp,
      headline: topRegion
        ? `${topRegion.region} is the strongest region ${topRegion.delta !== null ? `(${topRegion.delta >= 0 ? '+' : ''}${topRegion.delta}% vs previous quarter)` : ''}.`
        : 'Regional growth is balancing out this period.',
      reasoning:
        'Current 3-month revenue vs the previous 3 months, ranked across regions. Concentrate field visits where momentum compounds.',
      confidence: 'Medium',
    },
    {
      id: 'anomaly',
      tone: 'amber',
      icon: AlertTriangle,
      headline: `${churnCount} customer${churnCount === 1 ? '' : 's'} sit in the churn-risk band (score ≥ 40).`,
      reasoning:
        'No recent sales + overdue visit + weak health grade. A win-back touch this week historically recovers a third of this cohort.',
      confidence: 'Medium',
    },
    {
      id: 'forecast',
      tone: 'info',
      icon: Telescope,
      headline: nextForecast
        ? `Next month projected at ${inrCompact(nextForecast)} from the trailing trend.`
        : 'Forecast pending — not enough history yet.',
      reasoning:
        'Least-squares projection over the trailing 6-month revenue series. Treat as a planning band, not a commitment.',
      confidence: 'Low',
    },
  ];

  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = insights.filter((i) => !dismissed.includes(i.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="card-e1 relative h-full overflow-hidden rounded-[28px] p-6"
    >
      {/* scan-line sweep on mount */}
      <motion.div
        aria-hidden
        initial={{ top: '-8%' }}
        animate={{ top: '108%' }}
        transition={{ duration: 0.6, delay: 0.5, ease: 'linear' }}
        className="pointer-events-none absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-[rgba(198,255,51,0.07)] to-transparent"
      />
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-dim text-accent">
          <Sparkles size={15} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-[16px] font-semibold text-primary">AI Insights</h3>
          <p className="text-[11px] text-muted">Proactive · refreshed with your filters</p>
        </div>
      </div>
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {visible.map((insight, i) => (
            <motion.div
              key={insight.id}
              layout="position"
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <InsightCard
                icon={insight.icon}
                tone={insight.tone}
                headline={insight.headline}
                reasoning={insight.reasoning}
                confidence={insight.confidence}
                delay={i * 0.12}
                actions={[
                  {
                    label: 'View',
                    primary: true,
                    onClick: () =>
                      push({
                        type: 'ai-insight',
                        title: 'Insight pinned',
                        body: insight.headline,
                      }),
                  },
                  { label: 'Dismiss', onClick: () => setDismissed((d) => [...d, insight.id]) },
                ]}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center text-[13px] text-muted">
            All insights handled. New signals surface automatically.
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
