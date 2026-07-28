import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from '@/components/Avatar';
import StageBadge from '@/components/StageBadge';
import QuickActionDock from '@/components/QuickActionDock';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/mock-data';

interface RecordCardProps {
  lead: Lead;
  delay?: number;
  className?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  High: '#FF5C5C',
  Medium: '#FFB224',
  Low: '#8A8A8A',
};

/** Lead/customer record card: identity → badges → metadata → hover-reveal quick dock. */
export default function RecordCard({ lead, delay = 0, className }: RecordCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigate(`/leads/${lead.id}`)}
      className={cn('card-e1 cursor-pointer rounded-[24px] p-5', className)}
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={lead.companyName ?? lead.id} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-primary">{lead.companyName}</p>
          <p className="truncate text-[13px] text-muted">
            {[lead.contactPerson, lead.designation].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: PRIORITY_COLOR[lead.priority], backgroundColor: `${PRIORITY_COLOR[lead.priority]}1F` }}
        >
          {lead.priority}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <StageBadge stage={lead.stage} invalid={lead.status === 'InvalidCustomer'} />
        {lead.source && (
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-secondary">
            {lead.source}
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between text-[12px] text-muted">
        <span className="tabular">{lead.lastActivitySummary ?? 'No activity yet'}</span>
        <span>{[lead.city, lead.region].filter(Boolean).join(' · ')}</span>
      </div>

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
                phone={lead.phone}
                email={lead.email}
                mapsLink={lead.googleMapsLocation?.link}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
