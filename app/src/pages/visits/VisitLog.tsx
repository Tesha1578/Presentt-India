import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mic, Plus } from 'lucide-react';
import AnimatedTimeline from '@/components/AnimatedTimeline';
import type { TimelineEntry } from '@/components/AnimatedTimeline';
import EmptyState from '@/components/EmptyState';
import { fmtDate } from './shared';
import type { CustomerRow, VisitRow } from './shared';

/** E3. Visit Log — reverse-chrono animated timeline of every visit record. */
export default function VisitLog({
  visits,
  customers,
  onLogVisit,
}: {
  visits: VisitRow[];
  customers: CustomerRow[];
  onLogVisit: () => void;
}) {
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const entries: TimelineEntry[] = useMemo(() => {
    const sorted = [...visits].sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return db.getTime() - da.getTime();
    });
    return sorted.map((v) => {
      const customer = byId.get(v.customerId);
      const attachments = [...(v.photos ?? []), ...(v.voiceNotes ?? []).map((n) => `${n}`)];
      return {
        id: String(v.id),
        icon: v.voiceNotes && v.voiceNotes.length > 0 ? Mic : MapPin,
        iconColor: v.outcome === 'Payment collected' ? '#4ADE80' : '#C6FF33',
        title: customer?.name ?? v.customerId,
        body: [v.outcome ? `Outcome: ${v.outcome}` : null, v.remarks].filter(Boolean).join(' — ') || undefined,
        date: fmtDate(v.date),
        activity: 'Visit',
        remarks: customer ? `${customer.city ?? ''} · ${customer.region ?? ''}` : undefined,
        updatedBy: v.salesRep?.name ?? undefined,
        attachments: attachments.length ? attachments : undefined,
      };
    });
  }, [visits, byId]);

  return (
    <div className="card-e1 rounded-[24px] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-primary">Visit log</h3>
          <p className="mt-0.5 text-[12px] text-muted tabular">{visits.length} visits recorded</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onLogVisit}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          <Plus size={14} /> Log Visit
        </motion.button>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          useIllustration
          title="No visits logged yet"
          body="Log your first field visit to start the timeline."
          ctaLabel="Log Visit"
          onCta={onLogVisit}
        />
      ) : (
        <AnimatedTimeline entries={entries} />
      )}
    </div>
  );
}
