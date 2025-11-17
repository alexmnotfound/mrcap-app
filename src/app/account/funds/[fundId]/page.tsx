"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type { FundPerformance } from "@/types/api";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function FundDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fundId = params?.fundId ? parseInt(params.fundId as string) : null;
  const { profile, loading, token, apiBase } = useAuth();
  const [performance, setPerformance] = useState<FundPerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || !token || !fundId) return;

    let cancelled = false;
    async function fetchPerformance() {
      setPerformanceLoading(true);
      setError(null);
      try {
        const data = await apiFetch<FundPerformance>(
          `/api/funds/${fundId}/performance?limit=30`,
          {
            token: token ?? undefined,
            baseUrl: apiBase,
          }
        );
        if (!cancelled) {
          setPerformance(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load fund performance"
          );
        }
      } finally {
        if (!cancelled) {
          setPerformanceLoading(false);
        }
      }
    }
    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [profile, token, apiBase, fundId]);

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

  if (!fundId) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-7xl">
            <div className="card p-12 text-center">
              <p className="text-slate-600">Invalid fund ID</p>
              <Link
                href="/account/funds"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Back to Funds
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const navData = performance?.navs || [];
  const hasNavData = navData.length > 0;
  const latestNav = performance?.latest_nav_per_share
    ? Number(performance.latest_nav_per_share)
    : null;
  const previousNav =
    navData.length > 1 && navData[navData.length - 2]
      ? Number(navData[navData.length - 2].nav_per_share)
      : null;
  const navChange =
    latestNav && previousNav
      ? ((latestNav - previousNav) / previousNav) * 100
      : null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/account/funds"
              className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Funds
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900">
              {performance?.fund_name || "Fund"}
            </h1>
            {performance && (
              <div className="mt-2 flex items-center gap-4 text-slate-600">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>{performance.currency}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {performanceLoading ? (
            <div className="card p-12 text-center">
              <p className="text-slate-600">Loading fund performance...</p>
            </div>
          ) : !performance ? (
            <div className="card p-12 text-center">
              <p className="text-slate-600">Fund not found</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="mb-8 grid gap-6 md:grid-cols-3">
                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Latest NAV
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {latestNav
                      ? currency.format(latestNav)
                      : "—"}
                  </p>
                  {navChange !== null && (
                    <p
                      className={`mt-1 text-sm font-medium ${
                        navChange >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {navChange >= 0 ? "+" : ""}
                      {navChange.toFixed(2)}%
                    </p>
                  )}
                </div>

                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    NAV Points
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {navData.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Historical data points
                  </p>
                </div>

                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Latest AUM
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {hasNavData && navData[navData.length - 1]?.total_aum
                      ? currency.format(Number(navData[navData.length - 1].total_aum))
                      : "—"}
                  </p>
                  {hasNavData && navData[navData.length - 1]?.as_of_date && (
                    <p className="mt-1 text-sm text-slate-600">
                      As of{" "}
                      {dateFormat.format(
                        new Date(navData[navData.length - 1].as_of_date)
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* NAV History Table */}
              {hasNavData && (
                <div className="card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-slate-900">
                      NAV History
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">NAV per Share</th>
                          <th className="px-4 py-3 font-medium">Total AUM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...navData].reverse().map((nav, idx) => {
                          const currentNav = Number(nav.nav_per_share);
                          // navData is sorted chronologically [oldest, ..., newest]
                          // After reverse, we have [newest, ..., oldest]
                          // For each item at idx, compare with the previous chronological entry at idx+1
                          const prevNav =
                            idx + 1 < navData.length
                              ? Number(navData[navData.length - 2 - idx]?.nav_per_share)
                              : null;
                          const change =
                            prevNav !== null
                              ? ((currentNav - prevNav) / prevNav) * 100
                              : null;

                          return (
                            <tr
                              key={nav.as_of_date}
                              className="border-t border-slate-100 text-slate-700"
                            >
                              <td className="px-4 py-3">
                                {dateFormat.format(new Date(nav.as_of_date))}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  {currency.format(currentNav)}
                                  {change !== null && (
                                    <span
                                      className={`text-xs ${
                                        change >= 0 ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {change >= 0 ? "+" : ""}
                                      {change.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {currency.format(Number(nav.total_aum))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!hasNavData && (
                <div className="card p-12 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-slate-400" />
                  <h2 className="mt-4 text-xl font-semibold text-slate-900">
                    No Performance Data
                  </h2>
                  <p className="mt-2 text-slate-600">
                    No NAV data available for this fund yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

