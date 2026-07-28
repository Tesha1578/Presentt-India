import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Confidence = 'High' | 'Medium' | 'Low';
type Tone = 'lime' | 'red' | 'amber' | 'info';

const TONE_COLOR: Record<Tone, string> = {
  lime: '#C6FF33',
  red: '#FF5C5C',
  amber: '#FFB224',
  info: '#6AB8FF',
};

interface InsightCardProps {
  icon?: LucideIcon;
  tone?: Tone;
  headline: string;
  reasoning: string;
  confidence?: Confidence;
  actions?: { label: string; onClick?: () => void; primary?: boolean }[];
  delay?: number;
  className?: string;
}

/** AI insight card: tinted icon squircle, headline, reasoning, confidence chip, actions. */
export default function InsightCard({
  icon: Icon = Sparkles,
  tone = 'lime',
  headline,
  reasoning,
  confidence,
  actions,
  delay = 0,
  className,
}: InsightCardProps) {
  const color = TONE_COLOR[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('rounded-[24px] bg-surface-2 p-5', className)}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-primary">{headline}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-secondary line-clamp-2">{reasoning}</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-2">
        {confidence ? (
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-secondary">
            {confidence} confidence
          </span>
        ) : (
          <span />
        )}
        {actions && (
          <div className="flex items-center gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                  a.primary
                    ? 'bg-accent text-accent-foreground hover:shadow-accent-glow'
                    : 'bg-surface-3 text-secondary hover:text-primary',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
