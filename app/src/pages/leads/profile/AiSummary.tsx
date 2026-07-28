import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Mail, Sparkles } from 'lucide-react';
import { useCopilot } from '@/components/Copilot';
import { LeadStageLabels } from '@/components/leads/leads-ui';
import type { LeadDetail } from '@/components/leads/leads-ui';

interface AiSummaryProps {
  lead: LeadDetail;
  onGenerateQuotation: () => void;
}

/** C — AI Summary: streamed paragraph + confidence chip + actions. */
export default function AiSummary({ lead, onGenerateQuotation }: AiSummaryProps) {
  const { openWith } = useCopilot();
  const [streamed, setStreamed] = useState(false);

  const text = useMemo(() => {
    const name = lead.companyName ?? 'This lead';
    const days = Math.max(1, Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 86400000));
    const stage = LeadStageLabels[lead.stage ?? 'new_lead'];
    const quotes = lead.quotations.length;
    const touches7d = lead.activities.filter(
      (a) => Date.now() - new Date(a.date).getTime() < 7 * 86400000,
    ).length;
    const engagement =
      touches7d >= 4 ? `Engagement rising (${touches7d} touches in 7 days)` : touches7d > 0 ? `${touches7d} touch${touches7d > 1 ? 'es' : ''} in the last 7 days` : 'No touches in the last 7 days';
    const prob = Math.min(
      92,
      30 + (lead.stage === 'order_confirmed' ? 60 : lead.stage === 'quotation_negotiation' ? 35 : lead.stage === 'enquiry_visit' ? 18 : 4) + touches7d * 3,
    );
    const rec =
      lead.stage === 'quotation_negotiation'
        ? 'schedule a factory visit this week and lock pricing before validity lapses'
        : lead.stage === 'enquiry_visit'
          ? 'send a tailored quotation within 48 hours'
          : lead.stage === 'order_confirmed'
            ? 'begin onboarding and confirm the first dispatch schedule'
            : 'make a first-touch call and qualify the requirement';
    return `${name} — ${days} days in pipeline, currently in ${stage}. ${quotes > 0 ? `${quotes} quotation${quotes > 1 ? 's' : ''} on record. ` : ''}${engagement}. Recommend: ${rec}; conversion probability ${prob}%.`;
  }, [lead]);

  const words = useMemo(() => text.split(' '), [text]);
  useEffect(() => {
    const t = window.setTimeout(() => setStreamed(true), words.length * 12 + 300);
    return () => window.clearTimeout(t);
  }, [words.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.14 }}
      className="rounded-[28px] bg-surface-2 p-6 shadow-e1"
      style={{ backgroundImage: 'radial-gradient(300px at 100% 0%, rgba(198,255,51,0.07), transparent)' }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-accent-dim text-accent">
          <Sparkles size={16} strokeWidth={1.75} />
        </span>
        <p className="metadata">AI Summary</p>
      </div>
      <p className="text-[14px] leading-relaxed text-secondary">
        {words.map((w, i) => (
          <motion.span
            key={`${i}-${w}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.012 }}
            className="inline-block"
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {streamed && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className="rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent"
          >
            Confidence · High
          </motion.span>
        )}
        <button
          type="button"
          onClick={() => openWith('Email Generator')}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3.5 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <Mail size={13} /> Draft follow-up
        </button>
        <button
          type="button"
          onClick={onGenerateQuotation}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3.5 py-2 text-[12px] font-semibold text-secondary transition-colors hover:text-accent"
        >
          <FileText size={13} /> Generate quotation
        </button>
      </div>
    </motion.section>
  );
}
