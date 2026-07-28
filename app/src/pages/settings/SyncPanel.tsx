import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CloudDownload, Fingerprint, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc-shim';
import { useToasts } from '@/components/Toasts';
import GlassModal from '@/components/GlassModal';
import { EASE } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';

interface SyncLogEntry {
  id: number;
  at: string;
  added: number;
  updated: number;
  skipped: number;
}

/** Panel 6 — accounting sync status, match-key explainer, sync log. */
export default function SyncPanel() {
  const { push } = useToasts();
  const [interval, setSyncInterval] = useState('1h');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dupesOpen, setDupesOpen] = useState(false);
  const [log, setLog] = useState<SyncLogEntry[]>([
    { id: 3, at: 'Today · 06:00', added: 2, updated: 14, skipped: 1 },
    { id: 2, at: 'Yesterday · 06:00', added: 0, updated: 31, skipped: 0 },
    { id: 1, at: '2 days ago · 06:00', added: 5, updated: 22, skipped: 3 },
  ]);

  const dupes = trpc.customers.duplicatesReport.useQuery(undefined, { enabled: dupesOpen });

  const syncNow = () => {
    if (syncing) return;
    setSyncing(true);
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 2400);
      setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) requestAnimationFrame(tick);
      else {
        setSyncing(false);
        setLog((cur) => [
          { id: Date.now(), at: 'Just now', added: 1, updated: 9, skipped: 0 },
          ...cur,
        ]);
        push({
          type: 'payment-received',
          title: 'Accounting sync complete',
          body: '1 customer added, 9 updated, 0 skipped — matched on GSTIN + Company Address.',
        });
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <div className="space-y-6">
      {/* status card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="card-e1 rounded-[24px] p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent-dim text-accent">
            <CloudDownload size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[15px] font-semibold text-primary">Tally / Zoho Books</h4>
              <span className="rounded-full bg-[rgba(74,222,128,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                Connected
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">Last sync today 06:00 · next scheduled in 42 min</p>
          </div>
          <div className="flex items-center gap-2">
            {(['15m', '1h', '6h', 'daily'] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSyncInterval(i)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  interval === i ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-muted hover:text-secondary',
                )}
              >
                {i}
              </button>
            ))}
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="ml-2 flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[12px] font-semibold text-accent-foreground hover:shadow-accent-glow disabled:opacity-70"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {syncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(198,255,51,0.5)' }}
                />
              </div>
              <p className="mt-1.5 text-right text-[11px] text-muted tabular">{progress}%</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* match-key explainer */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: EASE }}
        className="card-e1 rounded-[24px] border-l-2 border-l-accent p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-accent-dim text-accent">
            <Fingerprint size={20} strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <h4 className="text-[15px] font-semibold text-primary">Customer match key</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
              Customers match on <span className="font-semibold text-accent">GSTIN + Company Address — never name
              alone.</span> Same name with different GSTIN or address remains a separate customer.
            </p>
            <button
              type="button"
              onClick={() => setDupesOpen(true)}
              className="mt-3 rounded-full bg-surface-3 px-4 py-2 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent-dim hover:text-accent"
            >
              View duplicates report
            </button>
          </div>
        </div>
      </motion.div>

      {/* sync log */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12, ease: EASE }}
        className="card-e1 rounded-[24px] p-6"
      >
        <h4 className="text-[15px] font-semibold text-primary">Sync log</h4>
        <div className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <motion.div
                key={entry.id}
                layout="position"
                initial={{ opacity: 0, y: -10, backgroundColor: 'rgba(198,255,51,0.08)' }}
                animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(198,255,51,0)' }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex items-center gap-3 rounded-[14px] bg-surface-2 px-4 py-3"
              >
                <CheckCircle2 size={15} className="shrink-0 text-success" strokeWidth={1.75} />
                <span className="text-[12px] font-semibold text-primary">{entry.at}</span>
                <span className="ml-auto flex gap-3 text-[11px] text-muted tabular">
                  <span><span className="text-accent">{entry.added}</span> added</span>
                  <span><span className="text-info">{entry.updated}</span> updated</span>
                  <span><span className="text-warning">{entry.skipped}</span> skipped</span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* duplicates report modal */}
      <GlassModal open={dupesOpen} onClose={() => setDupesOpen(false)} title="Duplicates report" maxWidth={560}>
        <p className="text-[13px] leading-relaxed text-secondary">
          Same-name customers kept <span className="font-semibold text-primary">separate</span> because their GSTIN or
          address differs — this is expected, not a duplicate.
        </p>
        <div className="no-scrollbar mt-4 max-h-[300px] space-y-2 overflow-y-auto">
          {dupes.isLoading && (
            <>
              <div className="shimmer-base h-14 rounded-[14px]" />
              <div className="shimmer-base h-14 rounded-[14px]" />
            </>
          )}
          {dupes.data?.length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">No same-name customer groups found.</p>
          )}
          {dupes.data?.map((group) => (
            <div key={group.name} className="rounded-[14px] bg-surface-2 p-3.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                {group.name} · match key: {group.matchKey}
              </p>
              {group.customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 text-[12px]">
                  <span className="font-medium text-primary">{c.id}</span>
                  <span className="truncate text-muted tabular">
                    {c.gstin ?? 'no GSTIN'} · {c.city ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </GlassModal>
    </div>
  );
}
