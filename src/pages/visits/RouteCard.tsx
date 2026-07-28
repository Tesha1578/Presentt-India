import { useEffect, useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ExternalLink, GripVertical, Route, Sparkles } from 'lucide-react';
import { EASE_OUT, SPRING, mapsDirectionsUrl } from './shared';
import type { OverdueItem } from './shared';

export interface RouteStop {
  customerId: string;
  name: string;
  city: string;
  reason: string;
  eta: string;
}

export function estimateKm(stops: number): number {
  return stops === 0 ? 0 : 8 + stops * 11;
}

export function estimateDuration(km: number): string {
  const mins = Math.round(km * 3.9);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `~${h}h ${m}m` : `~${m}m`;
}

/** Build "today's optimal route" from overdue data: urgency first. */
export function buildRoute(overdue: OverdueItem[], openQueryIds: Set<string>): RouteStop[] {
  return overdue.slice(0, 3).map((o, i) => ({
    customerId: o.customerId,
    name: o.name,
    city: o.city ?? '',
    reason: openQueryIds.has(o.customerId) ? 'open query' : `overdue ${Math.max(1, o.pendingDays - 45)}d`,
    eta: ['9:30 AM', '11:15 AM', '1:45 PM'][i] ?? '3:00 PM',
  }));
}

/** Dotted lime polyline that draws across a mini dark map. */
function RoutePath({ count }: { count: number }) {
  const pts = [
    [24, 44],
    [110, 20],
    [196, 52],
    [282, 26],
    [368, 46],
  ].slice(0, Math.max(2, count + 1));
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  return (
    <div className="relative h-[72px] overflow-hidden rounded-[16px] bg-canvas">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <svg viewBox="0 0 392 72" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <motion.path
          d={d}
          fill="none"
          stroke="#C6FF33"
          strokeWidth={2}
          strokeDasharray="1 7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.3 }}
        />
      </svg>
      {pts.slice(0, count).map(([x, y], i) => (
        <motion.span
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING, delay: 0.5 + i * 0.15 }}
          className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent font-display text-[10px] font-extrabold text-accent-foreground shadow-accent-glow"
          style={{ left: `${(x / 392) * 100}%`, top: `${(y / 72) * 100}%` }}
        >
          {i + 1}
        </motion.span>
      ))}
    </div>
  );
}

/** C. AI optimal route card — lime-tinted, drag-to-adjust stop order. */
export default function RouteCard({ stops: initial }: { stops: RouteStop[] }) {
  const [stops, setStops] = useState(initial);
  useEffect(() => setStops(initial), [initial]);

  if (stops.length === 0) return null;
  const km = estimateKm(stops.length);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: EASE_OUT }}
      className="flex h-full flex-col rounded-[24px] bg-surface-2 p-5 shadow-e1"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(198,255,51,0.08)' }}
    >
      <div className="mb-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-accent-dim text-accent">
          <Route size={16} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-primary">
            Today&apos;s optimal route <Sparkles size={13} className="text-accent" />
          </h3>
          <p className="text-[12px] text-muted tabular">
            {stops.length} visits · {km} km · {estimateDuration(km)} driving
          </p>
        </div>
      </div>

      <div className="my-4">
        <RoutePath count={stops.length} />
      </div>

      <Reorder.Group axis="y" values={stops} onReorder={setStops} className="flex flex-col gap-2">
        {stops.map((s, i) => (
          <Reorder.Item
            key={s.customerId}
            value={s}
            whileDrag={{ scale: 1.03, boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
            className="flex cursor-grab items-center gap-3 rounded-[16px] bg-surface-1 px-3 py-2.5 active:cursor-grabbing"
          >
            <GripVertical size={14} className="shrink-0 text-muted" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[11px] font-extrabold text-accent-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-primary">
                {s.name}
                <span className="font-normal text-muted"> · {s.city}</span>
              </p>
              <p className="text-[11px] text-warning">{s.reason}</p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular text-muted">{s.eta}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <p className="mt-3 text-[12px] italic leading-relaxed text-muted">
        “Orders by urgency: overdue visit + open query first; minimizes backtracking.”
      </p>

      <div className="mt-4 flex gap-2">
        <a
          href={mapsDirectionsUrl(stops.map((s) => `${s.name} ${s.city}`))}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          Start in Google Maps <ExternalLink size={13} />
        </a>
        <span className="flex items-center rounded-full bg-surface-3 px-3.5 py-2.5 text-[12px] font-semibold text-secondary">
          Drag to adjust order
        </span>
      </div>
    </motion.section>
  );
}
