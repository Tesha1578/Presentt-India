import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, Building2, CalendarPlus, FileClock, FilePlus2, MapPin,
  MessageSquareWarning, Search, Users, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc-shim';

const GROUP_ICON: Record<string, LucideIcon> = {
  Leads: Users,
  Customers: Building2,
  Invoices: FileClock,
  Visits: MapPin,
  Queries: MessageSquareWarning,
  Contacts: Users,
  Actions: Zap,
};

const GROUP_ORDER = ['Leads', 'Customers', 'Invoices', 'Visits', 'Queries', 'Contacts', 'Actions'];

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  meta: string;
  href: string;
}

/** Quick actions shown when the query is empty (design §7.6). */
const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'act-create-lead', group: 'Actions', title: 'Create lead', meta: 'Quick action', href: '/leads?new=1' },
  { id: 'act-log-visit', group: 'Actions', title: 'Log visit', meta: 'Quick action', href: '/visits?new=1' },
  { id: 'act-new-query', group: 'Actions', title: 'New query', meta: 'Quick action', href: '/queries?new=1' },
  { id: 'act-gen-quotation', group: 'Actions', title: 'Generate quotation', meta: 'Quick action · AI', href: '/leads?quotation=1' },
];

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

/** ⌘K / Ctrl+K command palette — centered glass modal, grouped live search results. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setCursor(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => {
      setOpen(true);
      setQuery('');
      setCursor(0);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('salesos:open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('salesos:open-palette', onOpen);
    };
  }, []);

  // 200ms debounce before hitting the search router
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const searchQuery = trpc.search.global.useQuery(
    { q: debounced },
    { enabled: open && debounced.length > 0, staleTime: 15_000, retry: 1 },
  );

  const results = useMemo(() => {
    const items: PaletteItem[] =
      debounced.length > 0 ? (searchQuery.data ?? []) : QUICK_ACTIONS;
    const groups = new Map<string, PaletteItem[]>();
    for (const e of items) {
      if (!groups.has(e.group)) groups.set(e.group, []);
      groups.get(e.group)!.push(e);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
      .map(([group, entries]) => ({ group, entries: entries.slice(0, 5) }));
  }, [debounced, searchQuery.data]);

  const flat = results.flatMap((g) => g.entries);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const searching = debounced.length > 0 && searchQuery.isFetching;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(12px)' }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-strong relative w-[640px] max-w-[92vw] overflow-hidden rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search size={17} className="text-muted" strokeWidth={1.75} />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCursor((c) => Math.min(flat.length - 1, c + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  } else if (e.key === 'Enter' && flat[cursor]) {
                    go(flat[cursor].href);
                  }
                }}
                placeholder="Search leads, customers, invoices, visits, queries…"
                className="w-full bg-transparent text-[15px] text-primary placeholder:text-muted focus:outline-none"
              />
              <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted">ESC</kbd>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {searching && results.length === 0 && (
                <div className="flex flex-col gap-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="shimmer-base h-11 rounded-[14px]" />
                  ))}
                </div>
              )}
              {!searching && results.length === 0 && (
                <p className="px-4 py-8 text-center text-[13px] text-muted">No results for “{query}”.</p>
              )}
              {results.map((g) => {
                const GroupIcon = GROUP_ICON[g.group] ?? BarChart3;
                return (
                  <div key={g.group} className="mb-1">
                    <p className="metadata px-3 pb-1 pt-2.5">{g.group}</p>
                    {g.entries.map((e) => {
                      const idx = flat.indexOf(e);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => go(e.href)}
                          onMouseEnter={() => setCursor(idx)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors',
                            idx === cursor ? 'bg-surface-3' : '',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-secondary">
                            <GroupIcon size={14} strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-primary">
                              {highlight(e.title, query)}
                            </span>
                            <span className="block truncate text-[12px] text-muted">{e.meta}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-5 py-3 text-[11px] text-muted">
              <span><kbd className="font-semibold text-secondary">↑↓</kbd> navigate</span>
              <span><kbd className="font-semibold text-secondary">↵</kbd> open</span>
              <span><kbd className="font-semibold text-secondary">⌘↵</kbd> open in new context</span>
              <span className="ml-auto inline-flex items-center gap-1">
                <FilePlus2 size={11} /> Quick actions included
              </span>
              <CalendarPlus size={0} className="hidden" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
