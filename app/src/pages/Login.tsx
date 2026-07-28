import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { listUsers } from '@/lib/data';
import { setSessionUser, type SessionUser } from '@/lib/session';
import { cn } from '@/lib/utils';

const FALLBACK_USERS: SessionUser[] = [
  { id: 6, unionId: 'seed-arjun-mehta', name: 'Arjun Mehta', email: null, avatar: '/avatar-1.png', role: 'sales_manager', region: 'West' },
  { id: 7, unionId: 'seed-priya-sharma', name: 'Priya Sharma', email: null, avatar: '/avatar-2.png', role: 'sales_executive', region: 'West' },
  { id: 8, unionId: 'seed-rohit-verma', name: 'Rohit Verma', email: null, avatar: '/avatar-3.png', role: 'admin', region: null },
  { id: 9, unionId: 'seed-sneha-kulkarni', name: 'Sneha Kulkarni', email: null, avatar: '/avatar-4.png', role: 'accounts', region: null },
  { id: 10, unionId: 'seed-vikram-malhotra', name: 'Vikram Malhotra', email: null, avatar: '/avatar-1.png', role: 'super_admin', region: null },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  sales_executive: 'Sales Executive',
  accounts: 'Accounts',
  user: 'User',
};

export default function Login() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SessionUser[]>(FALLBACK_USERS);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    listUsers()
      .then((rows) => {
        if (rows.length > 0) setUsers(rows as SessionUser[]);
      })
      .catch(() => {
        /* offline — keep fallback roster */
      });
  }, []);

  const enter = () => {
    const user = users.find((u) => u.id === selected);
    if (!user) return;
    setSessionUser(user);
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas">
      <img
        src="/login-ambient.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/70 to-canvas" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[460px] rounded-[32px] bg-surface-1/70 p-9 shadow-e3 backdrop-blur-xl"
      >
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.svg" alt="SalesOS" className="h-10 w-10" />
          <div>
            <h1 className="font-display text-[22px] font-bold text-primary">SalesOS</h1>
            <p className="metadata">AI-native CRM workspace</p>
          </div>
        </div>

        <h2 className="mb-1.5 font-display text-[28px] font-bold leading-tight text-primary">
          Choose your workspace
        </h2>
        <p className="mb-7 flex items-center gap-2 text-[13px] text-muted">
          <Sparkles size={13} className="text-accent" /> Demo sign-in — pick a role to enter as that user.
        </p>

        <div className="mb-7 flex flex-col gap-2.5">
          {users.map((u, i) => (
            <motion.button
              key={u.id}
              type="button"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: 'easeOut' }}
              onClick={() => setSelected(u.id)}
              className={cn(
                'flex items-center gap-3.5 rounded-[20px] p-3 text-left transition-all duration-200',
                selected === u.id
                  ? 'bg-accent-dim ring-1 ring-accent/60 shadow-[0_0_24px_rgba(198,255,51,0.12)]'
                  : 'bg-surface-2 hover:bg-surface-3',
              )}
            >
              <img
                src={u.avatar ?? '/avatar-1.png'}
                alt={u.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-primary">{u.name}</p>
                <p className="metadata">{ROLE_LABELS[u.role] ?? u.role}{u.region ? ` · ${u.region}` : ''}</p>
              </div>
              {selected === u.id && <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_#C6FF33]" />}
            </motion.button>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={enter}
          disabled={selected === null}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold transition-all',
            selected !== null
              ? 'bg-accent text-[#0C1200] shadow-[0_8px_30px_rgba(198,255,51,0.35)] hover:shadow-[0_8px_40px_rgba(198,255,51,0.5)]'
              : 'cursor-not-allowed bg-surface-3 text-muted',
          )}
        >
          Enter SalesOS <ArrowRight size={17} />
        </motion.button>
      </motion.div>
    </div>
  );
}
