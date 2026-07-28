import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgePercent, CalendarClock, FileClock, IndianRupee, MessageSquareWarning,
  PartyPopper, Sparkles, TrendingDown, UserX, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/lib/mock-data';

export interface ToastData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  push: (t: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} });
export const useToasts = () => useContext(ToastContext);

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; edge: string; tint: string }> = {
  'customer-inactive': { icon: UserX, edge: '#FF5C5C', tint: 'rgba(255,92,92,0.12)' },
  'visit-overdue': { icon: CalendarClock, edge: '#FFB224', tint: 'rgba(255,178,36,0.12)' },
  'sales-drop': { icon: TrendingDown, edge: '#FF5C5C', tint: 'rgba(255,92,92,0.12)' },
  'quotation-pending': { icon: FileClock, edge: '#FFB224', tint: 'rgba(255,178,36,0.12)' },
  'lead-converted': { icon: PartyPopper, edge: '#C6FF33', tint: 'rgba(198,255,51,0.12)' },
  'payment-received': { icon: IndianRupee, edge: '#C6FF33', tint: 'rgba(198,255,51,0.12)' },
  'discount-decline': { icon: BadgePercent, edge: '#FF5C5C', tint: 'rgba(255,92,92,0.12)' },
  'query-reminder': { icon: MessageSquareWarning, edge: '#FFB224', tint: 'rgba(255,178,36,0.12)' },
  'ai-insight': { icon: Sparkles, edge: '#C6FF33', tint: 'rgba(198,255,51,0.12)' },
};

function ToastCard({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const style = TYPE_STYLE[toast.type];
  const Icon = style.icon;
  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="glass relative w-[360px] overflow-hidden rounded-[20px] p-4"
    >
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: style.edge }} />
      <div className="flex items-start gap-3 pl-1.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: style.tint, color: style.edge }}
        >
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-primary">{toast.title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-secondary">{toast.body}</p>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className="mt-2 rounded-full bg-surface-3 px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent-dim"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast.id)}
          className="text-muted transition-colors hover:text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-0.5"
        style={{ backgroundColor: style.edge }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
}

/** Toast host — floats bottom-right, stacked above the Copilot orb. Max 3 visible. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<ToastData, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((cur) => [...cur, { ...t, id }].slice(-3));
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={cn('pointer-events-none fixed bottom-24 right-6 z-[80] flex flex-col gap-3')}>
        <AnimatePresence>
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
