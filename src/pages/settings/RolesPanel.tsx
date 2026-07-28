import { motion } from 'framer-motion';
import { Check, Minus, UserPlus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useToasts } from '@/components/Toasts';
import { EASE } from '@/components/analytics/utils';
import { users } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type MatrixRole = 'SuperAdmin' | 'Admin' | 'SalesManager' | 'SalesExecutive' | 'Accounts';

const ROLE_STYLE: Record<MatrixRole, string> = {
  SuperAdmin: 'bg-gradient-to-r from-[#C6FF33] to-[#10B981] text-canvas',
  Admin: 'bg-accent-dim text-accent',
  SalesManager: 'bg-[rgba(106,184,255,0.12)] text-info',
  SalesExecutive: 'bg-surface-3 text-secondary',
  Accounts: 'bg-[rgba(255,178,36,0.12)] text-warning',
};

const PERMISSIONS: { label: string; roles: MatrixRole[] }[] = [
  { label: 'Edit thresholds', roles: ['SuperAdmin', 'Admin'] },
  { label: 'Classification limits', roles: ['SuperAdmin', 'Admin'] },
  { label: 'User management', roles: ['SuperAdmin', 'Admin'] },
  { label: 'Team views & reports', roles: ['SuperAdmin', 'Admin', 'SalesManager'] },
  { label: 'Reassign leads / customers', roles: ['SuperAdmin', 'Admin', 'SalesManager'] },
  { label: 'Payments & invoices', roles: ['SuperAdmin', 'Admin', 'Accounts'] },
  { label: 'Export data', roles: ['SuperAdmin', 'Admin'] },
];

const MATRIX_ROLES: MatrixRole[] = ['SuperAdmin', 'Admin', 'SalesManager', 'SalesExecutive', 'Accounts'];

/** Panel 5 — user cards + role chips + 5×N permissions matrix. */
export default function RolesPanel() {
  const { push } = useToasts();

  return (
    <div className="space-y-6">
      {/* user cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[15px] font-semibold text-primary">Team</h4>
          <button
            type="button"
            onClick={() =>
              push({
                type: 'ai-insight',
                title: 'Invite flow',
                body: 'User invites are provisioned through OAuth — new teammates appear here on first sign-in.',
              })
            }
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-accent-foreground hover:shadow-accent-glow"
          >
            <UserPlus size={13} /> Invite user
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="card-e1 rounded-[24px] p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={u.name} src={u.avatar} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-primary">{u.name}</p>
                  <p className="truncate text-[12px] text-muted">{u.email}</p>
                </div>
              </div>
              <div className="mt-3.5 flex items-center justify-between">
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]', ROLE_STYLE[u.role])}>
                  {u.role}
                </span>
                <span className="text-[11px] text-muted">{u.region}</span>
              </div>
            </motion.div>
          ))}
          {/* demo SuperAdmin card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: EASE }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="card-e1 rounded-[24px] p-5"
          >
            <div className="flex items-center gap-3">
              <Avatar name="Kavya Nair" size={48} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-primary">Kavya Nair</p>
                <p className="truncate text-[12px] text-muted">kavya@salesos.io</p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between">
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]', ROLE_STYLE.SuperAdmin)}>
                SuperAdmin
              </span>
              <span className="text-[11px] text-muted">All regions</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* permissions matrix */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
        className="card-e1 rounded-[24px] p-6"
      >
        <h4 className="text-[15px] font-semibold text-primary">Permissions matrix</h4>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.6fr_repeat(5,1fr)] gap-1">
              <span />
              {MATRIX_ROLES.map((r) => (
                <span key={r} className="pb-2 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                  {r.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </span>
              ))}
              {PERMISSIONS.map((p, rowIdx) => (
                <div key={p.label} className="group contents">
                  <span className="rounded-l-[12px] bg-surface-2 px-4 py-2.5 text-[13px] font-medium text-secondary transition-colors group-hover:bg-surface-3 group-hover:text-primary">
                    {p.label}
                  </span>
                  {MATRIX_ROLES.map((r, colIdx) => {
                    const allowed = p.roles.includes(r);
                    return (
                      <span
                        key={r}
                        className={cn(
                          'flex items-center justify-center py-2.5 transition-colors group-hover:bg-surface-3',
                          colIdx === MATRIX_ROLES.length - 1 ? 'rounded-r-[12px]' : '',
                          'bg-surface-2',
                        )}
                      >
                        {allowed ? (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: rowIdx * 0.05 + colIdx * 0.02, type: 'spring', stiffness: 500, damping: 26 }}
                          >
                            <Check size={14} className="text-accent" strokeWidth={2.5} />
                          </motion.span>
                        ) : (
                          <Minus size={12} className="text-surface-3" />
                        )}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
