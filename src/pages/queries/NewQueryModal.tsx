import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Search, Sparkles, X } from 'lucide-react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';
import { QueryCategories, QueryCategoryLabels, Priorities, PriorityLabels } from '@contracts/constants';
import { AI_SOLUTION_DRAFTS, CATEGORY_STYLE, SPRING, fmtDate } from './shared';
import type { CustomerRow } from './shared';
import type { Priority, QueryCategory } from '@contracts/types';

/** Words fade+rise streaming effect (12ms stagger). */
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
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
}

interface NewQueryModalProps {
  open: boolean;
  onClose: () => void;
  customers: CustomerRow[];
}

/** + New Query GlassModal — fields exactly per MoM. */
export default function NewQueryModal({ open, onClose, customers }: NewQueryModalProps) {
  const { user } = useAuth();
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [category, setCategory] = useState<QueryCategory | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignToMe, setAssignToMe] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [aiState, setAiState] = useState<'idle' | 'drafting' | 'done'>('idle');

  useEffect(() => {
    if (open) {
      setCustomerId('');
      setCustomerQuery('');
      setCategory(null);
      setDescription('');
      setPriority('medium');
      setAssignToMe(false);
      setDueDate('');
      setAiState('idle');
    }
  }, [open]);

  // Copilot drafts the AI Suggested Solution once category + description exist.
  useEffect(() => {
    if (!category || description.trim().length < 8 || aiState !== 'idle') return;
    setAiState('drafting');
    const t = window.setTimeout(() => setAiState('done'), 1000);
    return () => window.clearTimeout(t);
  }, [category, description, aiState]);

  const create = trpc.queries.create.useMutation({
    onSuccess: async (_data, vars) => {
      await Promise.all([utils.queries.invalidate(), utils.customers.invalidate()]);
      const name = customers.find((c) => c.id === vars.customerId)?.name ?? 'Customer';
      push({
        type: 'ai-insight',
        title: 'Query created',
        body: `${QueryCategoryLabels[vars.category]} query logged for ${name} — Copilot drafted a suggested solution.`,
      });
      onClose();
    },
  });

  const filtered = customers
    .filter((c) => {
      const q = customerQuery.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.gstin.toLowerCase().includes(q);
    })
    .slice(0, 6);
  const selected = customers.find((c) => c.id === customerId);
  const canSave = !!customerId && !!category && description.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !category) return;
    create.mutate({
      customerId,
      category,
      description: description.trim(),
      priority,
      assignedToId: assignToMe && user?.id ? user.id : undefined,
      dueDate: dueDate ? new Date(`${dueDate}T18:00:00`) : undefined,
      aiSuggestedSolution: aiState === 'done' ? AI_SOLUTION_DRAFTS[category] : undefined,
    });
  };

  return (
    <GlassModal open={open} onClose={onClose} title="New Query" maxWidth={640}>
      <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        {/* Customer (GSTIN disambiguates same-name customers) */}
        <div className="relative">
          <p className="metadata mb-2">Customer</p>
          {selected ? (
            <div className="flex items-center justify-between rounded-[16px] bg-surface-2 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Building2 size={15} className="text-accent" />
                <div>
                  <p className="text-[14px] font-semibold text-primary">{selected.name}</p>
                  <p className="text-[11px] tabular text-muted">{selected.id} · GSTIN {selected.gstin} · {selected.city}</p>
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
                  placeholder="Search customers — same names disambiguated by GSTIN…"
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
                    {filtered.map((c) => (
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
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Category (exact 5) */}
        <div>
          <p className="metadata mb-2">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {QueryCategories.map((c) => {
              const style = CATEGORY_STYLE[c];
              const active = category === c;
              return (
                <motion.button
                  key={c}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setCategory(c)}
                  className="rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all"
                  style={{
                    color: active ? style.color : '#B8B8B8',
                    backgroundColor: active ? style.bg : '#1A1A1A',
                    boxShadow: active ? `0 0 16px ${style.bg}` : undefined,
                  }}
                >
                  {QueryCategoryLabels[c]}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="metadata mb-2">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the customer's issue in their words…"
            className="w-full resize-none rounded-[16px] bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-primary outline-none placeholder:text-muted"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* AI suggested solution — shimmer → streamed */}
        <AnimatePresence>
          {aiState !== 'idle' && category && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[16px] bg-accent-dim p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-accent">
                <Sparkles size={12} /> AI Suggested Solution
              </p>
              {aiState === 'drafting' ? (
                <div className="flex flex-col gap-2">
                  <div className="shimmer-base h-3 w-full rounded-full" />
                  <div className="shimmer-base h-3 w-3/4 rounded-full" />
                </div>
              ) : (
                <StreamedText text={AI_SOLUTION_DRAFTS[category]} className="text-[13px] leading-relaxed text-secondary" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="metadata mb-2">Date raised</p>
            <div className="rounded-[16px] bg-surface-2 px-4 py-3 text-[13px] tabular text-secondary">
              {fmtDate(new Date())} <span className="text-[11px] text-muted">(today, auto)</span>
            </div>
          </div>
          <div>
            <p className="metadata mb-2">Raised by</p>
            <div className="flex items-center gap-2 rounded-[16px] bg-surface-2 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-[13px] font-semibold text-primary">{user?.name ?? 'You'}</span>
              <span className="text-[11px] text-muted">(auto)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="metadata mb-2">Status</p>
            <div className="w-fit rounded-full bg-[rgba(255,92,92,0.12)] px-3.5 py-2 text-[12px] font-bold text-danger">
              Open <span className="font-medium text-muted">(default)</span>
            </div>
          </div>
          <div>
            <p className="metadata mb-2">Priority</p>
            <div className="flex gap-1.5">
              {Priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'rounded-full px-3 py-2 text-[12px] font-semibold transition-colors',
                    priority === p ? 'bg-accent-dim text-accent shadow-accent-glow' : 'bg-surface-2 text-secondary hover:text-primary',
                  )}
                >
                  {PriorityLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="metadata mb-2">Assigned to</p>
            <button
              type="button"
              onClick={() => setAssignToMe((v) => !v)}
              className={cn(
                'w-full rounded-[16px] px-4 py-3 text-left text-[13px] font-semibold transition-colors',
                assignToMe ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-secondary hover:text-primary',
              )}
            >
              {assignToMe ? `Assigned to me (${user?.name ?? 'you'})` : 'Unassigned — tap to take it'}
            </button>
          </div>
          <div>
            <p className="metadata mb-2">Due date</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-[16px] bg-surface-2 px-4 py-3 text-[13px] tabular text-primary outline-none [color-scheme:dark]"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!canSave || create.isPending}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-accent-foreground transition-shadow',
            !canSave ? 'opacity-40' : 'hover:shadow-accent-glow',
          )}
        >
          {create.isPending ? 'Creating…' : 'Create Query'}
        </motion.button>
      </form>
    </GlassModal>
  );
}
