import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, TREND_LABELS } from './utils';

export interface CustomerFilters {
  region?: string;
  category?: string;
  salesTrend?: string;
}

const REGIONS = ['West', 'North', 'South', 'East'];
const CATEGORIES = ['small', 'medium', 'large'];
const TRENDS = ['increasing', 'stable', 'decreasing'];

interface PillProps {
  label: string;
  value?: string;
  options: { key: string; label: string }[];
  onSelect: (key?: string) => void;
}

function FilterPill({ label, value, options, onSelect }: PillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const activeLabel = value ? options.find((o) => o.key === value)?.label : undefined;

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        animate={{ scale: open ? 1.04 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors',
          value
            ? 'bg-accent-dim text-accent shadow-accent-glow'
            : 'bg-surface-2 text-secondary hover:text-primary',
        )}
      >
        {activeLabel ?? label}
        {value && (
          <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-canvas">1</span>
        )}
        <ChevronDown size={13} strokeWidth={2} className={cn('transition-transform', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ scale: 0.96, y: -6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-strong absolute left-0 top-full z-40 mt-2 w-48 rounded-[16px] p-1.5"
          >
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  onSelect(o.key === value ? undefined : o.key);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[13px] text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
              >
                {o.label}
                {o.key === value && <Check size={14} strokeWidth={2.5} className="text-accent" />}
              </button>
            ))}
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(undefined);
                  setOpen(false);
                }}
                className="mt-1 w-full rounded-[10px] border-t border-line px-3 py-2 text-left text-[12px] font-semibold text-muted transition-colors hover:text-danger"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterBarProps {
  filters: CustomerFilters;
  onChange: (f: CustomerFilters) => void;
}

/** Floating filter pill row — All · Region · Customer Category · Sales Trend. */
export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const activeChips: { key: keyof CustomerFilters; label: string }[] = [];
  if (filters.region) activeChips.push({ key: 'region', label: filters.region });
  if (filters.category) activeChips.push({ key: 'category', label: CATEGORY_LABELS[filters.category] ?? filters.category });
  if (filters.salesTrend) activeChips.push({ key: 'salesTrend', label: TREND_LABELS[filters.salesTrend] ?? filters.salesTrend });

  const hasFilters = activeChips.length > 0;

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex flex-wrap items-center gap-2 rounded-full px-3 py-2"
    >
      <motion.button
        type="button"
        onClick={() => onChange({})}
        whileTap={{ scale: 0.94 }}
        className={cn(
          'rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors',
          !hasFilters ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-2 text-secondary hover:text-primary',
        )}
      >
        All
      </motion.button>

      <FilterPill
        label="Region"
        value={filters.region}
        options={REGIONS.map((r) => ({ key: r, label: r }))}
        onSelect={(k) => onChange({ ...filters, region: k })}
      />
      <FilterPill
        label="Category"
        value={filters.category}
        options={CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] ?? c }))}
        onSelect={(k) => onChange({ ...filters, category: k })}
      />
      <FilterPill
        label="Sales Trend"
        value={filters.salesTrend}
        options={TRENDS.map((t) => ({ key: t, label: TREND_LABELS[t] ?? t }))}
        onSelect={(k) => onChange({ ...filters, salesTrend: k })}
      />

      {/* Active filters as removable chips */}
      <AnimatePresence>
        {activeChips.map((chip) => (
          <motion.span
            key={chip.key}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 py-1.5 pl-3 pr-2 text-[11px] font-semibold text-secondary"
          >
            {chip.label}
            <button
              type="button"
              aria-label={`Remove ${chip.label} filter`}
              onClick={() => onChange({ ...filters, [chip.key]: undefined })}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors hover:text-danger"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
