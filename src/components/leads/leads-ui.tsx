import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Lead, LeadActivity, Meeting, Quotation, User } from '@contracts/types';
import {
  LeadStageLabels,
  LeadStatusLabels,
  PriorityLabels,
} from '@contracts/constants';
import type { LeadStage, LeadStatus, Priority } from '@contracts/types';

export type { Lead, LeadActivity, Meeting, Quotation, User, LeadStage, LeadStatus, Priority };
export { LeadStageLabels, LeadStatusLabels, PriorityLabels };

/** Full lead payload returned by trpc.leads.byId. */
export type LeadDetail = Lead & {
  owner: User | null;
  lastUpdatedBy?: User | null;
  activities: (LeadActivity & { updatedBy: User })[];
  quotations: Quotation[];
  meetings: Meeting[];
};

export const STAGE_ORDER: LeadStage[] = [
  'new_lead',
  'enquiry_visit',
  'quotation_negotiation',
  'order_confirmed',
];

export const STAGE_COLOR: Record<LeadStage, string> = {
  new_lead: '#6AB8FF',
  enquiry_visit: '#FFB224',
  quotation_negotiation: '#C6FF33',
  order_confirmed: '#4ADE80',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  high: '#FF5C5C',
  medium: '#FFB224',
  low: '#8A8A8A',
};

export const SOURCE_OPTIONS = ['Referral', 'Website', 'Exhibition', 'Cold Call'];
export const REGION_OPTIONS = ['West', 'North', 'South', 'East'];

/** Pill badge — dot + 11px uppercase label, tinted bg at 12% opacity. */
export function LeadStageBadge({
  stage,
  invalid,
  className,
}: {
  stage: LeadStage | null;
  invalid?: boolean;
  className?: string;
}) {
  const color = invalid ? '#FF5C5C' : STAGE_COLOR[stage ?? 'new_lead'];
  const label = invalid
    ? LeadStatusLabels.invalid_customer
    : LeadStageLabels[stage ?? 'new_lead'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
        className,
      )}
      style={{ color, backgroundColor: `${color}1F` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function PriorityChip({ priority, className }: { priority: Priority | null; className?: string }) {
  const p = priority ?? 'medium';
  const color = PRIORITY_COLOR[p];
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', className)}
      style={{ color, backgroundColor: `${color}1F` }}
    >
      {PriorityLabels[p]}
    </span>
  );
}

/** Relative time: "2h ago", "3d ago". */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  const secs = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 30) return `${Math.floor(secs / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Indian-grouped currency: ₹12,40,000 · compact ₹12.4L at ≥ ₹10L */
export function formatINR(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (compact && Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  const s = Math.round(Math.abs(n)).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${n < 0 ? '-' : ''}₹${grouped}`;
}

/** Lime substring highlight for search matches. */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.trim().toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < text.length) {
    const hit = lower.indexOf(q, i);
    if (hit === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (hit > i) parts.push(text.slice(i, hit));
    parts.push(
      <span key={k++} className="rounded-[4px] bg-accent-dim px-0.5 text-accent">
        {text.slice(hit, hit + q.length)}
      </span>,
    );
    i = hit + q.length;
  }
  return <>{parts}</>;
}

/** Input chrome per design: r-16, 1px 8%-white border, lime glow ring on focus. */
export const inputCls =
  'w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-surface-2 px-4 py-2.5 text-[14px] text-primary placeholder:text-muted outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_2px_rgba(198,255,51,0.28)]';

/** Animated shimmer block. */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn('shimmer-base rounded-[20px]', className)} />;
}

/** Primary lime pill button with spring press. */
export function LimeButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow disabled:opacity-60',
        className,
      )}
      {...(props as object)}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-secondary transition-colors hover:bg-surface-3 hover:text-primary',
        className,
      )}
      {...(props as object)}
    >
      {children}
    </motion.button>
  );
}
