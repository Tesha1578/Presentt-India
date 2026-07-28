import { CalendarPlus, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickActionDockProps {
  phone?: string;
  email?: string;
  mapsLink?: string;
  onSchedule?: () => void;
  className?: string;
}

/** Icon dock: Phone / Mail / WhatsApp / Maps / Schedule. Hover: lime icon + scale 1.1. */
export default function QuickActionDock({ phone, email, mapsLink, onSchedule, className }: QuickActionDockProps) {
  const actions = [
    { icon: Phone, label: 'Call', href: phone ? `tel:${phone.replace(/\s/g, '')}` : undefined },
    { icon: Mail, label: 'Email', href: email ? `mailto:${email}` : undefined },
    { icon: MessageCircle, label: 'WhatsApp', href: phone ? `https://wa.me/${phone.replace(/[^\d]/g, '')}` : undefined },
    { icon: MapPin, label: 'Maps', href: mapsLink ?? 'https://maps.google.com' },
  ];

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-secondary transition-colors hover:text-accent';

  return (
    <div className={cn('flex items-center gap-2', className)} onClick={(e) => e.stopPropagation()}>
      {actions.map(({ icon: Icon, label, href }) => (
        <motion.a
          key={label}
          href={href}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel="noreferrer"
          aria-label={label} title={label}
          title={label}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.94 }}
          className={btn}
        >
          <Icon size={15} strokeWidth={1.75} />
        </motion.a>
      ))}
      <motion.button
        type="button"
        aria-label="Schedule visit" title="Schedule visit"
        title="Schedule visit"
        onClick={onSchedule}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.94 }}
        className={btn}
      >
        <CalendarPlus size={15} strokeWidth={1.75} />
      </motion.button>
    </div>
  );
}
