import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CloudDownload, HeartPulse, Ruler, SlidersHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import { useAuth } from '@/hooks/useAuth';
import { EASE } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';
import ThresholdsPanel from '@/pages/settings/ThresholdsPanel';
import ClassificationPanel from '@/pages/settings/ClassificationPanel';
import HealthRulesPanel from '@/pages/settings/HealthRulesPanel';
import NotificationsPanel from '@/pages/settings/NotificationsPanel';
import RolesPanel from '@/pages/settings/RolesPanel';
import SyncPanel from '@/pages/settings/SyncPanel';

type SectionId = 'thresholds' | 'classification' | 'health' | 'notifications' | 'users' | 'sync';

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'thresholds', label: 'Thresholds', icon: SlidersHorizontal },
  { id: 'classification', label: 'Classification', icon: Ruler },
  { id: 'health', label: 'Health Rules', icon: HeartPulse },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'sync', label: 'Accounting Sync', icon: CloudDownload },
];

function SettingsSkeleton() {
  return (
    <div className="flex gap-6 px-8 py-8">
      <div className="shimmer-base h-[420px] w-[220px] rounded-[24px]" />
      <div className="flex-1 space-y-5">
        <div className="shimmer-base h-40 rounded-[24px]" />
        <div className="shimmer-base h-40 rounded-[24px]" />
        <div className="shimmer-base h-40 rounded-[24px]" />
      </div>
    </div>
  );
}

/** Settings — route `/settings`. Thresholds, classification, health rules, roles, sync. */
export default function Settings() {
  const [section, setSection] = useState<SectionId>('thresholds');
  const { user } = useAuth();
  const thresholds = trpc.thresholds.get.useQuery();
  const kpis = trpc.analytics.kpis.useQuery();

  const role = user?.role ?? 'user';
  const editable = role === 'admin' || role === 'super_admin';

  if (thresholds.isLoading) return <SettingsSkeleton />;
  const settings = thresholds.data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="ambient-glow flex flex-col gap-6 px-8 py-8 lg:flex-row"
    >
      {/* left glass nav rail */}
      <nav className="glass-strong h-fit w-full shrink-0 rounded-[24px] p-2 lg:sticky lg:top-24 lg:w-[220px]">
        <p className="metadata px-3.5 pb-2 pt-3">Control room</p>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                'relative flex w-full items-center gap-2.5 rounded-[16px] px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
                active ? 'text-accent' : 'text-secondary hover:text-primary',
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-nav-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-[16px] bg-accent-dim"
                />
              )}
              <Icon size={15} strokeWidth={1.75} className="relative z-10" />
              <span className="relative z-10">{s.label}</span>
            </button>
          );
        })}
        <div className="mt-3 border-t border-line px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Signed in as</p>
          <p className="mt-1 text-[12px] font-semibold text-primary">{user?.name ?? '—'}</p>
          <span
            className={cn(
              'mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
              editable ? 'bg-accent-dim text-accent' : 'bg-surface-3 text-muted',
            )}
          >
            {role.replace(/_/g, ' ')}
          </span>
        </div>
      </nav>

      {/* active panel */}
      <div className="min-w-0 flex-1">
        {!editable && (section === 'thresholds' || section === 'classification') && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-[16px] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-[12px] font-medium text-warning"
          >
            Values are read-only for your role. Ask an Admin or SuperAdmin to change thresholds.
          </motion.p>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {section === 'thresholds' && settings && (
              <ThresholdsPanel settings={settings} editable={editable} customerCount={kpis.data?.totalCustomers ?? 0} />
            )}
            {section === 'classification' && settings && (
              <ClassificationPanel settings={settings} editable={editable} />
            )}
            {section === 'health' && <HealthRulesPanel />}
            {section === 'notifications' && <NotificationsPanel />}
            {section === 'users' && <RolesPanel />}
            {section === 'sync' && <SyncPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
