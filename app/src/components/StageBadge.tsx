import { cn } from '@/lib/utils';
import type { LeadStage } from '@/lib/mock-data';
import { stageColor, stageLabel } from '@/lib/mock-data';

interface StageBadgeProps {
  stage: LeadStage;
  invalid?: boolean;
  className?: string;
}

/** Pill badge — dot + 11px uppercase label, tinted bg at 12% opacity. */
export default function StageBadge({ stage, invalid, className }: StageBadgeProps) {
  const color = invalid ? '#FF5C5C' : stageColor(stage);
  const label = invalid ? 'Invalid' : stageLabel(stage);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
        className,
      )}
      style={{ color, backgroundColor: `${color}1F` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
