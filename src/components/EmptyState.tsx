import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  useIllustration?: boolean;
  className?: string;
}

/** Centered empty state: 64px icon at 24% opacity (or /empty-illustration.svg), title, body, lime CTA. */
export default function EmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  onCta,
  useIllustration,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      {useIllustration ? (
        <img src="/empty-illustration.svg" alt="" className="mb-6 w-[220px] opacity-80" />
      ) : (
        Icon && <Icon size={64} strokeWidth={1.5} className="mb-5 text-muted opacity-[0.24]" />
      )}
      <h3 className="font-display text-[20px] font-bold text-primary">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">{body}</p>}
      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="mt-6 rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-foreground transition-shadow hover:shadow-accent-glow"
        >
          {ctaLabel}
        </button>
      )}
    </motion.div>
  );
}
