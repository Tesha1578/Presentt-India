import { trpc } from '@/lib/trpc-shim';
import type { RouterOutputs } from '@/lib/data-types';

/** Payload of the dashboard.home aggregate. */
export type DashboardHome = RouterOutputs['dashboard']['home'];

/**
 * Sales Command Center aggregate query. Every home section subscribes to the
 * same cached query — react-query dedupes to a single HTTP request.
 */
export function useDashboardHome() {
  return trpc.dashboard.home.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** "2025-05-14T09:30:00.000Z" → "09:30" */
export function hhmm(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Date → "14" / "MAY" pair for visit date blocks. */
export function dayMonth(d: Date | string): { day: string; month: string } {
  const date = typeof d === 'string' ? new Date(d) : d;
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
}

/** "YYYY-MM" → "Jun" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString('en-US', { month: 'short' });
}

/** Relative timestamp: "just now" · "24 min ago" · "2h ago" · "3d ago" */
export function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Compact Indian currency: ₹52.4L / ₹1.8Cr (design.md §4). */
export function compactINR(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
