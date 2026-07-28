import type { RouterOutputs } from '@/lib/data-types';

export type { RouterOutputs };
import type { QueryCategory, QueryStatus } from '@contracts/types';
import { QueryCategoryLabels, QueryStatusLabels } from '@contracts/constants';

export type Kanban = RouterOutputs['queries']['kanban'];
export type KanbanQuery = Kanban['open'][number];
export type Reminder = RouterOutputs['queries']['unresolvedReminders'][number];
export type CustomerRow = RouterOutputs['customers']['list'][number];
export type CustomerQuery = RouterOutputs['queries']['byCustomer'][number];

export { QueryCategoryLabels, QueryStatusLabels };

export const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];
export const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

export const COLUMNS: { id: QueryStatus; label: string; color: string }[] = [
  { id: 'open', label: 'Open', color: '#FF5C5C' },
  { id: 'in_progress', label: 'In Progress', color: '#6AB8FF' },
  { id: 'resolved', label: 'Resolved', color: '#4ADE80' },
];

/** Category chip tints (queries.md §B: Quality red, Delivery amber, Price lime, Communication info, Others grey). */
export const CATEGORY_STYLE: Record<QueryCategory, { color: string; bg: string }> = {
  quality: { color: '#FF5C5C', bg: 'rgba(255,92,92,0.12)' },
  delivery: { color: '#FFB224', bg: 'rgba(255,178,36,0.12)' },
  price: { color: '#C6FF33', bg: 'rgba(198,255,51,0.12)' },
  communication: { color: '#6AB8FF', bg: 'rgba(106,184,255,0.12)' },
  others: { color: '#8A8A8A', bg: 'rgba(138,138,138,0.12)' },
};

export const PRIORITY_DOT: Record<string, string> = {
  high: '#FF5C5C',
  medium: '#FFB224',
  low: '#8A8A8A',
};

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function qRef(id: number): string {
  return `#Q-${id}`;
}

/** Draft AI suggested solution per category (streamed in the New Query modal). */
export const AI_SOLUTION_DRAFTS: Record<QueryCategory, string> = {
  quality:
    'Share the QC report for the affected batch, issue a replacement under warranty, and schedule a vendor audit to prevent recurrence.',
  delivery:
    'Expedite via an alternate transporter, share a live tracking link with the customer, and offer partial dispatch of ready stock.',
  price:
    'Share the value-differentiation sheet, hold the current price, and offer bundled logistics as a goodwill concession.',
  communication:
    'Schedule a review call within 24 hours, assign a single point of contact, and send a written summary of agreed next steps.',
  others:
    'Acknowledge within 24 hours, log the full context, and propose a follow-up visit this week to close the loop.',
};

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
