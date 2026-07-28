import type { LucideIcon } from 'lucide-react';
import { Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TimelineEntry {
  id: string;
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  body?: string;
  date: string;
  activity?: string;
  remarks?: string;
  updatedBy?: string;
  attachments?: string[];
}

interface AnimatedTimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

/** Vertical timeline: line draws scaleY 0→1, nodes pop with 90ms stagger. */
export default function AnimatedTimeline({ entries, className }: AnimatedTimelineProps) {
  return (
    <div className={cn('relative pl-2', className)}>
      <motion.div
        className="absolute bottom-4 left-[23px] top-4 w-0.5 origin-top bg-surface-3"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="flex flex-col gap-6">
        {entries.map((e, i) => {
          const color = e.iconColor ?? '#C6FF33';
          const Icon = e.icon;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, delay: i * 0.09 }}
              className="relative flex gap-4"
            >
              <div
                className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: `${color}1F`, color }}
              >
                <Icon size={17} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 rounded-[20px] bg-surface-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-semibold text-primary">{e.title}</p>
                  <span className="shrink-0 text-[12px] text-muted tabular">{e.date}</span>
                </div>
                {e.body && <p className="mt-1 text-[13px] leading-relaxed text-secondary">{e.body}</p>}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                  {e.activity && <span className="uppercase tracking-[0.06em]">{e.activity}</span>}
                  {e.remarks && <span>{e.remarks}</span>}
                  {e.updatedBy && <span>by {e.updatedBy}</span>}
                </div>
                {e.attachments && e.attachments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {e.attachments.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary"
                      >
                        <Paperclip size={11} /> {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
