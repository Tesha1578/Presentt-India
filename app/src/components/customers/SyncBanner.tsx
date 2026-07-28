import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { fmtDateTime } from './utils';
import { useClassificationSync } from './use-sync';

interface SyncBannerProps {
  syncedAt: Date | string | null | undefined;
  totalCount: number;
  onViewDuplicates: () => void;
}

/**
 * Slim glass bar — accounting sync status + match-key explainer.
 * Slides down on mount; on manual sync the icon spins and counts pop in.
 */
export default function SyncBanner({ syncedAt, totalCount, onViewDuplicates }: SyncBannerProps) {
  const { sync, syncing, lastResult } = useClassificationSync();

  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-[20px] px-5 py-3.5"
    >
      {/* lime edge flash while syncing */}
      <AnimatePresence>
        {syncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 top-0 w-1 bg-accent shadow-accent-glow"
          />
        )}
      </AnimatePresence>

      <motion.span
        animate={syncing ? { rotate: 360 } : { rotate: 0 }}
        transition={
          syncing
            ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-dim text-accent"
      >
        <RefreshCw size={14} strokeWidth={1.75} />
      </motion.span>

      <p className="text-[13px] text-secondary">
        Synced with accounting software ·{' '}
        <span className="font-semibold text-primary tabular">{fmtDateTime(syncedAt)}</span> ·{' '}
        <span className="font-semibold text-primary tabular">{totalCount} customers</span>
      </p>

      <span
        title="Customers are never merged by name alone — same name with a different GSTIN or address is a separate customer."
        className="inline-flex cursor-help items-center rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent"
      >
        Matched by GSTIN + Address
      </span>

      <AnimatePresence>
        {lastResult && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="inline-flex items-center rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-secondary tabular"
          >
            {lastResult.reclassified} reclassified · 0 duplicates
          </motion.span>
        )}
      </AnimatePresence>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="rounded-full bg-surface-3 px-3.5 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-accent disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={onViewDuplicates}
          className="rounded-full bg-surface-3 px-3.5 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          View duplicates report
        </button>
      </div>
    </motion.div>
  );
}
