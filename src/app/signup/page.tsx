"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDefaultApiBase } from "@/lib/api";

export default function SignupPage() {
  const { login, error, loading } = useAuth();
  const [apiBase, setApiBase] = useState(getDefaultApiBase());
  const [token, setToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    try {
      await login({ token: token.trim() || undefined, apiBase });
      setSuccessMessage("¡Cuenta creada! Redirigiendo al dashboard.");
    } catch {
      // error is handled in context
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f9ff] px-4 py-12">
      <div className="absolute inset-0 dot-grid opacity-60" />
      <div className="relative z-10 mx-auto flex max-w-xl items-center justify-center">
        <div className="card w-full space-y-8 p-8 lg:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
              Crear cuenta
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              Abrí tu cuenta de trading
            </h1>
            <p className="mt-2 text-slate-600">
              Para crear una cuenta, necesitás un token de Firebase válido. Si
              estás en modo desarrollo, contactá a un administrador para obtener
              acceso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block text-sm font-semibold text-slate-900">
              URL Base de la API
              <input
                value={apiBase}
                onChange={(event) => setApiBase(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="http://localhost:3000"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-900">
              Token de Firebase ID
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Pegá tu token de Firebase…"
                required
              />
            </label>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-900">
              <p className="font-semibold">¿Ya tenés una cuenta?</p>
              <p className="mt-1">
                Si ya tenés una cuenta,{" "}
                <Link href="/login" className="font-semibold underline">
                  iniciá sesión aquí
                </Link>
                .
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </button>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {successMessage && (
              <p className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {successMessage} Abrí{" "}
                <Link href="/dashboard" className="font-semibold underline">
                  el dashboard
                </Link>{" "}
                para continuar.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

