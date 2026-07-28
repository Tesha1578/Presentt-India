import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ExternalLink, MapPin, Pencil, X } from 'lucide-react';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { Priority } from '@contracts/types';
import { trpc } from '@/lib/trpc-shim';
import {
  GhostButton,
  LimeButton,
  PriorityLabels,
  REGION_OPTIONS,
  SOURCE_OPTIONS,
  inputCls,
} from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';

type EditableKey =
  | 'companyName'
  | 'contactPerson'
  | 'designation'
  | 'phone'
  | 'email'
  | 'companyAddress'
  | 'googleMapsUrl'
  | 'region'
  | 'city'
  | 'source'
  | 'priority';

const FIELDS: { key: EditableKey; label: string }[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'companyAddress', label: 'Company Address' },
  { key: 'googleMapsUrl', label: 'Google Maps Location' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'source', label: 'Source' },
  { key: 'priority', label: 'Priority' },
];

interface DetailsProps {
  lead: LeadDetail;
  onSaved: () => void;
}

/** B — Lead Details: every MoM field, inline-edit with lime check flash + DrawerForm editor. */
export default function Details({ lead, onSaved }: DetailsProps) {
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [draft, setDraft] = useState('');
  const [savedKey, setSavedKey] = useState<EditableKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { push } = useToasts();

  const update = trpc.leads.update.useMutation({
    onSuccess: () => onSaved(),
    onError: (e) =>
      push({ type: 'customer-inactive', title: 'Save failed', body: e.message }),
  });

  const saveField = async (key: EditableKey, value: string) => {
    setEditing(null);
    const v = value.trim();
    const current = (lead[key] as string | null) ?? '';
    if (!v || v === current) return;
    await update.mutateAsync({ id: lead.id, [key]: v } as Parameters<typeof update.mutateAsync>[0]);
    setSavedKey(key);
    window.setTimeout(() => setSavedKey(null), 1200);
  };

  const renderValue = (key: EditableKey) => {
    const val = lead[key] as string | null;
    if (key === 'priority') return PriorityLabels[(lead.priority ?? 'medium') as Priority];
    if (key === 'googleMapsUrl' && val) {
      return (
        <span className="flex items-center gap-2">
          <span className="truncate text-accent">{val}</span>
          <a
            href={val}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-secondary hover:text-accent"
          >
            Open in Maps <ExternalLink size={11} />
          </a>
        </span>
      );
    }
    return val;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 }}
      className="card-e1 rounded-[28px] p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-[18px] font-bold text-primary">Lead Details</h3>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12px] font-semibold text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
        >
          <Pencil size={13} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => {
          const val = lead[key] as string | null;
          const isEditing = editing === key;
          return (
            <div key={key} className="min-w-0">
              <p className="metadata">{label}</p>
              <AnimatePresence mode="wait" initial={false}>
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="mt-1.5"
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => saveField(key, draft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveField(key, draft);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      className={cn(inputCls, 'py-2')}
                    />
                  </motion.div>
                ) : (
                  <motion.button
                    key="view"
                    type="button"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      if (key === 'priority') {
                        setDrawerOpen(true);
                        return;
                      }
                      setDraft(val ?? '');
                      setEditing(key);
                    }}
                    className="mt-1 block w-full text-left"
                  >
                    {val ? (
                      <span className="flex items-center gap-2 text-[14px] text-secondary">
                        <span className="min-w-0 flex-1">{renderValue(key)}</span>
                        {savedKey === key && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-accent">
                            <Check size={14} />
                          </motion.span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.16)] px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent">
                        — Add
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {/* Owner (read-only — from relation) */}
        <div>
          <p className="metadata">Owner</p>
          <p className="mt-1 text-[14px] text-secondary">{lead.owner?.name ?? 'Unassigned'}</p>
        </div>
      </div>

      {/* Maps thumbnail strip when a location exists */}
      {lead.googleMapsUrl && (
        <div className="mt-5 flex items-center gap-3 rounded-[20px] bg-surface-2 p-3">
          <div
            className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[14px]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
              backgroundColor: '#0d0d0d',
            }}
          >
            <MapPin size={18} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-2/3 text-accent" fill="rgba(198,255,51,0.25)" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-secondary">{lead.companyAddress ?? 'Pinned location'}</p>
            <a
              href={lead.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent"
            >
              Open in Maps <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      <EditDrawer lead={lead} open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={onSaved} />
    </motion.section>
  );
}

/** Right slide-over DrawerForm with all editable fields. */
function EditDrawer({
  lead,
  open,
  onClose,
  onSaved,
}: {
  lead: LeadDetail;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<EditableKey, string>>({
    companyName: lead.companyName ?? '',
    contactPerson: lead.contactPerson ?? '',
    designation: lead.designation ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    companyAddress: lead.companyAddress ?? '',
    googleMapsUrl: lead.googleMapsUrl ?? '',
    region: lead.region ?? '',
    city: lead.city ?? '',
    source: lead.source ?? '',
    priority: lead.priority ?? 'medium',
  });
  const [busy, setBusy] = useState(false);
  const { push } = useToasts();
  const update = trpc.leads.update.useMutation();

  const save = async () => {
    setBusy(true);
    try {
      await update.mutateAsync({
        id: lead.id,
        companyName: form.companyName || undefined,
        contactPerson: form.contactPerson || undefined,
        designation: form.designation || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        companyAddress: form.companyAddress || undefined,
        googleMapsUrl: form.googleMapsUrl || undefined,
        region: form.region || undefined,
        city: form.city || undefined,
        source: form.source || undefined,
        priority: (form.priority || undefined) as Priority | undefined,
      });
      push({ type: 'ai-insight', title: 'Lead updated', body: 'Details saved successfully.' });
      onSaved();
      onClose();
    } catch (e) {
      push({ type: 'customer-inactive', title: 'Save failed', body: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(12px)' }} onClick={onClose} />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="glass-strong absolute bottom-0 right-0 top-0 flex w-[480px] max-w-full flex-col p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-[20px] font-bold text-primary">Edit Lead</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary hover:text-primary"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-4">
                {FIELDS.filter((f) => !['region', 'source', 'priority'].includes(f.key)).map((f) => (
                  <label key={f.key} className="block">
                    <span className="metadata mb-1.5 block">{f.label}</span>
                    <input
                      value={form[f.key]}
                      onChange={(e) => setForm((cur) => ({ ...cur, [f.key]: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                ))}
                <div>
                  <span className="metadata mb-1.5 block">Region</span>
                  <div className="flex flex-wrap gap-2">
                    {REGION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, region: c.region === r ? '' : r }))}
                        className={cn(
                          'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                          form.region === r ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-secondary',
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="metadata mb-1.5 block">Source</span>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, source: c.source === s ? '' : s }))}
                        className={cn(
                          'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                          form.source === s ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-secondary',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="metadata mb-1.5 block">Priority</span>
                  <div className="flex flex-wrap gap-2">
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, priority: p }))}
                        className={cn(
                          'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                          form.priority === p ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-secondary',
                        )}
                      >
                        {PriorityLabels[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5 border-t border-line pt-5">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <LimeButton onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </LimeButton>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
