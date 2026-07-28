import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import KpiCard from '@/components/KpiCard';
import TodayTimeline from '@/components/TodayTimeline';
import { useToasts } from '@/components/Toasts';
import GreetingBrief from '@/pages/home/GreetingBrief';
import Funnel from '@/pages/home/Funnel';
import RecentLeads from '@/pages/home/RecentLeads';
import Tasks from '@/pages/home/Tasks';
import UpcomingVisits from '@/pages/home/UpcomingVisits';
import ChartsRow from '@/pages/home/ChartsRow';
import ActivityFeed from '@/pages/home/ActivityFeed';
import { hhmm, useDashboardHome } from '@/pages/home/use-dashboard';
import type { TimelineEvent } from '@/lib/mock-data';

function HomeSkeleton() {
  return (
    <div className="px-8 py-8">
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shimmer-base h-24 rounded-[24px]" />
        <div className="shimmer-base h-24 rounded-[24px]" />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 grid grid-cols-2 gap-6 lg:col-span-8 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer-base h-40 rounded-[28px]" />
          ))}
        </div>
        <div className="shimmer-base col-span-12 h-40 rounded-[28px] lg:col-span-4" />
        <div className="shimmer-base col-span-12 h-[420px] rounded-[28px] lg:col-span-7" />
        <div className="shimmer-base col-span-12 h-[420px] rounded-[28px] lg:col-span-5" />
      </div>
    </div>
  );
}

/** Sales Command Center — route `/`. Data: tRPC dashboard.home aggregate. */
export default function Home() {
  const { data, isLoading } = useDashboardHome();
  const [minElapsed, setMinElapsed] = useState(false);
  const { push } = useToasts();

  // 900ms shimmer minimum, then crossfade to live content per design §I
  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  const loading = isLoading || !minElapsed;

  // Seed a couple of live-feel toasts from the notification catalog
  useEffect(() => {
    if (loading) return;
    const t1 = window.setTimeout(
      () =>
        push({
          type: 'payment-received',
          title: 'Payment received',
          body: '₹2,84,000 received from Eastern Agro Products',
          actionLabel: 'View customer',
        }),
      1800,
    );
    const t2 = window.setTimeout(
      () =>
        push({
          type: 'ai-insight',
          title: 'New AI insight available',
          body: 'Western region conversion is 1.7× your average.',
          actionLabel: 'Open Copilot',
        }),
      4500,
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const timelineEvents: TimelineEvent[] | undefined = useMemo(
    () =>
      data?.timeline.map((t) => ({
        id: t.id,
        time: hhmm(t.time),
        type: t.type,
        title: t.title,
        person: t.person,
        state: t.state,
      })),
    [data],
  );

  const total = data?.stageCounts.total ?? 0;
  const won = data?.kpis.convertedLeads ?? 0;
  const kpis = [
    { id: 'deals', label: 'Total Deals', value: total, format: 'int' as const },
    { id: 'won', label: 'Won', value: won, format: 'int' as const },
    { id: 'lost', label: 'Lost', value: data?.stageCounts.invalidCustomer ?? 0, format: 'int' as const },
    {
      id: 'conv',
      label: 'Conversion Rate',
      value: total > 0 ? Math.round((won / total) * 1000) / 10 : 0,
      format: 'percent' as const,
    },
  ];

  return (
    <div className="ambient-glow">
      <TodayTimeline events={timelineEvents} />
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <HomeSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="px-8 py-8"
          >
            {/* A. Greeting + AI Daily Brief */}
            <GreetingBrief />

            {/* B/C. KPI cards + Lead funnel */}
            <div className="mt-8 grid grid-cols-12 gap-6">
              <div className="col-span-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-4">
                {kpis.map((k, i) => (
                  <KpiCard
                    key={k.id}
                    label={k.label}
                    value={k.value}
                    format={k.format}
                    delay={i * 0.07}
                  />
                ))}
              </div>
              <div className="col-span-12 lg:col-span-4">
                <Funnel />
              </div>
            </div>

            {/* D/E+F. Recent leads + Tasks/Visits */}
            <div className="mt-8 grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-7">
                <RecentLeads />
              </div>
              <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
                <Tasks />
                <UpcomingVisits />
              </div>
            </div>

            {/* H. Charts */}
            <div className="mt-8">
              <ChartsRow />
            </div>

            {/* I. Activity feed */}
            <div className="mt-8">
              <ActivityFeed />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
