import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Flame, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT, SPRING, fmtShort, mapsSearchUrl } from './shared';
import type { CustomerRow, OverdueItem, UpcomingVisit, VisitRow } from './shared';

interface DayInfo {
  done: VisitRow[];
  planned: UpcomingVisit[];
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Deterministic pseudo-position for map pins (no geo data in DB). */
function pinPos(id: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { x: 12 + (h % 72), y: 14 + ((h >> 7) % 62) };
}

function CalendarPanel({
  visits,
  upcoming,
  overdueCount,
}: {
  visits: VisitRow[];
  upcoming: UpcomingVisit[];
  overdueCount: number;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dir, setDir] = useState(0);
  const [selected, setSelected] = useState<Date | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    for (const v of visits) {
      const d = v.date instanceof Date ? v.date : new Date(v.date);
      const k = key(d);
      map.set(k, { done: [...(map.get(k)?.done ?? []), v], planned: map.get(k)?.planned ?? [] });
    }
    for (const u of upcoming) {
      const d = u.date instanceof Date ? u.date : new Date(u.date);
      const k = key(d);
      map.set(k, { done: map.get(k)?.done ?? [], planned: [...(map.get(k)?.planned ?? []), u] });
    }
    return map;
  }, [visits, upcoming]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const shift = (n: number) => {
    setDir(n);
    setSelected(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };

  const selectedInfo = selected ? byDay.get(`${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`) : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[16px] font-bold text-primary">
          {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-primary">
            <ChevronLeft size={15} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-primary">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <p key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {w}
          </p>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
            custom={dir}
            initial={{ x: dir >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const info = byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
              const isToday = sameDay(d, today);
              const count = (info?.done.length ?? 0) + (info?.planned.length ?? 0);
              const dayNum = d.getDate();
              return (
                <div key={d.toISOString()} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelected(sameDay(d, selected ?? new Date(0)) ? null : d)}
                    onMouseEnter={() => setHoverDay(dayNum)}
                    onMouseLeave={() => setHoverDay(null)}
                    className={cn(
                      'flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-[14px] text-[13px] tabular transition-colors',
                      isToday ? 'text-accent' : 'text-secondary hover:bg-surface-3',
                      selected && sameDay(d, selected) && 'bg-surface-3',
                    )}
                    style={isToday ? { boxShadow: 'inset 0 0 0 1.5px #C6FF33' } : undefined}
                  >
                    <span className="font-semibold">{dayNum}</span>
                    <span className="flex h-1.5 items-center gap-1">
                      {info?.done.map((v) => (
                        <motion.span key={`d${v.id}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.02 }} className="h-1.5 w-1.5 rounded-full bg-[#5A5A5A]" />
                      ))}
                      {info?.planned.map((u) => (
                        <motion.span key={`p${u.id}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.02 }} className="h-1.5 w-1.5 rounded-full bg-accent" />
                      ))}
                      {isToday && overdueCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-danger" title={`${overdueCount} overdue`} />
                      )}
                    </span>
                  </button>
                  {count > 1 && (
                    <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-surface-3 px-1 text-[9px] font-bold tabular text-muted">
                      {count}
                    </span>
                  )}
                  {/* Hover popover */}
                  <AnimatePresence>
                    {hoverDay === dayNum && count > 0 && (
                      <motion.div
                        initial={{ scale: 0.96, y: -4, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={SPRING}
                        className="glass-strong pointer-events-none absolute left-1/2 top-full z-40 mt-1 w-52 -translate-x-1/2 rounded-[16px] p-3"
                      >
                        {info?.planned.map((u) => (
                          <p key={`hp${u.id}`} className="mb-1 flex items-center gap-1.5 text-[11px] text-secondary">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {u.customerName} <span className="text-muted">· planned</span>
                          </p>
                        ))}
                        {info?.done.map((v) => (
                          <p key={`hd${v.id}`} className="mb-1 flex items-center gap-1.5 text-[11px] text-secondary">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5A5A5A]" /> Visit #{v.id} <span className="text-muted">· done</span>
                          </p>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Day agenda side-stack */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-[16px] bg-surface-1 p-4">
              <p className="metadata mb-2">Agenda · {fmtShort(selected)}</p>
              {!selectedInfo || (selectedInfo.done.length === 0 && selectedInfo.planned.length === 0) ? (
                <p className="text-[12px] text-muted">No visits on this day.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedInfo.planned.map((u) => (
                    <div key={`sp${u.id}`} className="flex items-center gap-2.5 text-[13px]">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <span className="font-semibold text-primary">{u.customerName}</span>
                      <span className="text-[11px] text-muted">planned · {u.city ?? u.region ?? ''}</span>
                    </div>
                  ))}
                  {selectedInfo.done.map((v) => (
                    <div key={`sd${v.id}`} className="flex items-center gap-2.5 text-[13px]">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#5A5A5A]" />
                      <span className="font-semibold text-primary">Visit #{v.id}</span>
                      <span className="truncate text-[11px] text-muted">{v.outcome ?? v.remarks ?? 'completed'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MapPanel({
  upcoming,
  overdue,
  customers,
}: {
  upcoming: UpcomingVisit[];
  overdue: OverdueItem[];
  customers: CustomerRow[];
}) {
  const [heat, setHeat] = useState(false);
  const [hoverPin, setHoverPin] = useState<string | null>(null);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  return (
    <div className="relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[20px] bg-canvas">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Heatmap overlay: india dot-grid colorized lime via mask */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: heat ? 0.85 : 0 }}
        transition={{ duration: 0.5 }}
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, rgba(198,255,51,0.75), rgba(74,222,128,0.35))',
          WebkitMaskImage: 'url(/heatmap-india.svg)',
          maskImage: 'url(/heatmap-india.svg)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />

      {/* Pins: overdue (red) */}
      {overdue.map((o, i) => {
        const p = pinPos(o.customerId);
        return (
          <motion.button
            key={o.customerId}
            type="button"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.2 + i * 0.06 }}
            onMouseEnter={() => setHoverPin(`o-${o.customerId}`)}
            onMouseLeave={() => setHoverPin(null)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-[10px] font-extrabold text-canvas shadow-e2">
              <MapPin size={12} />
            </span>
          </motion.button>
        );
      })}
      {/* Pins: planned (lime) */}
      {upcoming.map((u, i) => {
        const p = pinPos(`p-${u.customerId}-${u.id}`);
        return (
          <motion.button
            key={u.id}
            type="button"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: 0.35 + i * 0.06 }}
            onMouseEnter={() => setHoverPin(`p-${u.id}`)}
            onMouseLeave={() => setHoverPin(null)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-accent-glow">
              <MapPin size={12} />
            </span>
          </motion.button>
        );
      })}

      {/* Pin hover mini-cards */}
      <AnimatePresence>
        {overdue.map((o) => {
          if (hoverPin !== `o-${o.customerId}`) return null;
          const p = pinPos(o.customerId);
          const c = byId.get(o.customerId);
          return (
            <motion.div
              key={`hc-${o.customerId}`}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={SPRING}
              className="glass-strong absolute z-20 w-56 -translate-x-1/2 rounded-[16px] p-3"
              style={{ left: `${Math.min(70, Math.max(24, p.x))}%`, top: `${Math.min(72, p.y + 9)}%` }}
            >
              <p className="text-[13px] font-semibold text-primary">{o.name}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Last visit {fmtShort(o.lastVisitDate)} · <span className="text-danger">{o.pendingDays}d pending</span>
              </p>
              <a
                href={mapsSearchUrl(o.name, o.city, c?.companyAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"
              >
                Navigate <ExternalLink size={10} />
              </a>
            </motion.div>
          );
        })}
        {upcoming.map((u) => {
          if (hoverPin !== `p-${u.id}`) return null;
          const p = pinPos(`p-${u.customerId}-${u.id}`);
          const c = byId.get(u.customerId);
          return (
            <motion.div
              key={`hu-${u.id}`}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={SPRING}
              className="glass-strong absolute z-20 w-56 -translate-x-1/2 rounded-[16px] p-3"
              style={{ left: `${Math.min(70, Math.max(24, p.x))}%`, top: `${Math.min(72, p.y + 9)}%` }}
            >
              <p className="text-[13px] font-semibold text-primary">{u.customerName}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Planned {fmtShort(u.date)} · {u.city ?? ''}
              </p>
              <a
                href={mapsSearchUrl(u.customerName, u.city, c?.companyAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"
              >
                Navigate <ExternalLink size={10} />
              </a>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Heatmap toggle */}
      <button
        type="button"
        onClick={() => setHeat((h) => !h)}
        className={cn(
          'glass absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
          heat ? 'text-accent shadow-accent-glow' : 'text-secondary',
        )}
      >
        <Flame size={12} /> Heatmap {heat ? 'on' : 'off'}
      </button>

      <div className="glass absolute left-3 top-3 z-30 flex items-center gap-3 rounded-full px-3 py-1.5 text-[10px] font-semibold text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Planned</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> Overdue</span>
      </div>
    </div>
  );
}

/** E1. Calendar + Map hybrid split view. */
export default function CalendarMapView({
  visits,
  upcoming,
  overdue,
  customers,
}: {
  visits: VisitRow[];
  upcoming: UpcomingVisit[];
  overdue: OverdueItem[];
  customers: CustomerRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="card-e1 rounded-[24px] p-5 xl:col-span-7">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={15} className="text-accent" />
          <h3 className="text-[15px] font-semibold text-primary">Visit calendar</h3>
        </div>
        <CalendarPanel visits={visits} upcoming={upcoming} overdueCount={overdue.length} />
      </div>
      <div className="card-e1 rounded-[24px] p-5 xl:col-span-5">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={15} className="text-accent" />
          <h3 className="text-[15px] font-semibold text-primary">Field map</h3>
        </div>
        <MapPanel upcoming={upcoming} overdue={overdue} customers={customers} />
      </div>
    </div>
  );
}
