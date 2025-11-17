"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, ArrowRight, DollarSign } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type { Fund } from "@/types/api";

export default function FundsPage() {
  const router = useRouter();
  const { profile, loading, token, apiBase } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundsError, setFundsError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || !token) return;

    let cancelled = false;
    async function fetchFunds() {
      setFundsLoading(true);
      setFundsError(null);
      try {
        const data = await apiFetch<Fund[]>("/api/funds", {
          token: token ?? undefined,
          baseUrl: apiBase,
        });
        if (!cancelled) {
          setFunds(data);
        }
      } catch (err) {
        if (!cancelled) {
          setFundsError(err instanceof Error ? err.message : "Failed to load funds");
        }
      } finally {
        if (!cancelled) {
          setFundsLoading(false);
        }
      }
    }
    fetchFunds();
    return () => {
      cancelled = true;
    };
  }, [profile, token, apiBase]);

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">
            {loading ? "Loading..." : "Redirecting to login..."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Funds</h1>
            <p className="mt-2 text-slate-600">
              View and track your available funds
            </p>
          </div>

          {fundsError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {fundsError}
            </div>
          )}

          {fundsLoading ? (
            <div className="card p-12 text-center">
              <p className="text-slate-600">Loading funds...</p>
            </div>
          ) : funds.length === 0 ? (
            <div className="card p-12 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                No Funds Available
              </h2>
              <p className="mt-2 text-slate-600">
                There are no funds available at this time.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {funds.map((fund) => (
                <Link
                  key={fund.id}
                  href={`/account/funds/${fund.id}`}
                  className="card group p-6 transition hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {fund.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                            <DollarSign className="h-4 w-4" />
                            <span>{fund.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">View details</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

