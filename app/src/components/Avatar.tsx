import { cn } from '@/lib/utils';

const GRADIENTS = [
  'from-[#C6FF33] to-[#10B981]',
  'from-[#6AB8FF] to-[#6366F1]',
  'from-[#FFB224] to-[#F97316]',
  'from-[#FB7185] to-[#EF4444]',
];

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}

/** Squircle (r-14) avatar — photo if provided, else gradient-initial from name hash. */
export default function Avatar({ name, src, size = 48, className }: AvatarProps) {
  const gradient = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-[14px] bg-surface-2',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-gradient-to-br font-display font-bold text-canvas',
            gradient,
          )}
          style={{ fontSize: size * 0.36 }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}
