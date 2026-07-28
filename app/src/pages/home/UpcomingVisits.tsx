import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { MapPin, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useCopilot } from '@/components/Copilot';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';
import { dayMonth, useDashboardHome } from '@/pages/home/use-dashboard';

interface VisitCard {
  id: string;
  day: string;
  month: string;
  customerName: string;
  customerId: string;
  city: string;
  region: string;
  repAvatar?: string;
  overdueDays?: number;
}

/** Upcoming Visits — date-block mini cards; overdue card shakes once, amber edge. */
export default function UpcomingVisits() {
  const navigate = useNavigate();
  const { openWith } = useCopilot();
  const { data } = useDashboardHome();
  const overdueQuery = trpc.visits.overdue.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  const upcoming: VisitCard[] = (data?.upcomingVisits ?? []).slice(0, 4).map((v) => {
    const { day, month } = dayMonth(v.date);
    return {
      id: `up-${v.id}`,
      day,
      month,
      customerName: v.customerName,
      customerId: v.customerId,
      city: v.city ?? '—',
      region: v.region ?? '—',
      repAvatar: v.repAvatar ?? undefined,
    };
  });

  const worst = overdueQuery.data?.[0];
  const visits: VisitCard[] = worst
    ? [
        {
          id: `od-${worst.customerId}`,
          ...dayMonth(worst.lastVisitDate ?? new Date()),
          customerName: worst.name,
          customerId: worst.customerId,
          city: worst.city ?? '—',
          region: worst.region ?? '—',
          overdueDays: worst.pendingDays,
        },
        ...upcoming.slice(0, 3),
      ]
    : upcoming;

  return (
    <section className="card-e1 rounded-[28px] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[18px] font-bold text-primary">Upcoming Visits</h3>
        <button
          type="button"
          onClick={() => openWith('Suggested Actions')}
          className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-dim px-3.5 py-1.5 text-[12px] font-semibold text-accent transition-shadow hover:shadow-accent-glow"
        >
          <Sparkles size={13} /> Plan route
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {visits.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex cursor-pointer items-center gap-3.5 overflow-hidden rounded-[20px] bg-surface-2 p-3.5 transition-colors hover:bg-surface-3/60',
              v.overdueDays &&
                'before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-warning before:shadow-[0_0_12px_rgba(255,178,36,0.6)]',
            )}
          >
            {v.overdueDays && (
              <motion.span
                className="absolute inset-0"
                initial={{ x: 0 }}
                animate={{ x: [0, -4, 4, 0] }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
              />
            )}
            <div
              className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[16px] bg-surface-3"
              onClick={() => navigate(`/customers/${v.customerId}`)}
            >
              <span className="font-display text-[20px] font-extrabold leading-none text-primary tabular">{v.day}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{v.month}</span>
            </div>
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/customers/${v.customerId}`)}>
              <p className="truncate text-[14px] font-semibold text-primary">{v.customerName}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                  {v.city} · {v.region}
                </span>
                {v.overdueDays && (
                  <span className="text-[11px] font-semibold text-warning">
                    Overdue — {v.overdueDays} days (limit 45)
                  </span>
                )}
              </div>
            </div>
            {v.repAvatar && <Avatar name={v.customerName} src={v.repAvatar} size={30} />}
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Google Maps"
              onClick={(e) => e.stopPropagation()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
            >
              <MapPin size={15} strokeWidth={1.75} />
            </a>
          </motion.div>
        ))}
        {visits.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            No visits scheduled — plan a route with the Copilot.
          </p>
        )}
      </div>
    </section>
  );
}
