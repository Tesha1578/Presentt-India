/**
 * Demo session — the signed-in CRM user (chosen on the Login screen).
 * Persisted in localStorage; read by the data layer to attribute mutations.
 */
export interface SessionUser {
  id: number;
  unionId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: string;
  region: string | null;
}

const KEY = "salesos.session.user";

let current: SessionUser | null = null;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) current = JSON.parse(raw);
} catch {
  current = null;
}

const listeners = new Set<() => void>();

export function getSessionUser(): SessionUser | null {
  return current;
}

export function setSessionUser(user: SessionUser | null) {
  current = user;
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeSession(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
