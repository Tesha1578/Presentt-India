import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterDef {
  id: string;
  label: string;
  options: string[];
}

interface FilterPillsProps {
  filters: FilterDef[];
  selected: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  className?: string;
}

/** Floating glass filter pill row: elastic activation, spring dropdowns, removable chips. */
export default function FilterPills({ filters, selected, onChange, className }: FilterPillsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const activeEntries = Object.entries(selected).flatMap(([fid, vals]) =>
    vals.map((v) => ({ fid, v })),
  );

  const toggle = (fid: string, val: string) => {
    const cur = selected[fid] ?? [];
    const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    onChange({ ...selected, [fid]: next });
  };

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass no-scrollbar relative z-30 flex items-center gap-2 overflow-x-auto rounded-full p-2',
        className,
      )}
    >
      <AnimatePresence>
        {activeEntries.map(({ fid, v }) => (
          <motion.button
            key={`${fid}-${v}`}
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            onClick={() => toggle(fid, v)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[12px] font-semibold text-accent"
          >
            {v}
            <X size={12} />
          </motion.button>
        ))}
      </AnimatePresence>

      {filters.map((f) => {
        const count = selected[f.id]?.length ?? 0;
        const active = count > 0;
        return (
          <div key={f.id} className="relative shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              animate={active ? { scale: [0.94, 1.04, 1] } : {}}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              onClick={() => setOpenId(openId === f.id ? null : f.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                active
                  ? 'bg-accent-dim text-accent shadow-accent-glow'
                  : 'bg-surface-2 text-secondary hover:text-primary',
              )}
            >
              {active ? `${f.label} (${count})` : f.label}
              <ChevronDown size={13} className={cn('transition-transform', openId === f.id && 'rotate-180')} />
            </motion.button>
            <AnimatePresence>
              {openId === f.id && (
                <motion.div
                  initial={{ scale: 0.96, y: -6, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.96, y: -6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="glass-strong absolute left-0 top-full z-40 mt-2 w-52 rounded-[20px] p-2"
                >
                  {f.options.map((opt) => {
                    const checked = selected[f.id]?.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(f.id, opt)}
                        className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
                      >
                        {opt}
                        {checked && <Check size={14} className="text-accent" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onChange({ ...selected, [f.id]: [] })}
                    className="mt-1 w-full rounded-[12px] px-3 py-2 text-left text-[12px] font-semibold text-muted transition-colors hover:text-primary"
                  >
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}
