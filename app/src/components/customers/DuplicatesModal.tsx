import { motion } from 'framer-motion';
import { CheckCircle2, Copy } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import type { DuplicatesReport } from './utils';

interface DuplicatesModalProps {
  open: boolean;
  onClose: () => void;
  groups: DuplicatesReport;
}

/**
 * Duplicates report — same name, different GSTIN/address = SEPARATE customers.
 * Makes the never-merge-by-name rule (§10.2) tangible.
 */
export default function DuplicatesModal({ open, onClose, groups }: DuplicatesModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} title="Duplicates Report" maxWidth={680}>
      <p className="mb-5 text-[13px] leading-relaxed text-secondary">
        Customers are matched from the accounting sync by{' '}
        <span className="font-semibold text-accent">GSTIN + Company Address</span> — never by name
        alone. These same-name records have different match keys and are verified separate customers.
      </p>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          No same-name customer groups found in the current sync.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g, gi) => (
            <motion.div
              key={g.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.09, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[20px] bg-surface-2 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-primary">
                  <Copy size={14} strokeWidth={1.75} className="text-muted" />
                  {g.name}
                  <span className="text-[12px] font-normal text-muted">× {g.customers.length}</span>
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}
                >
                  <CheckCircle2 size={12} strokeWidth={2} />
                  Verified separate
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.customers.map((c) => (
                  <div key={c.id} className="rounded-[16px] bg-surface-1 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted tabular">
                      {c.id} · {[c.city, c.region].filter(Boolean).join(', ')}
                    </p>
                    <p className="mt-2 text-[13px] font-semibold text-primary tabular">
                      GSTIN <span className="text-accent">{c.gstin}</span>
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-secondary">{c.companyAddress}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted">
                Match key: {g.matchKey} — both records are kept as independent customers.
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </GlassModal>
  );
}
