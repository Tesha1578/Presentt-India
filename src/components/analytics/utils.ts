/** Shared formatting + motion constants for the BI surfaces. */

export const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Indian grouping: ₹12,40,000 */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Compact Indian currency: ₹12.4L at ≥ ₹10L, ₹1.2Cr at ≥ ₹1Cr. */
export function inrCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (abs >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (abs >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${Math.round(n)}`;
}

/** "2025-05" → "May" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString('en-IN', { month: 'short' });
}

/** Health grade colors (design.md §8 HealthRing). */
export const GRADE_COLORS: Record<string, string> = {
  excellent: '#4ADE80',
  good: '#C6FF33',
  average: '#FFB224',
  poor: '#FF5C5C',
};

/** Chart palette (design.md §3, ordered). */
export const CHART_PALETTE = ['#C6FF33', '#4ADE80', '#6AB8FF', '#FFB224', '#FF5C5C', '#3A3A3A'];

/** Interpolate grey → lime by t∈[0,1]. */
export function heatColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const from = [42, 42, 42];
  const to = [198, 255, 51];
  const mix = from.map((f, i) => Math.round(f + (to[i] - f) * c));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

/** Deterministic pseudo-random from a string (stable layout jitter). */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
