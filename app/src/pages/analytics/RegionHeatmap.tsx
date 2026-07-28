import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';
import CountUp from '@/components/analytics/CountUp';
import { EASE, heatColor, inrCompact } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';

export interface RegionRow {
  region: string;
  value: number;
  delta: number | null;
}
export interface CityRow {
  city: string;
  region: string;
  customers: number;
  recentVisits: number;
  pending: number;
}

type Metric = 'revenue' | 'visits' | 'queries';

/** Approximate geographic anchors in the 1200×1200 heatmap space. */
const REGION_ANCHORS: Record<string, [number, number]> = {
  West: [330, 640],
  North: [560, 240],
  South: [600, 980],
  East: [880, 560],
  Unassigned: [600, 600],
};

interface RegionHeatmapProps {
  regions: RegionRow[];
  cities: CityRow[];
  queriesByRegion: Record<string, number>;
}

/** Section H — region performance bars + colorized India dot-grid heatmap with metric toggles. */
export default function RegionHeatmap({ regions, cities, queriesByRegion }: RegionHeatmapProps) {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [svg, setSvg] = useState<string>('');
  const [hoverCity, setHoverCity] = useState<CityRow | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/heatmap-india.svg')
      .then((r) => r.text())
      .then((t) => {
        if (alive) setSvg(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // visits per region (from city rows)
  const visitsByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cities) map[c.region] = (map[c.region] ?? 0) + c.recentVisits;
    return map;
  }, [cities]);

  const metricByRegion = useMemo(() => {
    const raw: Record<string, number> = {};
    if (metric === 'revenue') for (const r of regions) raw[r.region] = r.value;
    else if (metric === 'visits') Object.assign(raw, visitsByRegion);
    else Object.assign(raw, queriesByRegion);
    const max = Math.max(...Object.values(raw), 1);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = v / max;
    return out;
  }, [metric, regions, visitsByRegion, queriesByRegion]);

  // Colorize each dot by its nearest region anchor's metric value.
  const coloredSvg = useMemo(() => {
    if (!svg) return '';
    const colored = svg.replace(
      /<circle class="cell" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#2A2A2A"\/>/g,
      (_m, cx: string, cy: string, r: string) => {
        const x = Number(cx);
        const y = Number(cy);
        let bestRegion = 'Unassigned';
        let bestDist = Number.POSITIVE_INFINITY;
        for (const [region, anchor] of Object.entries(REGION_ANCHORS)) {
          const d = Math.hypot(x - anchor[0], y - anchor[1]);
          if (d < bestDist) {
            bestDist = d;
            bestRegion = region;
          }
        }
        const base = metricByRegion[bestRegion] ?? 0;
        // falloff with distance so the map stays organic
        const t = base * Math.max(0.35, 1 - bestDist / 900);
        return `<circle class="cell" cx="${cx}" cy="${cy}" r="${r}" fill="${heatColor(t)}"/>`;
      },
    );
    return colored.replace('</svg>', '<style>.cell{transition:fill 400ms ease}</style></svg>');
  }, [svg, metricByRegion]);

  const maxValue = Math.max(...regions.map((r) => r.value), 1);
  const topCities = cities.slice(0, 10);

  return (
    <ChartCard
      title="Region Performance + City Heatmap"
      footer={
        <span className="text-[11px] text-muted">
          Dots colorized grey → lime by {metric === 'revenue' ? 'revenue density' : metric === 'visits' ? 'recent visit density' : 'open query density'} · bubbles sized by customer count
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* region bars */}
        <div className="space-y-4">
          {regions.map((r, i) => {
            const leader = i === 0;
            return (
              <div key={r.region}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={cn('text-[13px] font-semibold', leader ? 'text-accent' : 'text-secondary')}>
                    {r.region}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-primary tabular">{inrCompact(r.value)}</span>
                    {r.delta !== null && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular',
                          r.delta >= 0 ? 'bg-accent-dim text-accent' : 'bg-[rgba(255,92,92,0.12)] text-danger',
                        )}
                      >
                        {r.delta >= 0 ? '▲' : '▼'} {Math.abs(r.delta)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-3.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full origin-left rounded-full"
                    style={{
                      background: leader ? '#C6FF33' : '#3A3A3A',
                      boxShadow: leader ? '0 0 16px rgba(198,255,51,0.35)' : undefined,
                    }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: Math.max(r.value / maxValue, 0.02) }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
                  />
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[11px] leading-relaxed text-muted">
            Current 3 months vs previous 3 months. Leader highlighted in lime.
          </p>
        </div>

        {/* heatmap */}
        <div>
          <div className="mb-3 flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {(
              [
                ['revenue', 'Revenue'],
                ['visits', 'Visits'],
                ['queries', 'Queries'],
              ] as [Metric, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  metric === key ? 'bg-accent-dim text-accent' : 'text-muted hover:text-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative mx-auto aspect-square w-full max-w-[380px] overflow-hidden rounded-[24px] bg-surface-2 p-3"
            dangerouslySetInnerHTML={{ __html: coloredSvg }}
          />
          {/* city bubbles */}
          <div className="relative mt-4 flex flex-wrap items-end gap-2.5">
            {topCities.map((c, i) => {
              const size = 14 + Math.min(26, c.customers * 2.4);
              return (
                <motion.button
                  key={c.city}
                  type="button"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26, delay: i * 0.05 }}
                  onMouseEnter={() => setHoverCity(c)}
                  onMouseLeave={() => setHoverCity(null)}
                  className="relative flex items-center justify-center rounded-full font-semibold text-canvas"
                  style={{
                    width: size + 18,
                    height: size + 18,
                    backgroundColor: heatColor(0.35 + Math.min(c.customers / 12, 0.65)),
                    fontSize: 10,
                  }}
                  aria-label={c.city}
                >
                  {c.city.slice(0, 2).toUpperCase()}
                </motion.button>
              );
            })}
            {hoverCity && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="glass-strong absolute -top-2 left-0 z-30 w-[240px] -translate-y-full rounded-[16px] p-3.5"
              >
                <p className="text-[13px] font-semibold text-primary">
                  {hoverCity.city} <span className="text-[11px] font-medium text-muted">· {hoverCity.region}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[14px] font-bold text-primary tabular">
                      <CountUp value={hoverCity.customers} />
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">customers</p>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-accent tabular">{hoverCity.recentVisits}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">visits 45d</p>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-warning tabular">{hoverCity.pending}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">pending</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted">Bubble initials: {topCities.map((c) => `${c.city.slice(0, 2).toUpperCase()}=${c.city}`).join(' · ') || '—'}</p>
        </div>
      </div>
    </ChartCard>
  );
}
