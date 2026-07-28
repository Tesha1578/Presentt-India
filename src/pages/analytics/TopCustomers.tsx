import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import ChartCard from '@/components/ChartCard';
import Avatar from '@/components/Avatar';
import CountUp from '@/components/analytics/CountUp';
import { EASE, GRADE_COLORS, inrCompact } from '@/components/analytics/utils';
import { cn } from '@/lib/utils';

interface TopCustomersProps {
  rows: {
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    category: string | null;
    healthGrade: string | null;
    revenue6m: number;
  }[];
}

const AVATARS = ['/avatar-1.png', '/avatar-2.png', '/avatar-3.png', '/avatar-4.png'];

/** Section J — ranked top-customer card list (no table), top 5 + view-all. */
export default function TopCustomers({ rows }: TopCustomersProps) {
  return (
    <ChartCard
      title="Top Customers"
      footer={
        <Link to="/customers" className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-accent">
          View all customers <ArrowRight size={13} />
        </Link>
      }
    >
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: EASE }}
            whileHover={{ y: -2 }}
            className={cn(
              'flex items-center gap-3 rounded-[18px] bg-surface-2 px-4 py-3',
              i === 0 && 'shadow-[0_0_24px_rgba(198,255,51,0.12)]',
            )}
          >
            <span
              className={cn(
                'w-7 font-display text-[22px] font-extrabold tabular',
                i === 0 ? 'text-accent' : 'text-muted',
              )}
            >
              {i + 1}
            </span>
            <Avatar name={r.name} src={AVATARS[i % AVATARS.length]} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-primary">{r.name}</p>
              <p className="text-[11px] text-muted">
                {[r.city, r.region].filter(Boolean).join(' · ')}
                {r.category && (
                  <span className="ml-1.5 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-secondary">
                    {r.category}
                  </span>
                )}
              </p>
            </div>
            {r.healthGrade && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: GRADE_COLORS[r.healthGrade] ?? '#3A3A3A' }}
                title={`${r.healthGrade} health`}
              />
            )}
            <span className="shrink-0 text-[13px] font-semibold text-primary tabular">
              <CountUp value={r.revenue6m} format={inrCompact} />
            </span>
          </motion.div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No revenue recorded yet.</p>}
      </div>
    </ChartCard>
  );
}
