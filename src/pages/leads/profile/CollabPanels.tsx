import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, ChevronDown, FileAudio, FileSpreadsheet, FileText, Image as ImageIcon,
  ListChecks, Mic, Plus, Send, Sparkles, UploadCloud, Users as UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useCopilot } from '@/components/Copilot';
import { useToasts } from '@/components/Toasts';
import { cn } from '@/lib/utils';
import type { Meeting } from '@contracts/types';
import {
  GhostButton,
  LimeButton,
  formatDate,
  inputCls,
  timeAgo,
} from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';
import { PanelEmpty } from '@/pages/leads/profile/TimelinePanels';

/* ---------------------------------------------------------------- E4 Meetings */

interface GeneratedMom {
  summary: string;
  decisions: string[];
  actionItems: { text: string; owner?: string }[];
}

function mockMinutes(notes: string, attendees: string[]): GeneratedMom {
  const base = notes.trim() || 'Discussion on requirements, pricing and next steps.';
  return {
    summary: `Meeting covered: ${base.slice(0, 160)}${base.length > 160 ? '…' : ''}`,
    decisions: ['Proceed with proposed commercial terms pending final approval', 'Share compliance documents before next review'],
    actionItems: [
      { text: 'Send follow-up summary email', owner: attendees[0] },
      { text: 'Prepare revised pricing sheet', owner: attendees[1] ?? attendees[0] },
    ],
  };
}

export function MeetingsPanel({
  lead,
  onCreateTasks,
}: {
  lead: LeadDetail;
  onCreateTasks: (items: { text: string; owner?: string }[]) => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [minutesFor, setMinutesFor] = useState<Meeting | GeneratedMom | null>(null);
  const [rawNotes, setRawNotes] = useState('');
  const [attendees, setAttendees] = useState('');
  const [voiceFile, setVoiceFile] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedMom | null>(null);
  const [localMeetings, setLocalMeetings] = useState<Meeting[]>([]);
  const { push } = useToasts();

  const meetings = useMemo(
    () => [...localMeetings, ...lead.meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [lead.meetings, localMeetings],
  );

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      const mom = mockMinutes(rawNotes, attendees.split(',').map((a) => a.trim()).filter(Boolean));
      setGenerating(false);
      setGenerated(mom);
    }, 1200);
  };

  const saveMeeting = () => {
    if (!generated) return;
    const m: Meeting = {
      id: Date.now(),
      leadId: lead.id,
      customerId: null,
      date: new Date(),
      attendees: attendees.split(',').map((a) => a.trim()).filter(Boolean),
      rawNotes,
      voiceNoteUrl: null,
      aiSummary: generated.summary,
      decisions: generated.decisions,
      actionItems: generated.actionItems.map((a) => ({ text: a.text, owner: a.owner })),
      createdAt: new Date(),
    };
    setLocalMeetings((cur) => [m, ...cur]);
    setLogOpen(false);
    setGenerated(null);
    setRawNotes('');
    setAttendees('');
    setVoiceFile(null);
    push({ type: 'ai-insight', title: 'Minutes generated', body: 'AI minutes saved to this lead.' });
  };

  const isGenerated = (m: Meeting | GeneratedMom): m is GeneratedMom => 'summary' in m;

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <LimeButton onClick={() => setLogOpen(true)}>
          <Plus size={14} /> Log meeting
        </LimeButton>
      </div>
      {meetings.length === 0 ? (
        <PanelEmpty text="No meetings logged for this lead yet." cta="+ Log meeting" onCta={() => setLogOpen(true)} />
      ) : (
        <div className="flex flex-col gap-3.5">
          {meetings.map((m, i) => {
            const d = new Date(m.date);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex gap-4 rounded-[24px] bg-surface-2 p-5"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[16px] bg-surface-3">
                  <span className="font-display text-[18px] font-extrabold leading-none text-accent tabular">
                    {d.getDate()}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-muted">
                    {d.toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-primary">
                      Meeting · {m.attendees[0] ?? 'Team'} {m.attendees.length > 1 ? `+${m.attendees.length - 1}` : ''}
                    </p>
                    {m.aiSummary ? (
                      <button
                        type="button"
                        onClick={() =>
                          setMinutesFor({
                            summary: m.aiSummary!,
                            decisions: m.decisions ?? [],
                            actionItems: (m.actionItems ?? []).map((a) => ({ text: a.text, owner: a.owner })),
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent"
                      >
                        <Sparkles size={11} /> Minutes generated
                      </button>
                    ) : (
                      <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted">
                        Minutes pending
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
                    <UsersIcon size={12} />
                    {m.attendees.join(' · ') || 'No attendees recorded'}
                    {m.voiceNoteUrl && (
                      <span className="ml-2 inline-flex items-center gap-1 text-accent">
                        <Mic size={12} /> voice note
                      </span>
                    )}
                  </div>
                  {m.rawNotes && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-secondary">{m.rawNotes}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Log meeting modal */}
      <GlassModal open={logOpen} onClose={() => setLogOpen(false)} title="Log Meeting" maxWidth={600}>
        <p className="metadata -mt-2 mb-4">Raw notes → AI minutes</p>
        <label className="mb-4 block">
          <span className="metadata mb-1.5 block">Attendees (comma separated)</span>
          <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="You, Rakesh Patel…" className={inputCls} />
        </label>
        <label className="mb-4 block">
          <span className="metadata mb-1.5 block">Raw notes</span>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            rows={4}
            placeholder="Pricing discussion, objections, commitments…"
            className={cn(inputCls, 'resize-none')}
          />
        </label>
        <label className="mb-5 flex cursor-pointer items-center gap-2.5 rounded-[16px] border border-dashed border-[rgba(255,255,255,0.16)] px-4 py-3 text-[13px] text-muted transition-colors hover:border-accent/50 hover:text-secondary">
          <FileAudio size={16} className="text-accent" />
          {voiceFile ?? 'Attach voice note (optional)'}
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => setVoiceFile(e.target.files?.[0]?.name ?? null)} />
        </label>

        {generating && (
          <div className="mb-4 flex flex-col gap-2">
            <div className="shimmer-base h-4 w-3/4 rounded-full" />
            <div className="shimmer-base h-4 w-1/2 rounded-full" />
            <p className="text-[12px] text-muted">Generating minutes with AI…</p>
          </div>
        )}

        {generated && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-[20px] bg-surface-2 p-4">
            <p className="metadata mb-2 flex items-center gap-1.5"><Sparkles size={12} /> AI Minutes</p>
            <p className="text-[13px] leading-relaxed text-secondary">{generated.summary}</p>
            <p className="metadata mb-1.5 mt-3">Decisions</p>
            {generated.decisions.map((d) => (
              <p key={d} className="flex items-start gap-2 text-[13px] text-secondary"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent" />{d}</p>
            ))}
            <p className="metadata mb-1.5 mt-3">Action items</p>
            {generated.actionItems.map((a) => (
              <p key={a.text} className="flex items-start gap-2 text-[13px] text-secondary"><ListChecks size={13} className="mt-0.5 shrink-0 text-accent" />{a.text}{a.owner ? ` · ${a.owner}` : ''}</p>
            ))}
          </motion.div>
        )}

        <div className="flex justify-end gap-2.5">
          {!generated ? (
            <>
              <GhostButton onClick={() => setLogOpen(false)}>Cancel</GhostButton>
              <LimeButton onClick={generate} disabled={generating || (!rawNotes.trim() && !voiceFile)}>
                <Sparkles size={14} /> Generate Minutes with AI
              </LimeButton>
            </>
          ) : (
            <>
              <GhostButton
                onClick={() => {
                  onCreateTasks(generated.actionItems);
                  push({ type: 'ai-insight', title: 'Tasks created', body: `${generated.actionItems.length} action items added to Tasks.` });
                }}
              >
                <ListChecks size={14} /> Create tasks
              </GhostButton>
              <LimeButton onClick={saveMeeting}>Save meeting</LimeButton>
            </>
          )}
        </div>
      </GlassModal>

      {/* Minutes viewer modal */}
      <GlassModal open={minutesFor !== null} onClose={() => setMinutesFor(null)} title="AI Minutes" maxWidth={600}>
        {minutesFor && isGenerated(minutesFor) && (
          <div>
            <p className="metadata mb-2 flex items-center gap-1.5"><Sparkles size={12} /> Summary</p>
            <p className="text-[14px] leading-relaxed text-secondary">{minutesFor.summary}</p>
            {minutesFor.decisions.length > 0 && (
              <>
                <p className="metadata mb-2 mt-5">Decisions</p>
                <div className="flex flex-col gap-1.5">
                  {minutesFor.decisions.map((d) => (
                    <p key={d} className="flex items-start gap-2 text-[13px] text-secondary">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" /> {d}
                    </p>
                  ))}
                </div>
              </>
            )}
            {minutesFor.actionItems.length > 0 && (
              <>
                <p className="metadata mb-2 mt-5">Action items</p>
                <div className="flex flex-col gap-1.5">
                  {minutesFor.actionItems.map((a) => (
                    <div key={a.text} className="flex items-center justify-between gap-2 text-[13px] text-secondary">
                      <span className="flex items-start gap-2">
                        <ListChecks size={14} className="mt-0.5 shrink-0 text-accent" /> {a.text}
                        {a.owner ? ` · ${a.owner}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onCreateTasks([a]);
                          push({ type: 'ai-insight', title: 'Task created', body: a.text });
                        }}
                        className="shrink-0 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-accent"
                      >
                        Create task
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
}

/* ------------------------------------------------------------------- E5 Files */

interface FileItem {
  id: string;
  name: string;
  size: string;
  uploader: string;
  at: Date;
  kind: 'image' | 'doc' | 'sheet' | 'audio';
}

const KIND_ICON: Record<FileItem['kind'], LucideIcon> = {
  image: ImageIcon,
  doc: FileText,
  sheet: FileSpreadsheet,
  audio: FileAudio,
};

function kindFor(name: string): FileItem['kind'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'image';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  return 'doc';
}

/** Files — drag-drop upload zone backed by Supabase Storage (bucket `lead-files`). */
export function FilesPanel({ lead }: { lead: LeadDetail }) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const { push } = useToasts();

  useEffect(() => {
    let cancelled = false;
    listLeadFiles(lead.id)
      .then((f) => !cancelled && setFiles(f))
      .catch(() => {
        /* bucket not provisioned yet — uploads will surface the setup hint */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  const doUpload = async (f: File) => {
    setUploading(true);
    try {
      const stored = await uploadLeadFile(lead.id, f);
      setFiles((cur) => [stored, ...cur]);
      push({ type: 'ai-insight', title: 'File uploaded', body: `${stored.name} attached to ${lead.companyName}.` });
    } catch (e: any) {
      push({
        type: 'query-reminder',
        title: 'Upload failed',
        body: `${e.message} — create the public bucket once in the SQL Editor: insert into storage.buckets (id, name, public) values ('lead-files','lead-files', true);`,
      });
    } finally {
      setUploading(false);
    }
  };

  const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void doUpload(f);
        }}
        className={cn(
          'flex h-28 flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed transition-colors',
          drag ? 'border-accent/70 bg-accent-dim/40' : 'border-line bg-surface-2/60',
        )}
      >
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : (
          <Paperclip size={18} className="text-muted" />
        )}
        <p className="text-[12.5px] text-secondary">{uploading ? 'Uploading…' : 'Drop files to attach'}</p>
        <p className="text-[11px] text-muted">PDF, images, zip — up to 25 MB</p>
      </div>
      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[18px] bg-surface-2" />
          ))}
        </div>
      )}
      {!loading && files.length === 0 && (
        <p className="rounded-[18px] bg-surface-2 p-4 text-center text-[12.5px] text-muted">
          No files yet — drop a PDF or photo above.
        </p>
      )}
      {files.map((f, i) => (
        <motion.a
          key={f.url}
          href={f.url}
          target="_blank"
          rel="noreferrer"
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group flex items-center gap-3 rounded-[18px] bg-surface-2 p-3.5 transition-colors hover:bg-surface-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-surface-3">
            <FileText size={16} className="text-accent" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-primary">{f.name}</p>
            <p className="metadata">
              {fmtSize(f.size)} · {f.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <ChevronRight size={14} className="text-muted group-hover:text-accent" />
        </motion.a>
      ))}
    </div>
  );
}
export function EmailsPanel({ lead }: { lead: LeadDetail }) {
  const { openWith } = useCopilot();
  const [openId, setOpenId] = useState<string | null>(null);
  const name = lead.companyName ?? 'this lead';

  const threads: EmailThread[] = useMemo(() => {
    const emails = lead.activities.filter((a) => a.activity === 'email');
    const seeded: EmailThread[] = emails.map((a) => ({
      id: `e-${a.id}`,
      subject: a.remarks?.split('—')[0]?.slice(0, 60) || `Follow-up — ${name}`,
      snippet: a.remarks ?? '',
      direction: 'out' as const,
      at: new Date(a.date),
      body: a.remarks ?? '',
    }));
    if (seeded.length === 0 && lead.email) {
      seeded.push({
        id: 'e-welcome',
        subject: `Introduction — SalesOS × ${name}`,
        snippet: `Hi ${lead.contactPerson ?? 'there'}, great connecting — sharing our catalogue and pricing…`,
        direction: 'out',
        at: new Date(lead.createdAt),
        body: `Hi ${lead.contactPerson ?? 'there'},\n\nGreat connecting with you. Sharing our catalogue and indicative pricing as discussed. Happy to set up a call this week.\n\n— SalesOS`,
      });
    }
    return seeded;
  }, [lead, name]);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <LimeButton onClick={() => openWith('Email Generator')}>
          <Sparkles size={14} /> Compose with AI
        </LimeButton>
      </div>
      {threads.length === 0 ? (
        <PanelEmpty
          text="No email threads yet."
          cta="Compose with AI"
          onCta={() => openWith('Email Generator')}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {threads.map((t) => {
            const open = openId === t.id;
            return (
              <motion.div key={t.id} layout className="overflow-hidden rounded-[20px] bg-surface-2">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      t.direction === 'out' ? 'bg-accent-dim text-accent' : 'bg-surface-3 text-info',
                    )}
                  >
                    <Send size={14} className={t.direction === 'in' ? 'rotate-180' : ''} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-primary">{t.subject}</p>
                    <p className="truncate text-[12px] text-muted">{t.snippet}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted tabular">{timeAgo(t.at)}</span>
                  <ChevronDown size={14} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    >
                      <div className="border-t border-line px-5 py-4">
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-secondary">{t.body}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted">
                            {t.direction === 'out' ? 'Sent' : 'Received'} · {formatDate(t.at)}
                          </p>
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}?subject=${encodeURIComponent(`Re: ${t.subject}`)}&body=${encodeURIComponent(`Hi ${lead.contactPerson ?? 'there'},\n\n`)}`}
                              className="flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <Send size={12} /> Reply via email
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
