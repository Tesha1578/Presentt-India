import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Copy, ExternalLink, FileText, MapPin, Navigation, Plus, Send, Sparkles, Trash2,
} from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { Quotation, QuotationItem, QuotationStatus } from '@contracts/types';
import { QuotationStatusLabels } from '@contracts/constants';
import { trpc } from '@/lib/trpc-shim';
import {
  GhostButton,
  LimeButton,
  formatDate,
  formatINR,
  inputCls,
} from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';
import { PanelEmpty } from '@/pages/leads/profile/TimelinePanels';

/* ------------------------------------------------------------------- E7 Maps */

export function MapsPanel({ lead, onRelocated }: { lead: LeadDetail; onRelocated: () => void }) {
  const [picking, setPicking] = useState(false);
  const { push } = useToasts();
  const update = trpc.leads.update.useMutation({
    onSuccess: () => {
      onRelocated();
      push({ type: 'ai-insight', title: 'Location updated', body: 'Pin relocated and saved to the lead.' });
    },
  });

  const hasPin = lead.lat != null && lead.lng != null;
  const mapsUrl = lead.googleMapsUrl ?? (hasPin ? `https://maps.google.com/?q=${lead.lat},${lead.lng}` : null);
  const pinPos = hasPin
    ? {
        left: `${Math.min(96, Math.max(4, (((lead.lng ?? 80) - 68) / 30) * 100)).toFixed(1)}%`,
        top: `${Math.min(96, Math.max(4, (1 - ((lead.lat ?? 22) - 8) / 28) * 100)).toFixed(1)}%`,
      }
    : { left: '50%', top: '46%' };

  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!picking) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const lng = Math.round((68 + x * 30) * 1e5) / 1e5;
    const lat = Math.round((8 + (1 - y) * 28) * 1e5) / 1e5;
    setPicking(false);
    update.mutate({ id: lead.id, lat, lng, googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}` });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-[14px] text-secondary">
          {lead.companyAddress ?? (hasPin ? `${lead.lat}, ${lead.lng}` : 'No address on record')}
        </p>
        <div className="flex gap-2">
          {mapsUrl && (
            <GhostButton onClick={() => window.open(mapsUrl, '_blank')}>
              Open in Google Maps <ExternalLink size={13} />
            </GhostButton>
          )}
          {mapsUrl && (
            <GhostButton
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lead.lat ?? ''},${lead.lng ?? ''}`, '_blank')}
            >
              <Navigation size={13} /> Navigate
            </GhostButton>
          )}
          <LimeButton onClick={() => setPicking((p) => !p)}>
            <MapPin size={14} /> {picking ? 'Cancel pick' : 'Pick on map'}
          </LimeButton>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Lead location map"
        onClick={pick}
        className={cn(
          'relative h-[380px] w-full overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.06)]',
          picking && 'cursor-crosshair shadow-accent-glow',
        )}
        style={{
          backgroundColor: '#0b0d0b',
          backgroundImage:
            'linear-gradient(rgba(198,255,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(198,255,51,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), radial-gradient(500px at 55% 45%, rgba(198,255,51,0.08), transparent)',
          backgroundSize: '96px 96px, 96px 96px, 24px 24px, 24px 24px, 100% 100%',
        }}
      >
        {/* faux roads */}
        <div className="absolute left-0 right-0 top-[38%] h-[3px] -rotate-3 bg-[rgba(255,255,255,0.06)]" />
        <div className="absolute bottom-0 left-[30%] top-0 w-[3px] rotate-6 bg-[rgba(255,255,255,0.06)]" />
        <div className="absolute left-0 right-0 top-[68%] h-[2px] rotate-2 bg-[rgba(255,255,255,0.05)]" />

        <motion.span
          key={`${pinPos.left}-${pinPos.top}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={pinPos}
        >
          <span className="relative block">
            <MapPin size={30} className="text-accent" fill="rgba(198,255,51,0.3)" />
            <motion.span
              className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 rounded-full bg-accent/40"
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          </span>
        </motion.span>

        {!hasPin && (
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-3/80 px-3.5 py-1.5 text-[12px] text-muted">
            Approximate position — use “Pick on map” to set the exact pin
          </span>
        )}
        {picking && (
          <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-[12px] font-semibold text-accent-foreground">
            Click anywhere to relocate the pin
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- E8 Quotations */

const STATUS_COLOR: Record<QuotationStatus, string> = {
  draft: '#8A8A8A',
  sent: '#6AB8FF',
  negotiation: '#FFB224',
  accepted: '#4ADE80',
  rejected: '#FF5C5C',
};

export interface LocalQuote {
  id: number | string;
  number: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  validUntil: Date | null;
  createdAt: Date;
  aiGenerated: boolean;
}

export function toLocalQuote(q: Quotation): LocalQuote {
  return {
    id: q.id,
    number: q.number,
    items: q.items,
    subtotal: q.subtotal,
    tax: q.tax,
    total: q.total,
    status: q.status,
    validUntil: q.validUntil ? new Date(q.validUntil) : null,
    createdAt: new Date(q.createdAt),
    aiGenerated: q.aiGenerated,
  };
}

export function QuotationsPanel({ lead }: { lead: LeadDetail }) {
  const utils = trpc.useUtils();
  const { push: toastPush } = useToasts();
  const createQuote = trpc.quotations.create.useMutation({
    onSuccess: (q: any) => {
      utils.leads.byId.invalidate();
      toastPush({
        type: 'quotation-pending',
        title: `Quotation ${q.number} created`,
        body: `${formatINR(q.total, true)} · quotation-pending reminder scheduled.`,
      });
    },
    onError: (e: any) => {
      toastPush({ type: 'query-reminder', title: 'Could not save quotation', body: e.message });
    },
  });
  const [local, setLocal] = useState<LocalQuote[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const { push } = useToasts();

  const quotes = useMemo(
    () =>
      [...local, ...lead.quotations.map(toLocalQuote)].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    [lead.quotations, local],
  );

  const duplicate = (q: LocalQuote) => {
    setLocal((cur) => [
      {
        ...q,
        id: `dup-${Date.now()}`,
        number: `${q.number}-D`,
        status: 'draft',
        createdAt: new Date(),
      },
      ...cur,
    ]);
    push({ type: 'ai-insight', title: 'Quotation duplicated', body: `${q.number}-D created as a draft.` });
  };

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <LimeButton onClick={() => setGenOpen(true)}>
          <Sparkles size={14} /> New Quotation
        </LimeButton>
      </div>
      {quotes.length === 0 ? (
        <PanelEmpty text="No quotations yet — generate one with AI." cta="+ New Quotation ✨" onCta={() => setGenOpen(true)} />
      ) : (
        <div className="flex flex-col gap-3.5">
          <AnimatePresence>
            {quotes.map((q, i) => {
              const daysLeft = q.validUntil
                ? Math.ceil((q.validUntil.getTime() - Date.now()) / 86400000)
                : null;
              const color = STATUS_COLOR[q.status];
              return (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="flex flex-wrap items-center gap-4 rounded-[24px] bg-surface-2 p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-dim text-accent">
                    <FileText size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-primary">{q.number}</p>
                      {q.aiGenerated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-semibold text-accent">
                          <Sparkles size={10} /> AI
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em]"
                        style={{ color, backgroundColor: `${color}1F` }}
                      >
                        {QuotationStatusLabels[q.status]}
                      </span>
                      {daysLeft !== null && daysLeft > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold tabular',
                            daysLeft < 7 ? 'bg-[rgba(255,178,36,0.12)] text-warning' : 'bg-surface-3 text-muted',
                          )}
                        >
                          expires in {daysLeft}d
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-muted tabular">
                      {q.items.length} item{q.items.length > 1 ? 's' : ''} · {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <p className="font-display text-[20px] font-extrabold text-primary tabular">
                    {formatINR(q.total, true)}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        push({
                          type: 'quotation-pending',
                          title: `${q.number} sent`,
                          body: `Reminder scheduled — follow up before validity lapses.`,
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
                      title="Send"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(q)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <QuotationGenerator
        lead={lead}
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onSave={(q) => {
          createQuote.mutate({
            leadId: lead.id,
            number: q.number,
            items: q.items,
            subtotal: q.subtotal,
            tax: q.tax,
            total: q.total,
            status: q.status,
            validUntil: q.validUntil ?? null,
            aiGenerated: q.aiGenerated ?? false,
          });
        }}
      />
    </div>
  );
}

/** AI quotation generator modal — line-item rows + AI pricing hint. */
export function QuotationGenerator({
  lead,
  open,
  onClose,
  onSave,
}: {
  lead: LeadDetail;
  open: boolean;
  onClose: () => void;
  onSave: (q: LocalQuote) => void;
}) {
  const [rows, setRows] = useState<QuotationItem[]>([{ name: '', qty: 1, rate: 0 }]);
  const [validDays, setValidDays] = useState('15');
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);

  const subtotal = rows.reduce((a, r) => a + (r.qty || 0) * (r.rate || 0), 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  const setRow = (i: number, patch: Partial<QuotationItem>) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const suggest = () => {
    setSuggesting(true);
    window.setTimeout(() => {
      const last = lead.quotations[0];
      if (last) {
        setRows(last.items.map((it) => ({ ...it })));
      } else {
        setRows([
          { name: 'Primary supply item', qty: 1000, rate: 48 },
          { name: 'Secondary consumable', qty: 5000, rate: 6.2 },
        ]);
      }
      setSuggesting(false);
      setSuggested(true);
    }, 900);
  };

  const save = () => {
    const clean = rows.filter((r) => r.name.trim() && r.qty > 0);
    if (clean.length === 0) return;
    const st = Math.round(clean.reduce((a, r) => a + r.qty * r.rate, 0));
    onSave({
      id: `q-${Date.now()}`,
      number: `Q-${2200 + lead.quotations.length + 1}`,
      items: clean,
      subtotal: st,
      tax: Math.round(st * 0.18),
      total: Math.round(st * 1.18),
      status: 'draft',
      validUntil: new Date(Date.now() + Number(validDays) * 86400000),
      createdAt: new Date(),
      aiGenerated: suggested,
    });
    setRows([{ name: '', qty: 1, rate: 0 }]);
    setSuggested(false);
    onClose();
  };

  return (
    <GlassModal open={open} onClose={onClose} title="New Quotation" maxWidth={640}>
      <p className="metadata -mt-2 mb-4 flex items-center gap-1.5">
        <Sparkles size={12} /> AI-assisted · GST 18% applied
      </p>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-[16px] bg-surface-2 px-4 py-3">
        <p className="text-[12px] leading-relaxed text-muted">
          {lead.quotations.length > 0
            ? `AI can seed line items from ${lead.quotations[0].number} (last quotation on record).`
            : 'AI can suggest starter line items from similar accounts in this segment.'}
        </p>
        <GhostButton onClick={suggest} disabled={suggesting} className="shrink-0 text-accent">
          {suggesting ? 'Thinking…' : suggested ? 'Suggested ✓' : 'AI suggest pricing'}
        </GhostButton>
      </div>

      <div className="max-h-[38vh] overflow-y-auto pr-1">
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-[1fr_76px_100px_104px_32px] items-center gap-2 px-1">
            <span className="metadata">Item</span>
            <span className="metadata text-right">Qty</span>
            <span className="metadata text-right">Rate ₹</span>
            <span className="metadata text-right">Amount</span>
            <span />
          </div>
          <AnimatePresence>
            {rows.map((r, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className="grid grid-cols-[1fr_76px_100px_104px_32px] items-center gap-2"
              >
                <input
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder="Item name"
                  className={cn(inputCls, 'py-2')}
                />
                <input
                  type="number"
                  min={0}
                  value={r.qty || ''}
                  onChange={(e) => setRow(i, { qty: Number(e.target.value) })}
                  className={cn(inputCls, 'py-2 text-right tabular')}
                />
                <input
                  type="number"
                  min={0}
                  value={r.rate || ''}
                  onChange={(e) => setRow(i, { rate: Number(e.target.value) })}
                  className={cn(inputCls, 'py-2 text-right tabular')}
                />
                <p className="text-right text-[13px] font-semibold text-secondary tabular">
                  {formatINR((r.qty || 0) * (r.rate || 0))}
                </p>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}
                  className="text-muted transition-colors hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRows((cur) => [...cur, { name: '', qty: 1, rate: 0 }])}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent"
      >
        <Plus size={13} /> Add line item
      </button>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
        <div className="text-[13px] text-muted tabular">
          <p>Subtotal <span className="font-semibold text-secondary">{formatINR(subtotal)}</span></p>
          <p className="mt-1">GST 18% <span className="font-semibold text-secondary">{formatINR(tax)}</span></p>
          <p className="mt-1.5 font-display text-[18px] font-extrabold text-primary">{formatINR(total)}</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
          Valid for
          <select
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            className="rounded-full border border-[rgba(255,255,255,0.08)] bg-surface-2 px-3 py-2 text-[12px] text-secondary outline-none"
          >
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
          </select>
        </label>
        <div className="flex gap-2.5">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <LimeButton onClick={save} disabled={total === 0}>Save quotation</LimeButton>
        </div>
      </div>
    </GlassModal>
  );
}
