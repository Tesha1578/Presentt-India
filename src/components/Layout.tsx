import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import { Bell, Search, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';
import { CopilotProvider } from '@/components/Copilot';
import { ToastProvider } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';

const PAGE_TITLES: [RegExp, string][] = [
  [/^\/$/, 'Command Center'],
  [/^\/leads\/.+/, 'Lead Profile'],
  [/^\/leads/, 'Leads'],
  [/^\/customers\/.+/, 'Customer 360°'],
  [/^\/customers/, 'Customers'],
  [/^\/visits/, 'Visits'],
  [/^\/queries/, 'Queries'],
  [/^\/analytics/, 'Analytics & BI'],
  [/^\/settings/, 'Settings'],
];

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const listQuery = trpc.notifications.list.useQuery(
    { limit: 20 },
    { staleTime: 30_000, retry: 1 },
  );
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 30_000,
    retry: 1,
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.invalidate(),
  });

  const items = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const unread = unreadQuery.data?.count ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications" title="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-secondary transition-colors hover:text-primary"
      >
        <Bell size={17} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent shadow-accent-glow" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ scale: 0.96, y: -6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-strong absolute right-0 top-full z-50 mt-2 w-[380px] rounded-[24px] p-2"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <p className="metadata">Notifications</p>
              <button
                type="button"
                className="text-[11px] font-semibold text-accent"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            </div>
            {listQuery.isLoading && (
              <div className="flex flex-col gap-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="shimmer-base h-12 rounded-[16px]" />
                ))}
              </div>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-muted">You're all caught up.</p>
            )}
            {items.map((n: any) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) markRead.mutate({ id: n.id });
                  setOpen(false);
                  if (n.entityRef) navigate(n.entityRef);
                }}
                className="flex w-full items-start gap-3 rounded-[16px] px-3 py-3 text-left transition-colors hover:bg-surface-3"
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    n.read ? 'bg-surface-3' : 'bg-accent shadow-accent-glow',
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-primary">{n.title}</span>
                  <span className="block text-[12px] leading-relaxed text-secondary">{n.body}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-muted hover:text-primary"
              aria-label="Close notifications" title="Close notifications"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Compact Indian currency for the header strip (₹1.84Cr / ₹52.4L). */
function compactINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Global KPI strip — live values from Supabase. */
function HeaderKpis() {
  const kpis = trpc.analytics.kpis.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const home = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const d = kpis.data;
  const visitsToday = (home.data?.timeline ?? []).filter((e: any) => e.type === 'visit').length;
  const items = [
    { label: 'Pipeline', value: d ? compactINR(d.pipelineValue ?? 0) : '—' },
    { label: 'Won MTD', value: d ? compactINR(d.monthlyRevenue ?? 0) : '—' },
    { label: 'Open Queries', value: d ? String(d.openQueries ?? 0) : '—' },
    { label: 'Visits Today', value: home.data ? String(visitsToday) : '—' },
  ];
  return (
    <div className="mx-auto hidden items-center gap-5 xl:flex">
      {items.map((k, i) => (
        <div key={k.label} className={cn('flex items-center gap-5', i > 0 && 'border-l border-line pl-5')}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{k.label}</p>
            <p className="font-display text-[18px] font-bold leading-tight text-primary tabular">{k.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * App shell. Navbar is a FIXED left rail (72px) — the Layout owns the offset
 * via pl-[72px] on the content slot; pages never compensate for the rail.
 * Children pattern: App wraps <Routes> inside <Layout>.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const title = useMemo(
    () => PAGE_TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? 'SalesOS',
    [location.pathname],
  );

  // Lenis smooth scrolling for the whole shell
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05 });
    let rafId = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const crumbs = location.pathname.split('/').filter(Boolean);

  return (
    <ToastProvider>
      <CopilotProvider>
        <Navbar />
        <CommandPalette />
        <div className="flex min-h-[100dvh] flex-col pl-[72px]">
          {/* Workspace header — sticky 64px */}
          <header className="glass-strong sticky top-0 z-40 flex h-16 items-center gap-6 border-b border-line px-8">
            <div className="min-w-0">
              <h1 className="truncate font-display text-[20px] font-bold tracking-[-0.02em] text-primary">
                {title}
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                SalesOS{crumbs.length > 0 && ` / ${crumbs.join(' / ')}`}
              </p>
            </div>

            {/* Global KPI strip — live */}
            <HeaderKpis />

            <div className="ml-auto flex items-center gap-3 xl:ml-0">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('salesos:open-palette'))}
                className="flex h-10 items-center gap-2.5 rounded-full bg-surface-2 pl-4 pr-2.5 text-[13px] text-muted transition-colors hover:text-secondary"
              >
                <Search size={14} strokeWidth={1.75} />
                <span className="hidden md:inline">Search anything…</span>
                <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">⌘K</kbd>
              </button>
              <NotificationBell />
            </div>
          </header>

          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </div>
      </CopilotProvider>
    </ToastProvider>
  );
}
