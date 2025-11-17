"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDefaultApiBase } from "@/lib/api";

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const [apiBase, setApiBase] = useState(getDefaultApiBase());
  const [token, setToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    try {
      await login({ token: token.trim() || undefined, apiBase });
      setSuccessMessage("Authenticated! Redirect to the dashboard.");
    } catch {
      // error is handled in context
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03050d] px-4 py-12 text-white">
      <div className="w-full max-w-xl space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>

        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">
            Secure Access
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Sign in with your trading token
          </h1>
          <p className="mt-2 text-white/70">
            Paste a Firebase ID token (or leave empty if the API runs in dev
            mode). We’ll fetch your profile, movements, and hedge fund exposure
            instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block text-sm font-semibold text-white/80">
            API Base URL
            <input
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
              placeholder="http://localhost:3000"
            />
          </label>

          <label className="block text-sm font-semibold text-white/80">
            Firebase ID Token / Dev token
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-2 h-32 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none"
              placeholder="Paste the bearer token…"
            />
          </label>

          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-semibold">Need a quick start?</p>
            <p className="mt-1">
              If the backend runs with <code>DEV_MODE=true</code>, leave the
              token blank and just hit sign in.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400/90 px-6 py-3 text-base font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>

          {error && (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              {successMessage} Open{" "}
              <Link href="/dashboard" className="underline">
                the dashboard
              </Link>{" "}
              to continue.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

