import { useCountUp, useInViewOnce } from '@/lib/use-count-up';
import { cn } from '@/lib/utils';

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

/** easeOutExpo count-up numeral, triggers on viewport entry. */
export default function CountUp({ value, format, duration, className }: CountUpProps) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>();
  const animated = useCountUp(value, inView, duration);
  const display = format ? format(animated) : Math.round(animated).toLocaleString('en-IN');
  return (
    <span ref={ref} className={cn('tabular', className)}>
      {display}
    </span>
  );
}
