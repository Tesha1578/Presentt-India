import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Check, ChevronRight, Lightbulb, ListChecks, RefreshCw, Send, Sparkles, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InsightCard from '@/components/InsightCard';
import { trpc } from '@/lib/trpc-shim';

export const COPILOT_MODES = [
  'Customer Summary', 'Meeting Summary', 'Voice Notes', 'Documents', 'Goals',
  'Suggested Actions', 'Sales Insights', 'Risk Alerts', 'Email Generator',
  'Proposal/Quotation Generator', 'Meeting Minutes Generator', 'Timeline',
] as const;

export type CopilotMode = (typeof COPILOT_MODES)[number];

interface CopilotContextValue {
  open: boolean;
  mode: CopilotMode;
  setOpen: (v: boolean) => void;
  openWith: (mode: CopilotMode) => void;
}

const CopilotContext = createContext<CopilotContextValue>({
  open: false,
  mode: 'Sales Insights',
  setOpen: () => {},
  openWith: () => {},
});

export const useCopilot = () => useContext(CopilotContext);

/** Words fade+rise in, 12ms stagger — streaming-text effect. */
function StreamedText({ text, className }: { text: string; className?: string }) {
  const words = useMemo(() => text.split(' '), [text]);
  return (
    <p className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${i}-${w}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.012 }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

/** Home/analytics default content stack — fully derived from live data. */
function HomeInsights() {
  const navigate = useNavigate();
  const { openWith } = useCopilot();
  const [actionsDone, setActionsDone] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const discount = trpc.analytics.discountMonitoring.useQuery(undefined, { staleTime: 60_000 });
  const regions = trpc.analytics.regionPerformance.useQuery(undefined, { staleTime: 60_000 });
  const reminders = trpc.queries.unresolvedReminders.useQuery({ minAgeDays: 3 }, { staleTime: 60_000 });
  const overdue = trpc.visits.overdue.useQuery(undefined, { staleTime: 60_000 });
  const home = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const summaries = trpc.dashboard.recentSummaries.useQuery(undefined, { staleTime: 60_000 });

  const topDecliner = (discount.data ?? []).find((d: any) => d.declining) ?? (discount.data ?? [])[0];
  const topRegion = (regions.data ?? [])[0];
  const loading = discount.isPending || regions.isPending;

  const suggested: { label: string; href: string }[] = [];
  const topQuery = (reminders.data ?? [])[0];
  if (topQuery)
    suggested.push({
      label: `Resolve ${topQuery.category} query for ${topQuery.customerName} (open ${topQuery.unresolvedDays}d)`,
      href: '/queries',
    });
  const topOverdue = (overdue.data ?? [])[0];
  if (topOverdue)
    suggested.push({
      label: `Schedule visit: ${topOverdue.name} (not visited in ${topOverdue.pendingDays}d)`,
      href: '/visits',
    });
  const topTask = (home.data?.tasks ?? [])[0];
  if (topTask) suggested.push({ label: topTask.title, href: topTask.entityHref });

  return (
    <div className="flex flex-col gap-3.5">
      {loading && (
        <div className="rounded-[24px] bg-surface-2 p-5">
          <TypingDots />
        </div>
      )}
      {topDecliner && (
        <InsightCard
          icon={AlertTriangle}
          tone="red"
          headline={`${topDecliner.name} — declining ${Math.abs(topDecliner.dropPct)}% over ${topDecliner.windowMonths} months`}
          reasoning={`Discounted customer ${topDecliner.declining ? `declining beyond your ${topDecliner.thresholdPct}% threshold while discounts continue` : 'being monitored'}. Window sales ₹${topDecliner.currentWindowSales.toLocaleString('en-IN')} vs ₹${topDecliner.previousWindowSales.toLocaleString('en-IN')} previously.`}
          confidence={topDecliner.declining ? 'High' : 'Watch'}
          delay={0.05}
          actions={[
            { label: 'Open customer', onClick: () => navigate(`/customers/${topDecliner.id}`) },
            {
              label: 'Draft recovery email',
              primary: true,
              onClick: () => {
                navigate(`/customers/${topDecliner.id}`);
                openWith('Email Generator');
              },
            },
          ]}
        />
      )}
      {topRegion && !dismissed && (
        <InsightCard
          icon={Lightbulb}
          tone="lime"
          headline={`${topRegion.region} leads revenue at ₹${topRegion.value.toLocaleString('en-IN')}`}
          reasoning={
            topRegion.delta !== null
              ? `${topRegion.delta >= 0 ? 'Up' : 'Down'} ${Math.abs(topRegion.delta)}% vs the previous quarter across your regions.`
              : 'Top performing region this quarter.'
          }
          confidence="Medium"
          delay={0.17}
          actions={[
            { label: 'Open analytics', onClick: () => navigate('/analytics') },
            { label: 'Dismiss', onClick: () => setDismissed(true) },
          ]}
        />
      )}
      {suggested.length > 0 && (
        <div className="rounded-[24px] bg-surface-2 p-5">
          <p className="metadata mb-3 flex items-center gap-2">
            <ListChecks size={13} /> Suggested Actions
          </p>
          <div className="flex flex-col gap-2">
            {suggested.map((a, i) => {
              const done = actionsDone.includes(i);
              return (
                <motion.button
                  layout
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setActionsDone((d) => (done ? d : [...d, i]));
                    navigate(a.href);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[14px] bg-surface-3/60 px-3.5 py-2.5 text-left text-[13px] transition-opacity',
                    done ? 'text-muted opacity-50' : 'text-secondary hover:text-primary',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      done ? 'border-accent bg-accent text-accent-foreground' : 'border-line',
                    )}
                  >
                    {done && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
                        <Check size={11} strokeWidth={3} />
                      </motion.span>
                    )}
                  </span>
                  <span className={cn(done && 'line-through')}>{a.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
      {(summaries.data ?? []).length > 0 && (
        <div className="rounded-[24px] bg-surface-2 p-5">
          <p className="metadata mb-2">Recent Summaries</p>
          {(summaries.data ?? []).map((sm: any) => (
            <button
              key={sm.title}
              type="button"
              onClick={() => navigate(sm.href)}
              className="group flex w-full items-center justify-between gap-2 rounded-[12px] px-2 py-2.5 text-left transition-colors hover:bg-surface-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-secondary group-hover:text-primary">{sm.title}</span>
                <span className="block text-[11px] text-muted">{sm.meta}</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-muted group-hover:text-accent" />
            </button>
          ))}
        </div>
      )}
      <div className="rounded-[24px] bg-surface-2 p-5">
        <p className="metadata mb-2">Ask anything</p>
        <p className="text-[13px] leading-relaxed text-secondary">
          Use the box below to ask about any customer, lead or trend — I answer from your live data.
        </p>
      </div>
    </div>
  );
}

/** Entity the panel is contextual to, derived from the current route. */
export interface CopilotEntity {
  entityType?: 'lead' | 'customer';
  entityId?: string;
}

function entityFromPath(pathname: string): CopilotEntity {
  const cust = pathname.match(/^\/customers\/([^/]+)/);
  if (cust) return { entityType: 'customer', entityId: cust[1] };
  const lead = pathname.match(/^\/leads\/([^/]+)/);
  if (lead) return { entityType: 'lead', entityId: lead[1] };
  return {};
}

/** Live AI generation (Groq · Llama 3.3 70B) for the current mode + entity. */
function AiMode({ mode, entity }: { mode: CopilotMode; entity: CopilotEntity }) {
  const generate = trpc.ai.generate.useMutation();
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = () => {
    const id = ++requestId.current;
    setError(null);
    setAnswer(null);
    generate.mutate(
      { mode, ...entity },
      {
        onSuccess: (d: any) => {
          if (requestId.current === id) setAnswer(d.text);
        },
        onError: (e: any) => {
          if (requestId.current === id) setError(e.message);
        },
      },
    );
  };

  useEffect(run, [mode, entity.entityType, entity.entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-[24px] bg-surface-2 p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="metadata flex items-center gap-2">
          <Sparkles size={12} className="text-accent" /> {mode}
        </p>
        <button
          type="button"
          aria-label="Regenerate" title="Regenerate"
          onClick={run}
          disabled={generate.isPending}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-muted transition-colors hover:text-accent disabled:opacity-40"
        >
          <RefreshCw size={11} className={cn(generate.isPending && 'animate-spin')} />
        </button>
      </div>
      {generate.isPending ? (
        <TypingDots />
      ) : error ? (
        <p className="text-[13px] leading-relaxed text-danger">AI request failed: {error}</p>
      ) : answer ? (
        <StreamedText text={answer} className="whitespace-pre-line text-[13px] leading-relaxed text-secondary" />
      ) : null}
    </div>
  );
}

/** Floating right AI panel — collapsible to a lime-glowing orb. */
function CopilotPanel() {
  const { open, mode, setOpen, openWith } = useCopilot();
  const location = useLocation();
  const entity = useMemo(() => entityFromPath(location.pathname), [location.pathname]);

  // Free-chat state ("Ask the assistant…")
  const ask = trpc.ai.generate.useMutation();
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);

  const submitQuestion = () => {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setQuestion('');
    ask.mutate(
      { mode: 'chat', ...entity, question: q },
      {
        onSuccess: (d: any) => setChat((c) => [...c, { q, a: d.text }]),
        onError: (e: any) => setChat((c) => [...c, { q, a: `Request failed: ${e.message}` }]),
      },
    );
  };

  const contextMode: CopilotMode = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/customers/')) return 'Customer Summary';
    if (p.startsWith('/leads/')) return 'Email Generator';
    if (p.startsWith('/visits')) return 'Meeting Summary';
    if (p.startsWith('/queries')) return 'Suggested Actions';
    return 'Sales Insights';
  }, [location.pathname]);

  useEffect(() => {
    openWith(contextMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMode]);

  const isHomeContext = mode === 'Sales Insights' || mode === 'Risk Alerts' || mode === 'Goals';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="glass-strong fixed bottom-4 right-4 top-4 z-[60] flex w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent-dim">
                <Sparkles size={16} className="text-accent" strokeWidth={1.75} />
                <motion.span
                  className="absolute inset-0 rounded-full border border-accent/40"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-primary">AI Workspace Assistant</p>
                <p className="text-[11px] text-muted">Contextual · {contextMode}</p>
              </div>
              <button
                type="button"
                aria-label="Collapse Copilot" title="Collapse Copilot"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-primary"
              >
                <X size={14} />
              </button>
            </div>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-line px-4 py-3">
              {COPILOT_MODES.slice(0, 8).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => openWith(m)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    m === mode ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-muted hover:text-secondary',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3.5">
                {isHomeContext ? <HomeInsights /> : <AiMode mode={mode} entity={entity} />}
                {chat.map((m, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="self-end rounded-[18px] rounded-br-[6px] bg-accent-dim px-4 py-2.5 text-[13px] text-accent">
                      {m.q}
                    </div>
                    <div className="rounded-[24px] bg-surface-2 p-5">
                      <StreamedText text={m.a} className="whitespace-pre-line text-[13px] leading-relaxed text-secondary" />
                    </div>
                  </div>
                ))}
                {ask.isPending && (
                  <div className="rounded-[24px] bg-surface-2 p-5">
                    <TypingDots />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-line p-4">
              <div className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                  placeholder="Ask the assistant…"
                  className="w-full bg-transparent text-[13px] text-primary placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Send" title="Send"
                  onClick={submitQuestion}
                  disabled={ask.isPending || !question.trim()}
                  className="shrink-0 text-accent transition-opacity disabled:opacity-40"
                >
                  <Send size={15} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Orb */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            aria-label="Open AI Copilot" title="Open AI Copilot"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="fixed bottom-6 right-6 z-[60] flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-accent-glow"
          >
            <Sparkles size={24} strokeWidth={1.75} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CopilotMode>('Sales Insights');
  const openWith = (m: CopilotMode) => {
    setMode(m);
    setOpen(true);
  };
  const value = useMemo(() => ({ open, mode, setOpen, openWith }), [open, mode]);
  return (
    <CopilotContext.Provider value={value}>
      {children}
      <CopilotPanel />
    </CopilotContext.Provider>
  );
}

export default CopilotPanel;
