import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { timeAgo, useDashboardHome } from '@/pages/home/use-dashboard';
import { formatINR } from '@/lib/mock-data';
import type { ActivityItem } from '@/lib/mock-data';

const FILTERS = ['All', 'Leads', 'Customers', 'Visits', 'Payments'] as const;
type Filter = (typeof FILTERS)[number];

const KIND_MAP: Record<Filter, ActivityItem['kind'][]> = {
  All: ['lead', 'customer', 'visit', 'payment'],
  Leads: ['lead'],
  Customers: ['customer'],
  Visits: ['visit'],
  Payments: ['payment'],
};

function FeedRow({ item, index }: { item: ActivityItem; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3.5 rounded-[20px] p-3.5 transition-colors hover:bg-surface-2"
    >
      <Avatar name={item.actorName} src={item.actorAvatar} size={38} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-secondary">
          <span className="font-semibold text-primary">{item.actorName}</span> {item.verb}{' '}
          <Link to={item.entityHref} className="font-semibold text-primary underline-offset-2 hover:text-accent hover:underline">
            {item.entityName}
          </Link>
          {item.amount !== undefined && (
            <span className="ml-2 font-display font-bold text-accent tabular">{formatINR(item.amount)}</span>
          )}
          {item.detail && <span className="text-muted"> — “{item.detail}”</span>}
        </p>
        <p className="mt-1 text-[12px] text-muted tabular">{item.timestamp}</p>
      </div>
      <span className="mt-1 shrink-0 rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
        {item.kind}
      </span>
    </motion.div>
  );
}

/** Activity feed — live reverse-chrono rows, filter pills, batch "load more" with shimmer. */
export default function ActivityFeed() {
  const { data } = useDashboardHome();
  const [filter, setFilter] = useState<Filter>('All');
  const [shown, setShown] = useState(8);
  const [loading, setLoading] = useState(false);

  const feed: ActivityItem[] = (data?.activityFeed ?? []).map((a) => ({
    id: a.id,
    actorName: a.actorName,
    actorAvatar: a.actorAvatar ?? undefined,
    verb: a.verb,
    entityName: a.entityName,
    entityHref: a.entityHref,
    detail: 'detail' in a ? a.detail : undefined,
    amount: 'amount' in a ? a.amount : undefined,
    timestamp: timeAgo(a.timestamp),
    kind: a.kind,
  }));

  const filtered = feed.filter((a) => KIND_MAP[filter].includes(a.kind));
  const visible = filtered.slice(0, shown);

  const loadMore = () => {
    setLoading(true);
    window.setTimeout(() => {
      setShown((s) => s + 10);
      setLoading(false);
    }, 900);
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-[22px] font-bold text-primary">Activity</h3>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                filter === f
                  ? 'bg-accent-dim text-accent shadow-accent-glow'
                  : 'bg-surface-2 text-muted hover:text-secondary',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card-e1 rounded-[28px] p-3">
        <AnimatePresence mode="popLayout">
          {visible.map((a, i) => (
            <FeedRow key={a.id} item={a} index={i} />
          ))}
        </AnimatePresence>
        {visible.length === 0 && !loading && (
          <p className="py-6 text-center text-[13px] text-muted">No activity yet in this view.</p>
        )}
        {loading && (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer-base h-[64px] rounded-[20px]" />
            ))}
          </div>
        )}
        {visible.length < filtered.length && !loading && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-1 w-full rounded-[20px] py-3 text-center text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          >
            Load more
          </button>
        )}
      </div>
    </section>
  );
}
