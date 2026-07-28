import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from '@/components/Avatar';
import QuickActionDock from '@/components/QuickActionDock';
import { cn } from '@/lib/utils';
import type { Lead } from '@contracts/types';
import {
  Highlight,
  LeadStageBadge,
  PriorityChip,
  timeAgo,
} from '@/components/leads/leads-ui';

interface LeadCardProps {
  lead: Lead;
  query?: string;
  delay?: number;
  className?: string;
}

/** Lead RecordCard: identity → badges → metadata → hover-reveal quick dock. */
export default function LeadCard({ lead, query = '', delay = 0, className }: LeadCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const invalid = lead.status === 'invalid_customer';

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigate(`/leads/${lead.id}`)}
      className={cn(
        'card-e1 relative cursor-pointer overflow-hidden rounded-[24px] p-5',
        invalid && 'shadow-[inset_3px_0_0_0_rgba(255,92,92,0.65)]',
        className,
      )}
    >
      {/* Row 1 — identity */}
      <div className="flex items-center gap-3.5">
        <Avatar name={lead.companyName ?? `Lead ${lead.id}`} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-primary">
            <Highlight text={lead.companyName ?? 'Unnamed lead'} query={query} />
          </p>
          <p className="truncate text-[13px] text-muted">
            <Highlight
              text={[lead.contactPerson, lead.designation].filter(Boolean).join(' · ') || 'No contact yet'}
              query={query}
            />
          </p>
        </div>
        <PriorityChip priority={lead.priority} />
      </div>

      {/* Row 2 — badges */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${lead.stage}-${lead.status}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
          >
            <LeadStageBadge stage={lead.stage} invalid={invalid} />
          </motion.span>
        </AnimatePresence>
        {lead.source && (
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
            {lead.source}
          </span>
        )}
      </div>

      {/* Row 3 — metadata grid */}
      <div className="mt-3.5 grid grid-cols-[1fr_auto] items-end gap-2 text-[12px] text-muted">
        <div className="min-w-0">
          <p className="truncate">
            <span className="font-semibold uppercase tracking-[0.06em]">Last Activity</span>
            {' · '}
            {lead.lastActivitySummary ?? 'No activity yet'}
            {lead.lastActivityAt && <span> · {timeAgo(lead.lastActivityAt)}</span>}
          </p>
          <p className="mt-1 truncate">
            {[lead.city, lead.region].filter(Boolean).join(' · ') || 'Region unknown'}
          </p>
        </div>
        <span className="tabular">upd {timeAgo(lead.updatedAt)}</span>
      </div>

      {/* Row 4 — hover-reveal quick dock */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3.5">
              <QuickActionDock
                phone={lead.phone ?? undefined}
                email={lead.email ?? undefined}
                mapsLink={lead.googleMapsUrl ?? undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
