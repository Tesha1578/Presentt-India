import { motion } from 'framer-motion';
import type { HealthGrade } from '@/lib/mock-data';
import { healthColor } from '@/lib/mock-data';

interface HealthRingProps {
  score: number; // 0–100
  grade: HealthGrade;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}

/** 96px SVG ring, track #2A2A2A, stroke by health grade, animated dashoffset. */
export default function HealthRing({ score, grade, size = 96, stroke = 8, showLabel = true }: HealthRingProps) {
  const color = healthColor(grade);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2A2A2A" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - frac) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-extrabold text-primary tabular" style={{ fontSize: size * 0.28 }}>
          {score}
        </span>
        {showLabel && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
            {grade}
          </span>
        )}
      </div>
    </div>
  );
}
