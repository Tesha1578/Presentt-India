import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ImagePlus, Mic, Search, Sparkles, X } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';
import { SPRING } from './shared';
import type { CustomerRow } from './shared';

const OUTCOMES = ['Order discussed', 'Payment collected', 'Query logged', 'Courtesy'] as const;

const TRANSCRIPTION =
  'Met the purchase head on-site. Reviewed current stock levels and discussed the pending reorder. ' +
  'They asked for revised pricing on the Q3 contract and confirmed a follow-up call next week.';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Magnetic lime pill — translates toward cursor within 40px, springs back. */
function MagneticSave({ disabled, saving }: { disabled: boolean; saving: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <motion.button
      ref={ref}
      type="submit"
      disabled={disabled || saving}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < 40 + r.width / 2) {
          setOffset({ x: Math.max(-6, Math.min(6, dx * 0.12)), y: Math.max(-6, Math.min(6, dy * 0.12)) });
        }
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className={cn(
        'w-full rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-accent-foreground transition-shadow',
        disabled ? 'opacity-40' : 'hover:shadow-accent-glow',
      )}
    >
      {saving ? 'Saving…' : 'Save Visit'}
    </motion.button>
  );
}

/** Hold-to-record voice note button with live waveform. */
function VoiceRecorder({ onRecorded }: { onRecorded: (name: string) => void }) {
  const [recording, setRecording] = useState(false);
  const start = () => setRecording(true);
  const stop = () => {
    if (recording) onRecorded(`voice-note-${Date.now().toString(36)}.m4a`);
    setRecording(false);
  };
  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        animate={recording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={recording ? { duration: 1.1, repeat: Infinity } : SPRING}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          recording ? 'bg-danger text-canvas' : 'bg-surface-3 text-secondary hover:text-accent',
        )}
        title="Hold to record"
      >
        <Mic size={17} strokeWidth={1.75} />
      </motion.button>
      <div className="flex h-8 items-center gap-[3px]">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className={cn('w-[3px] rounded-full', recording ? 'bg-danger' : 'bg-surface-3')}
            animate={recording ? { height: [6, 8 + ((i * 13) % 22), 6] } : { height: 6 }}
            transition={recording ? { duration: 0.6, repeat: Infinity, delay: i * 0.05 } : { duration: 0.2 }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted">{recording ? 'Recording… release to save' : 'Hold to record'}</p>
    </div>
  );
}

interface LogVisitModalProps {
  open: boolean;
  onClose: () => void;
  customers: CustomerRow[];
  prefillCustomerId?: string | null;
  prefillDate?: Date | null;
}

/** Log-visit GlassModal — customer search, date, rep, remarks, photos, voice note, outcome. */
export default function LogVisitModal({ open, onClose, customers, prefillCustomerId, prefillDate }: LogVisitModalProps) {
  const { user } = useAuth();
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState<string>('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateTime, setDateTime] = useState(toLocalInput(new Date()));
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<string>('');
  const [nextVisit, setNextVisit] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (open) {
      setCustomerId(prefillCustomerId ?? '');
      setCustomerQuery('');
      setDateTime(toLocalInput(prefillDate ?? new Date()));
      setRemarks('');
      setPhotos([]);
      setVoiceNotes([]);
      setOutcome('');
      setNextVisit('');
      setTranscript('');
      setTranscribing(false);
    }
  }, [open, prefillCustomerId, prefillDate]);

  const create = trpc.visits.create.useMutation({
    onSuccess: async (_data, vars) => {
      await Promise.all([utils.visits.invalidate(), utils.customers.invalidate()]);
      const name = customers.find((c) => c.id === vars.customerId)?.name ?? 'Customer';
      push({
        type: 'ai-insight',
        title: 'Visit logged',
        body: `${name} visit saved — region completion updated.`,
      });
      onClose();
    },
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.gstin.toLowerCase().includes(q);
  }).slice(0, 6);

  const selected = customers.find((c) => c.id === customerId);

  const transcribe = () => {
    setTranscribing(true);
    setTranscript('');
    window.setTimeout(() => {
      setTranscribing(false);
      setTranscript(TRANSCRIPTION);
      setRemarks((r) => (r ? `${r}\n\n${TRANSCRIPTION}` : TRANSCRIPTION));
    }, 1000);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    create.mutate({
      customerId,
      date: new Date(dateTime),
      remarks: remarks || undefined,
      photos: photos.length ? photos : undefined,
      voiceNotes: voiceNotes.length ? voiceNotes : undefined,
      outcome: outcome || undefined,
      nextVisitAt: nextVisit ? new Date(`${nextVisit}T10:00:00`) : undefined,
    });
  };

  return (
    <GlassModal open={open} onClose={onClose} title="Log Visit" maxWidth={640}>
      <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        {/* Customer (⌘K-style search, GSTIN disambiguates same-name customers) */}
        <div className="relative">
          <p className="metadata mb-2">Customer</p>
          {selected ? (
            <div className="flex items-center justify-between rounded-[16px] bg-surface-2 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Building2 size={15} className="text-accent" />
                <div>
                  <p className="text-[14px] font-semibold text-primary">{selected.name}</p>
                  <p className="text-[11px] text-muted tabular">{selected.id} · GSTIN {selected.gstin} · {selected.city}</p>
                </div>
              </div>
              <button type="button" onClick={() => setCustomerId('')} aria-label="Clear customer" className="text-muted hover:text-primary">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-[16px] bg-surface-2 px-4 py-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                <Search size={15} className="text-muted" />
                <input
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setPickerOpen(true); }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder="Search customers by name, ID or GSTIN…"
                  className="w-full bg-transparent text-[14px] text-primary outline-none placeholder:text-muted"
                />
              </div>
              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ scale: 0.97, y: -4, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.97, opacity: 0 }}
                    transition={SPRING}
                    className="glass-strong absolute left-0 right-0 top-full z-40 mt-2 max-h-56 overflow-y-auto rounded-[16px] p-1.5"
                  >
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomerId(c.id); setPickerOpen(false); }}
                        className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-surface-3"
                      >
                        <span>
                          <span className="block text-[13px] font-semibold text-primary">{c.name}</span>
                          <span className="block text-[11px] text-muted">{c.city} · {c.region}</span>
                        </span>
                        <span className="text-[11px] tabular text-muted">GSTIN {c.gstin}</span>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="px-3 py-2 text-[12px] text-muted">No customers match.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="metadata mb-2">Date & time</p>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full rounded-[16px] bg-surface-2 px-4 py-3 text-[13px] tabular text-primary outline-none [color-scheme:dark]"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />
          </div>
          <div>
            <p className="metadata mb-2">Sales rep</p>
            <div className="flex items-center gap-2 rounded-[16px] bg-surface-2 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-[13px] font-semibold text-primary">{user?.name ?? 'You'}</span>
              <span className="text-[11px] text-muted">(auto)</span>
            </div>
          </div>
        </div>

        <div>
          <p className="metadata mb-2">Remarks</p>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            placeholder="What was discussed? Orders, payments, concerns…"
            className="w-full resize-none rounded-[16px] bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-primary outline-none placeholder:text-muted"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
          />
          <AnimatePresence>
            {transcribing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="shimmer-base mt-2 h-10 rounded-[12px]" />
            )}
          </AnimatePresence>
          {transcript && !transcribing && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              <Sparkles size={11} /> AI transcription appended to remarks
            </p>
          )}
        </div>

        {/* Photos drag-drop */}
        <div>
          <p className="metadata mb-2">Photos</p>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const names = Array.from(e.dataTransfer.files).map((f) => f.name);
              if (names.length) setPhotos((p) => [...p, ...names]);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed px-4 py-6 transition-colors',
              dragOver ? 'border-accent bg-accent-dim' : 'border-line bg-surface-2 hover:border-[rgba(198,255,51,0.4)]',
            )}
          >
            <ImagePlus size={20} strokeWidth={1.75} className="text-muted" />
            <p className="text-[12px] text-muted">Drag & drop photos here, or click to browse</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                if (names.length) setPhotos((p) => [...p, ...names]);
              }}
            />
          </label>
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {photos.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] text-secondary">
                  {p}
                  <button type="button" aria-label={`Remove ${p}`} onClick={() => setPhotos((cur) => cur.filter((x) => x !== p))} className="text-muted hover:text-primary">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Voice note */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="metadata">Voice note</p>
            {voiceNotes.length > 0 && !transcribing && (
              <button type="button" onClick={transcribe} className="flex items-center gap-1 text-[11px] font-semibold text-accent">
                <Sparkles size={11} /> Transcribe with AI
              </button>
            )}
          </div>
          <div className="rounded-[20px] bg-surface-2 p-4">
            <VoiceRecorder onRecorded={(name) => setVoiceNotes((v) => [...v, name])} />
            {voiceNotes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {voiceNotes.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] text-secondary">
                    <Mic size={10} /> {v}
                    <button type="button" aria-label={`Remove ${v}`} onClick={() => setVoiceNotes((cur) => cur.filter((x) => x !== v))} className="text-muted hover:text-primary">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="metadata mb-2">Outcome</p>
            <div className="flex flex-wrap gap-1.5">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(outcome === o ? '' : o)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors',
                    outcome === o ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-2 text-secondary hover:text-primary',
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="metadata mb-2">Next visit date</p>
            <input
              type="date"
              value={nextVisit}
              onChange={(e) => setNextVisit(e.target.value)}
              className="w-full rounded-[16px] bg-surface-2 px-4 py-3 text-[13px] tabular text-primary outline-none [color-scheme:dark]"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        <MagneticSave disabled={!customerId} saving={create.isPending} />
      </form>
    </GlassModal>
  );
}
