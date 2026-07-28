import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { motion } from 'framer-motion';
import {
  BarChart3, Building2, LayoutDashboard, LogIn, LogOut, MapPin,
  MessageSquareWarning, Settings, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/customers', label: 'Customers', icon: Building2 },
  { to: '/visits', label: 'Visits', icon: MapPin },
  { to: '/queries', label: 'Queries', icon: MessageSquareWarning },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Left nav rail — 72px icon rail, expands to 220px on hover (spring width tween). */
export default function Navbar() {
  const [expanded, setExpanded] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <motion.nav
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      initial={false}
      animate={{ width: expanded ? 220 : 72 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="fixed bottom-0 left-0 top-0 z-[70] flex flex-col overflow-hidden border-r border-line bg-surface-1"
    >
      {/* Logo */}
      <Link to="/" className="flex h-16 shrink-0 items-center gap-3 px-[18px]">
        <img src="/logo.svg" alt="SalesOS" className="h-9 w-9 shrink-0" />
        <motion.span
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="whitespace-nowrap font-display text-[17px] font-extrabold tracking-[-0.02em] text-primary"
        >
          SalesOS
        </motion.span>
      </Link>

      {/* Items */}
      <div className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              cn(
                'group relative flex h-11 items-center gap-3.5 rounded-[16px] px-[13px] transition-colors',
                isActive ? 'bg-accent-dim text-accent' : 'text-muted hover:bg-surface-2 hover:text-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-0 h-5 w-1 rounded-full bg-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <Icon size={19} strokeWidth={1.75} className="shrink-0" />
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0 }}
                  transition={{ duration: 0.15, delay: expanded ? i * 0.03 : 0 }}
                  className="whitespace-nowrap text-[13px] font-semibold"
                >
                  {label}
                </motion.span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Bottom: role chip + avatar + auth slot */}
      <div className="flex flex-col gap-2.5 border-t border-line p-3">
        {isLoading ? (
          /* Neutral placeholder while the session resolves */
          <div className="flex items-center gap-3 px-1">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-[12px] bg-surface-3" />
            <motion.div
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              className="flex min-w-0 flex-col gap-1.5 whitespace-nowrap"
            >
              <div className="h-2.5 w-24 animate-pulse rounded-full bg-surface-3" />
              <div className="h-2 w-16 animate-pulse rounded-full bg-surface-3" />
            </motion.div>
          </div>
        ) : isAuthenticated && user ? (
          <>
            <span className="mx-1 w-fit rounded-full bg-surface-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
              {user.role}
            </span>
            <div className="flex items-center gap-3 px-1">
              <Avatar name={user.name ?? 'User'} src={user.avatar ?? undefined} size={36} />
              <motion.div
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 whitespace-nowrap"
              >
                <p className="truncate text-[13px] font-semibold text-primary">{user.name ?? 'Signed in'}</p>
                <p className="truncate text-[11px] text-muted">
                  {user.region ? `${user.region} region` : user.email ?? ''}
                </p>
              </motion.div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              title="Log out"
              className="flex h-10 items-center gap-3.5 rounded-[16px] px-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-secondary"
            >
              <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
              <motion.span
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap text-[13px] font-semibold"
              >
                Log out
              </motion.span>
            </button>
          </>
        ) : (
          <Link
            to={LOGIN_PATH}
            title="Sign in"
            className="flex h-10 items-center gap-3.5 rounded-[16px] px-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-secondary"
          >
            <LogIn size={18} strokeWidth={1.75} className="shrink-0" />
            <motion.span
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap text-[13px] font-semibold"
            >
              Sign in
            </motion.span>
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
