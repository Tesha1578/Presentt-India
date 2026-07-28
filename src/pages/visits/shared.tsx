import type { RouterOutputs } from '@/lib/data-types';

export type { RouterOutputs };
export type RegionStat = RouterOutputs['visits']['regionDashboard'][number];
export type CityStat = RouterOutputs['visits']['cityView'][number];
export type OverdueItem = RouterOutputs['visits']['overdue'][number];
export type UpcomingVisit = RouterOutputs['visits']['upcoming'][number];
export type CustomerRow = RouterOutputs['customers']['list'][number];
export type VisitRow = RouterOutputs['visits']['listByCustomer'][number];

export const REGION_ORDER = ['West', 'South', 'North', 'East'];

export const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const d = date instanceof Date ? date : new Date(date);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** One-click Google Maps search for a customer. */
export function mapsSearchUrl(name: string, city?: string | null, address?: string | null): string {
  const q = address && address.length > 4 ? address : `${name} ${city ?? ''}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Multi-stop Google Maps directions URL for the AI optimal route. */
export function mapsDirectionsUrl(stops: string[]): string {
  if (stops.length === 0) return 'https://www.google.com/maps';
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  const params = new URLSearchParams({ api: '1', travelmode: 'driving', destination });
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
