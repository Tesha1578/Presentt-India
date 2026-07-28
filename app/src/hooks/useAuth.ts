import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import {
  getSessionUser,
  setSessionUser,
  subscribeSession,
  type SessionUser,
} from "@/lib/session";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type { SessionUser };

/**
 * Local demo auth — same surface as the previous OAuth-backed hook
 * (user / isAuthenticated / isLoading / logout / refresh), backed by the
 * role selected on the Login screen (persisted in localStorage).
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};
  const navigate = useNavigate();

  const user = useSyncExternalStore(subscribeSession, getSessionUser);

  const logout = useCallback(() => {
    setSessionUser(null);
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) navigate(redirectPath);
    }
  }, [redirectOnUnauthenticated, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: false,
      error: null,
      logout,
      refresh: () => Promise.resolve({ data: user }),
    }),
    [user, logout],
  );
}
