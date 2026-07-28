import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { useCopilot } from '@/components/Copilot';
import { cn } from '@/lib/utils';
import type { Priority } from '@contracts/types';
import { trpc } from '@/lib/trpc-shim';
import {
  GhostButton,
  LimeButton,
  PRIORITY_COLOR,
  PriorityLabels,
  REGION_OPTIONS,
  SOURCE_OPTIONS,
  inputCls,
} from '@/components/leads/leads-ui';

interface FormState {
  companyName: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  companyAddress: string;
  googleMapsUrl: string;
  region: string;
  source: string;
  priority: Priority;
  note: string;
  lat?: number;
  lng?: number;
}

const EMPTY: FormState = {
  companyName: '',
  contactPerson: '',
  designation: '',
  phone: '',
  email: '',
  companyAddress: '',
  googleMapsUrl: '',
  region: '',
  source: '',
  priority: 'medium',
  note: '',
};

const FIELDS: { key: keyof FormState; label: string; type?: string; placeholder: string }[] = [
  { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Kothari Fabricators' },
  { key: 'contactPerson', label: 'Contact Person', placeholder: 'e.g. Rakesh Patel' },
  { key: 'designation', label: 'Designation', placeholder: 'e.g. Purchase Head' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 …' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'name@company.in' },
  { key: 'companyAddress', label: 'Company Address', placeholder: 'Street, area, city, PIN' },
];

/** Mini dark "map" — click to set a pin (lat/lng + generated maps link). */
function MapPicker({
  lat,
  lng,
  onPick,
}: {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Pick location on map"
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        // Map the click into a plausible India lat/lng envelope
        const nLng = 68 + x * 30;
        const nLat = 8 + (1 - y) * 28;
        onPick(Math.round(nLat * 1e5) / 1e5, Math.round(nLng * 1e5) / 1e5);
      }}
      className="relative h-36 w-full cursor-crosshair overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-surface-1"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), radial-gradient(400px at 60% 40%, rgba(198,255,51,0.06), transparent)',
        backgroundSize: '24px 24px, 24px 24px, 100% 100%',
      }}
    >
      {lat !== undefined && lng !== undefined ? (
        <motion.span
          key={`${lat}-${lng}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="absolute -translate-x-1/2 -translate-y-full text-accent"
          style={{
            left: `${(((lng - 68) / 30) * 100).toFixed(2)}%`,
            top: `${((1 - (lat - 8) / 28) * 100).toFixed(2)}%`,
          }}
        >
          <MapPin size={22} fill="rgba(198,255,51,0.25)" />
        </motion.span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted">
          Click anywhere to drop a pin
        </span>
      )}
    </div>
  );
}

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
}

/** GlassModal — conversational single-column form; ALL fields optional. */
export default function CreateLeadModal({ open, onClose, onCreated }: CreateLeadModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showMap, setShowMap] = useState(false);
  const [busy, setBusy] = useState(false);
  const { push } = useToasts();
  const { openWith } = useCopilot();
  const utils = trpc.useUtils();

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const payload = useMemo(() => {
    const p: Record<string, unknown> = {};
    const s = (v: string) => (v.trim() ? v.trim() : undefined);
    p.companyName = s(form.companyName);
    p.contactPerson = s(form.contactPerson);
    p.designation = s(form.designation);
    p.phone = s(form.phone);
    p.email = s(form.email);
    p.companyAddress = s(form.companyAddress);
    p.googleMapsUrl = s(form.googleMapsUrl);
    p.region = form.region || undefined;
    p.source = form.source || undefined;
    p.priority = form.priority;
    if (form.lat !== undefined && form.lng !== undefined) {
      p.lat = form.lat;
      p.lng = form.lng;
      if (!p.googleMapsUrl) p.googleMapsUrl = `https://maps.google.com/?q=${form.lat},${form.lng}`;
    }
    return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
  }, [form]);

  const create = trpc.leads.create.useMutation();
  const addActivity = trpc.leads.addActivity.useMutation();

  const submit = async (withActivity: boolean) => {
    if (busy) return;
    if (Object.keys(payload).length === 0 || (Object.keys(payload).length === 1 && 'priority' in payload)) {
      push({
        type: 'ai-insight',
        title: 'Almost there',
        body: 'Add at least one field — a lead can be created from a single field.',
      });
      return;
    }
    setBusy(true);
    try {
      const lead = await create.mutateAsync(payload as Parameters<typeof create.mutate>[0]);
      if (withActivity || form.note.trim()) {
        await addActivity.mutateAsync({
          leadId: lead!.id,
          activity: 'note',
          remarks: form.note.trim() || 'Lead created — first touch pending',
        });
      }
      await Promise.all([
        utils.leads.list.invalidate(),
        utils.leads.stageCounts.invalidate(),
        utils.leads.funnel.invalidate(),
        utils.leads.conversionStats.invalidate(),
      ]);
      push({
        type: 'lead-converted',
        title: 'Lead created',
        body: `${lead?.companyName ?? lead?.contactPerson ?? 'New lead'} added to the pipeline.`,
        actionLabel: 'Draft first-touch',
        onAction: () => openWith('Email Generator'),
      });
      setForm(EMPTY);
      setShowMap(false);
      onClose();
      onCreated?.(lead!.id);
    } catch (err) {
      push({
        type: 'customer-inactive',
        title: 'Could not create lead',
        body: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassModal open={open} onClose={onClose} title="New Lead" maxWidth={600}>
      <p className="metadata -mt-2 mb-5">Create lead · Everything is optional — start with any one field</p>
      <div className="max-h-[62vh] overflow-y-auto pr-1">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="flex flex-col gap-4"
        >
          {FIELDS.map((f) => (
            <motion.label
              key={f.key}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className="block"
            >
              <span className="metadata mb-1.5 block">{f.label}</span>
              <input
                type={f.type ?? 'text'}
                value={form[f.key] as string}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            </motion.label>
          ))}

          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <span className="metadata mb-1.5 block">Google Maps Location</span>
            <input
              value={form.googleMapsUrl}
              onChange={(e) => set('googleMapsUrl', e.target.value)}
              placeholder="Paste a maps link…"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowMap((s) => !s)}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent"
            >
              <MapPin size={13} /> {showMap ? 'Hide map picker' : 'Pick on map'}
            </button>
            {showMap && (
              <div className="mt-2">
                <MapPicker
                  lat={form.lat}
                  lng={form.lng}
                  onPick={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
                />
                {form.lat !== undefined && (
                  <p className="mt-1.5 text-[11px] text-muted tabular">
                    Pin set: {form.lat?.toFixed(4)}, {form.lng?.toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <span className="metadata mb-1.5 block">Region</span>
            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, region: f.region === r ? '' : r }))}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                    form.region === r
                      ? 'bg-accent-dim text-accent shadow-accent-glow'
                      : 'bg-surface-2 text-secondary hover:text-primary',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <span className="metadata mb-1.5 block">Source</span>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, source: f.source === s ? '' : s }))}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                    form.source === s
                      ? 'bg-accent-dim text-accent shadow-accent-glow'
                      : 'bg-surface-2 text-secondary hover:text-primary',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <span className="metadata mb-1.5 block">Priority</span>
            <div className="flex w-fit rounded-full bg-surface-2 p-1">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    'relative rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors',
                    form.priority === p ? 'text-canvas' : 'text-muted hover:text-secondary',
                  )}
                >
                  {form.priority === p && (
                    <motion.span
                      layoutId="priority-seg"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLOR[p] }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative">{PriorityLabels[p]}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.label variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="block">
            <span className="metadata mb-1.5 block">Initial note</span>
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={3}
              placeholder="First impression, requirement, next step…"
              className={cn(inputCls, 'resize-none')}
            />
          </motion.label>
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5">
        <GhostButton onClick={() => submit(true)} disabled={busy}>
          Create &amp; add activity
        </GhostButton>
        <LimeButton onClick={() => submit(false)} disabled={busy}>
          {busy ? 'Creating…' : 'Create Lead'}
        </LimeButton>
      </div>
    </GlassModal>
  );
}
