import { motion } from 'framer-motion';
import { Route, ShieldAlert, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useCopilot } from '@/components/Copilot';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc-shim';
import { useDashboardHome } from '@/pages/home/use-dashboard';

function StreamedBrief({ text }: { text: string }) {
  const words = useMemo(() => text.split(' '), [text]);
  return (
    <p className="text-[13px] leading-relaxed text-secondary">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 + i * 0.012 }}
          className="inline-block"
        >
          {w}&nbsp;
        </motion.span>
      ))}
    </p>
  );
}

export default function GreetingBrief() {
  const { openWith } = useCopilot();
  const { user } = useAuth();
  const { data } = useDashboardHome();
  const discountQuery = trpc.analytics.discountMonitoring.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greeting = `Good ${dayPart}, ${firstName}`;

  const visitsToday = data?.timeline.filter((t) => t.type === 'visit').length ?? 0;
  const dateLine = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const metaLine = `${dateLine} · ${visitsToday} visit${visitsToday === 1 ? '' : 's'} planned · ${user?.region ? `${user.region} region` : 'All regions'}`;

  const brief = useMemo(() => {
    const parts: string[] = [];
    const series = data?.salesChart ?? [];
    const last = series[series.length - 1]?.total;
    const prev = series[series.length - 2]?.total;
    if (last !== undefined && prev !== undefined && prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100);
      parts.push(
        pct === 0
          ? 'Revenue is flat vs last month.'
          : `Revenue is ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% vs last month.`,
      );
    } else {
      parts.push('Revenue trend is steady this month.');
    }

    const declining = (discountQuery.data ?? []).filter((c) => c.declining);
    const thresholdPct = data?.kpis.thresholds.discountDeclinePct ?? 15;
    if (declining.length > 0) {
      parts.push(
        `${declining.length} discounted customer${declining.length === 1 ? ' is' : 's are'} declining beyond your ${thresholdPct}% threshold — ${declining[0].name} needs attention today.`,
      );
    } else if (discountQuery.data) {
      parts.push(`No discounted customers are beyond your ${thresholdPct}% decline threshold.`);
    }

    if (visitsToday > 0) {
      parts.push(`Optimal route for your ${visitsToday} visit${visitsToday === 1 ? '' : 's'} is ready.`);
    } else {
      parts.push('No visits scheduled today — a good day to clear overdue follow-ups.');
    }
    return parts.join(' ');
  }, [data, discountQuery.data, visitsToday]);

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-primary">
          {greeting.split(' ').map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="mr-2 inline-block"
            >
              {w}
            </motion.span>
          ))}
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="metadata mt-2"
        >
          {metaLine}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-[24px] p-5"
      >
        <div className="flex items-center gap-2.5">
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-accent-dim text-accent"
          >
            <Sparkles size={15} strokeWidth={1.75} />
          </motion.span>
          <p className="metadata !text-accent">AI Daily Brief</p>
        </div>
        <div className="mt-3">
          <StreamedBrief text={brief} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-3.5 flex gap-2"
        >
          <button
            type="button"
            onClick={() => openWith('Risk Alerts')}
            className="flex items-center gap-1.5 rounded-full bg-[rgba(255,92,92,0.12)] px-3.5 py-1.5 text-[12px] font-semibold text-danger transition-transform hover:scale-[1.03]"
          >
            <ShieldAlert size={13} /> View risks
          </button>
          <button
            type="button"
            onClick={() => openWith('Suggested Actions')}
            className="flex items-center gap-1.5 rounded-full bg-accent-dim px-3.5 py-1.5 text-[12px] font-semibold text-accent transition-transform hover:scale-[1.03]"
          >
            <Route size={13} /> Today's route
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
