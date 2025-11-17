'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { AccountSummary, AppUser } from "@/types/api";
import { apiFetch, getDefaultApiBase } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  apiBase: string;
  profile: AppUser | null;
  accounts: AccountSummary[];
  loading: boolean;
  error: string | null;
  login: (input: { token?: string; apiBase?: string }) => Promise<void>;
  logout: () => void;
  refreshAccounts: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "mrcap-dashboard-auth";

type PersistedState = {
  token: string | null;
  apiBase: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState<string>(getDefaultApiBase());
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistState = (next: PersistedState | null) => {
    if (typeof window === "undefined") return;
    if (!next) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const bootstrap = async (persisted: PersistedState | null) => {
    if (!persisted) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setToken(persisted.token);
      setApiBase(persisted.apiBase);
      const [me, myAccounts] = await Promise.all([
        apiFetch<AppUser>("/api/users/me", {
          token: persisted.token ?? undefined,
          baseUrl: persisted.apiBase,
        }),
        apiFetch<AccountSummary[]>("/api/accounts/me", {
          token: persisted.token ?? undefined,
          baseUrl: persisted.apiBase,
        }),
      ]);
      setProfile(me);
      setAccounts(myAccounts);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load profile");
      persistState(null);
      setToken(null);
      setProfile(null);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedRaw = window.localStorage.getItem(STORAGE_KEY);
    const saved = savedRaw ? (JSON.parse(savedRaw) as PersistedState) : null;
    bootstrap(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async ({ token: nextToken, apiBase: nextBase }: { token?: string; apiBase?: string }) => {
    setLoading(true);
    setError(null);
    const base = nextBase?.trim() || apiBase || getDefaultApiBase();
    try {
      const [me, myAccounts] = await Promise.all([
        apiFetch<AppUser>("/api/users/me", {
          token: nextToken,
          baseUrl: base,
        }),
        apiFetch<AccountSummary[]>("/api/accounts/me", {
          token: nextToken,
          baseUrl: base,
        }),
      ]);
      setToken(nextToken ?? null);
      setApiBase(base);
      setProfile(me);
      setAccounts(myAccounts);
      persistState({ token: nextToken ?? null, apiBase: base });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<AccountSummary[]>("/api/accounts/me", {
        token: token ?? undefined,
        baseUrl: apiBase,
      });
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh accounts");
    }
  }, [apiBase, token]);

  const logout = useCallback(() => {
    setToken(null);
    setProfile(null);
    setAccounts([]);
    setError(null);
    persistState(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      apiBase,
      profile,
      accounts,
      loading,
      error,
      login,
      logout,
      refreshAccounts,
    }),
    [token, apiBase, profile, accounts, loading, error, login, logout, refreshAccounts]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

