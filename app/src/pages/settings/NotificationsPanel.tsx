import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgePercent, CalendarClock, FileClock, IndianRupee, MessageSquareWarning,
  PartyPopper, Repeat, Sparkles, TrendingDown, TrendingUp, UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToasts } from '@/components/Toasts';
import { EASE } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';

interface NotifRule {
  id: string;
  icon: LucideIcon;
  color: string;
  label: string;
  defaultOn: boolean;
}

/** Full catalog: design.md §11 + the two growth-side rules from §10.9. */
const RULES: NotifRule[] = [
  { id: 'customer-inactive', icon: UserX, color: '#FF5C5C', label: 'Customer inactive 30d (zero sales)', defaultOn: true },
  { id: 'visit-overdue', icon: CalendarClock, color: '#FFB224', label: 'Visit overdue beyond limit', defaultOn: true },
  { id: 'sales-drop', icon: TrendingDown, color: '#FF5C5C', label: 'Sales drop beyond threshold', defaultOn: true },
  { id: 'sales-growth', icon: TrendingUp, color: '#C6FF33', label: 'Sales increase significant', defaultOn: true },
  { id: 'frequency', icon: Repeat, color: '#C6FF33', label: 'Purchasing frequency improved', defaultOn: false },
  { id: 'quotation-pending', icon: FileClock, color: '#FFB224', label: 'Quotation pending response', defaultOn: true },
  { id: 'lead-converted', icon: PartyPopper, color: '#C6FF33', label: 'Lead converted', defaultOn: true },
  { id: 'payment-received', icon: IndianRupee, color: '#C6FF33', label: 'Payment received', defaultOn: true },
  { id: 'discount-decline', icon: BadgePercent, color: '#FF5C5C', label: 'Discounted-customer decline', defaultOn: true },
  { id: 'query-reminder', icon: MessageSquareWarning, color: '#FFB224', label: 'Unresolved query reminder', defaultOn: true },
  { id: 'ai-insight', icon: Sparkles, color: '#C6FF33', label: 'AI insights available', defaultOn: true },
];

const CHANNELS = ['Toast', 'Email', 'WhatsApp'] as const;

/** Panel 4 — notification toggle grid with per-rule channel chips. */
export default function NotificationsPanel() {
  const { push } = useToasts();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('salesos.notif.enabled') ?? 'null');
      if (saved) return saved;
    } catch { /* ignore */ }
    return Object.fromEntries(RULES.map((r) => [r.id, r.defaultOn]));
  });
  const [channels, setChannels] = useState<Record<string, Set<string>>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('salesos.notif.channels') ?? 'null');
      if (saved) return Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, new Set<string>(v as string[])]));
    } catch { /* ignore */ }
    return Object.fromEntries(RULES.map((r) => [r.id, new Set<string>(['Toast'])]));
  });

  useEffect(() => {
    try {
      localStorage.setItem('salesos.notif.enabled', JSON.stringify(enabled));
      localStorage.setItem(
        'salesos.notif.channels',
        JSON.stringify(Object.fromEntries(Object.entries(channels).map(([k, v]) => [k, [...v]]))),
      );
    } catch { /* ignore */ }
  }, [enabled, channels]);

  const toggleChannel = (id: string, ch: string) => {
    setChannels((cur) => {
      const next = new Set(cur[id]);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return { ...cur, [id]: next };
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {RULES.map((rule, i) => {
        const on = enabled[rule.id];
        const Icon = rule.icon;
        return (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
            className="card-e1 rounded-[20px] p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: `${rule.color}1F`, color: rule.color }}
              >
                <Icon size={15} strokeWidth={1.75} />
              </span>
              <p className="flex-1 text-[13px] font-semibold text-primary">{rule.label}</p>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => {
                  setEnabled((cur) => ({ ...cur, [rule.id]: !on }));
                  if (!on) {
                    push({
                      type: 'ai-insight',
                      title: 'Notification enabled',
                      body: `"${rule.label}" will now fire for your team.`,
                    });
                  }
                }}
                className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-accent' : 'bg-surface-3')}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className={cn('absolute top-0.5 h-5 w-5 rounded-full', on ? 'right-0.5 bg-canvas' : 'left-0.5 bg-muted')}
                />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {CHANNELS.map((ch) => {
                const active = channels[rule.id]?.has(ch);
                return (
                  <motion.button
                    key={ch}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => toggleChannel(rule.id, ch)}
                    disabled={!on}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all disabled:opacity-40',
                      active ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-muted hover:text-secondary',
                    )}
                  >
                    {ch}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
