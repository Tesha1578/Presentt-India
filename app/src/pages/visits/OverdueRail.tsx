import { motion } from 'framer-motion';
import { CalendarClock, ExternalLink, MessageCircle } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useCountUp } from '@/lib/use-count-up';
import { EASE_OUT, fmtDate, mapsSearchUrl, whatsappUrl } from './shared';
import type { CustomerRow, OverdueItem } from './shared';

function OverdueCard({
  item,
  index,
  customer,
  onSchedule,
}: {
  item: OverdueItem;
  index: number;
  customer?: CustomerRow;
  onSchedule: (item: OverdueItem) => void;
}) {
  const days = useCountUp(item.pendingDays, true);
  const critical = item.pendingDays > 60;
  const color = critical ? '#FF5C5C' : '#FFB224';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ width: 0, opacity: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}
      transition={{ duration: 0.35, delay: index * 0.09, ease: EASE_OUT }}
      whileHover={{ y: -4 }}
      className="card-e1 relative w-[300px] shrink-0 overflow-hidden rounded-[24px] p-5"
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.45), inset 3px 0 0 ${color}` }}
    >
      {/* >60d cards pulse the red edge once on mount */}
      {critical && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[24px]"
          initial={{ boxShadow: '0 0 0 0 rgba(255,92,92,0)' }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(255,92,92,0)',
              '0 0 24px 2px rgba(255,92,92,0.45)',
              '0 0 0 0 rgba(255,92,92,0)',
            ],
          }}
          transition={{ duration: 1.4, delay: 0.4 + index * 0.09 }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-primary">{item.name}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {item.region ?? '—'} · {item.city ?? '—'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <motion.p
            className="font-display text-[32px] font-extrabold leading-none tabular"
            style={{ color }}
          >
            {Math.round(days)}
          </motion.p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Pending days
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-secondary">
        <CalendarClock size={13} className="text-muted" />
        <span>
          Last visit: <span className="tabular text-primary">{fmtDate(item.lastVisitDate)}</span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSchedule(item)}
          className="flex-1 rounded-full bg-accent px-3 py-2 text-[12px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          Schedule
        </button>
        <a
          href={mapsSearchUrl(item.name, item.city, customer?.companyAddress)}
          target="_blank"
          rel="noreferrer"
          title="Open in Maps"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
        >
          <ExternalLink size={13} />
        </a>
        <a
          href={whatsappUrl(`Hi ${item.name}, we'd like to schedule our next visit — it's been ${item.pendingDays} days since our last one.`)}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
        >
          <MessageCircle size={13} />
        </a>
      </div>
    </motion.div>
  );
}

export function OverdueRailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="shimmer-base h-[170px] w-[300px] shrink-0 rounded-[24px]" />
      ))}
    </div>
  );
}

/** B. Overdue reminder rail — 45-day rule cards, horizontal scroll. */
export default function OverdueRail({
  items,
  customers,
  onSchedule,
}: {
  items: OverdueItem[];
  customers: CustomerRow[];
  onSchedule: (item: OverdueItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card-e1 rounded-[24px]">
        <EmptyState
          useIllustration
          title="Every customer visited within cycle. The map is yours."
          body="No customer has crossed the 45-day visit threshold."
        />
      </div>
    );
  }
  const byId = new Map(customers.map((c) => [c.id, c]));
  return (
    <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-1">
      {items.map((item, i) => (
        <OverdueCard
          key={item.customerId}
          item={item}
          index={i}
          customer={byId.get(item.customerId)}
          onSchedule={onSchedule}
        />
      ))}
    </div>
  );
}
