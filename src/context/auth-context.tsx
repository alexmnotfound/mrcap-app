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
import { auth, googleAuthProvider } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";

type AuthContextValue = {
  token: string | null;
  apiBase: string;
  profile: AppUser | null;
  accounts: AccountSummary[];
  loading: boolean;
  error: string | null;
  login: (input: { token?: string; apiBase?: string }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signupWithGoogle: () => Promise<void>;
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
      
      // Try to get user profile
      let me: AppUser;
      try {
        me = await apiFetch<AppUser>("/api/users/me", {
          token: persisted.token ?? undefined,
          baseUrl: persisted.apiBase,
        });
      } catch (err: any) {
        // If user not found, try to create them via signup endpoint
        if (err.message?.includes("User not found") || err.message?.includes("404")) {
          try {
            me = await apiFetch<AppUser>("/api/users/signup", {
              token: persisted.token ?? undefined,
              baseUrl: persisted.apiBase,
              method: "POST",
            });
          } catch (signupErr: any) {
            // If signup fails with "already exists", try getting user again
            if (signupErr.message?.includes("already exists")) {
              me = await apiFetch<AppUser>("/api/users/me", {
                token: persisted.token ?? undefined,
                baseUrl: persisted.apiBase,
              });
            } else {
              throw signupErr;
            }
          }
        } else {
          throw err;
        }
      }

      // Get accounts (might be empty for new users)
      let myAccounts: AccountSummary[] = [];
      try {
        myAccounts = await apiFetch<AccountSummary[]>("/api/accounts/me", {
          token: persisted.token ?? undefined,
          baseUrl: persisted.apiBase,
        });
      } catch (err) {
        // Accounts endpoint might fail for new users, that's okay
        console.warn("Failed to fetch accounts:", err);
      }

      setProfile(me);
      setAccounts(myAccounts);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo cargar el perfil");
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
      // Try to get user profile
      let me: AppUser;
      try {
        me = await apiFetch<AppUser>("/api/users/me", {
          token: nextToken,
          baseUrl: base,
        });
      } catch (err: any) {
        // If user not found, try to create them via signup endpoint
        if (err.message?.includes("User not found") || err.message?.includes("404")) {
          try {
            me = await apiFetch<AppUser>("/api/users/signup", {
              token: nextToken,
              baseUrl: base,
              method: "POST",
            });
          } catch (signupErr: any) {
            // If signup fails with "already exists", try getting user again
            if (signupErr.message?.includes("already exists")) {
              me = await apiFetch<AppUser>("/api/users/me", {
                token: nextToken,
                baseUrl: base,
              });
            } else {
              throw signupErr;
            }
          }
        } else {
          throw err;
        }
      }

      // Get accounts (might be empty for new users)
      let myAccounts: AccountSummary[] = [];
      try {
        myAccounts = await apiFetch<AccountSummary[]>("/api/accounts/me", {
          token: nextToken,
          baseUrl: base,
        });
      } catch (err) {
        // Accounts endpoint might fail for new users, that's okay
        console.warn("Failed to fetch accounts:", err);
      }

      setToken(nextToken ?? null);
      setApiBase(base);
      setProfile(me);
      setAccounts(myAccounts);
      persistState({ token: nextToken ?? null, apiBase: base });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    if (typeof window === "undefined" || !auth) {
      throw new Error("Firebase not initialized");
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await login({ token: idToken });
    } catch (err: any) {
      let errorMessage = "Error al iniciar sesión";
      if (err.code === "auth/user-not-found") {
        errorMessage = "Usuario no encontrado";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "Usuario deshabilitado";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Demasiados intentos. Por favor intentá más tarde";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const loginWithGoogle = useCallback(async () => {
    if (typeof window === "undefined" || !auth) {
      throw new Error("Firebase not initialized");
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      await login({ token: idToken });
    } catch (err: any) {
      let errorMessage = "Login con Google falló";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "El popup fue cerrado. Por favor intentá de nuevo";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Login cancelado";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const signupWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    if (typeof window === "undefined" || !auth) {
      throw new Error("Firebase not initialized");
    }
    setLoading(true);
    setError(null);
    try {
      // Create Firebase account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Update Firebase display name if provided
      if (fullName && userCredential.user) {
        try {
          await userCredential.user.updateProfile({ displayName: fullName });
        } catch (err) {
          console.warn("Failed to update display name:", err);
        }
      }

      // Create user in backend
      await apiFetch<AppUser>("/api/users/signup", {
        token: idToken,
        baseUrl: apiBase || getDefaultApiBase(),
        method: "POST",
      });

      // Login after signup
      await login({ token: idToken });
    } catch (err: any) {
      let errorMessage = "Error al crear cuenta";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está en uso";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil";
      } else if (err.message?.includes("User already exists")) {
        errorMessage = "El usuario ya existe. Intentá iniciar sesión";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBase, login]);

  const signupWithGoogle = useCallback(async () => {
    if (typeof window === "undefined" || !auth) {
      throw new Error("Firebase not initialized");
    }
    setLoading(true);
    setError(null);
    try {
      // Create Firebase account with Google
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();

      // Create user in backend
      try {
        await apiFetch<AppUser>("/api/users/signup", {
          token: idToken,
          baseUrl: apiBase || getDefaultApiBase(),
          method: "POST",
        });
      } catch (signupErr: any) {
        // If user already exists, that's okay - just login
        if (!signupErr.message?.includes("User already exists")) {
          throw signupErr;
        }
      }

      // Login after signup
      await login({ token: idToken });
    } catch (err: any) {
      let errorMessage = "Error al crear cuenta con Google";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "El popup fue cerrado. Por favor intentá de nuevo";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Registro cancelado";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiBase, login]);

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<AccountSummary[]>("/api/accounts/me", {
        token: token ?? undefined,
        baseUrl: apiBase,
      });
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron actualizar las cuentas");
    }
  }, [apiBase, token]);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined" && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.error("Firebase logout error:", err);
      }
    }
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
      loginWithEmail,
      loginWithGoogle,
      signupWithEmail,
      signupWithGoogle,
      logout,
      refreshAccounts,
    }),
    [token, apiBase, profile, accounts, loading, error, login, loginWithEmail, loginWithGoogle, signupWithEmail, signupWithGoogle, logout, refreshAccounts]
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

