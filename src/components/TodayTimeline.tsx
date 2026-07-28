import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CheckCheck, MapPin, Phone, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/lib/mock-data';

const TYPE_ICON: Record<TimelineEvent['type'], LucideIcon> = {
  visit: MapPin,
  call: Phone,
  meeting: Users,
  task: CalendarCheck,
};

function Chip({ event }: { event: TimelineEvent }) {
  const Icon = TYPE_ICON[event.type];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'group flex shrink-0 cursor-default items-center gap-2.5 rounded-full px-4 py-2 transition-colors',
        event.state === 'now'
          ? 'bg-accent-dim shadow-accent-glow'
          : event.state === 'done'
            ? 'bg-surface-2/60 opacity-60'
            : 'bg-surface-2',
      )}
    >
      <span className="font-display text-[13px] font-bold text-primary tabular">{event.time}</span>
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          event.state === 'now' ? 'bg-accent text-accent-foreground' : 'bg-surface-3 text-secondary',
        )}
      >
        {event.state === 'done' ? <CheckCheck size={12} /> : <Icon size={12} strokeWidth={1.75} />}
      </span>
      <span className="whitespace-nowrap text-[12px] font-medium text-secondary">
        {event.title} · <span className="text-muted">{event.person}</span>
      </span>
      {event.state === 'now' && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />}
    </motion.div>
  );
}

/** Sticky horizontal strip of today's schedule — glass, auto-scrolls "now" into view. */
export default function TodayTimeline({ className, events }: { className?: string; events?: TimelineEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  // No mock fallback — when nothing is scheduled today, say so honestly.
  const items = events ?? [];

  useEffect(() => {
    const container = scrollRef.current;
    const nowChip = nowRef.current;
    if (container && nowChip) {
      container.scrollTo({
        left: nowChip.offsetLeft - container.clientWidth / 2 + nowChip.clientWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [items]);

  return (
    <div className={cn('glass-strong sticky top-16 z-30 border-b border-line', className)}>
      <div
        ref={scrollRef}
        className="no-scrollbar flex items-center gap-2.5 overflow-x-auto px-6 py-3.5"
      >
        <span className="metadata mr-1 shrink-0">Today</span>
        {items.length === 0 && (
          <span className="text-[12px] text-muted">
            Nothing scheduled yet — plan a visit from the Visits page.
          </span>
        )}
        {items.map((e) => (
          <div key={e.id} ref={e.state === 'now' ? nowRef : undefined}>
            <Chip event={e} />
          </div>
        ))}
      </div>
    </div>
  );
}
