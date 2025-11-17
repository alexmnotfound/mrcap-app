"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, BarChart3, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import type {
  AccountSummary,
  MovementReportRow,
  UserMovement,
} from "@/types/api";

type MovementsMap = Record<number, UserMovement[]>;

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

export default function DashboardPage() {
  const router = useRouter();
  const {
    profile,
    accounts,
    loading,
    token,
    apiBase,
    logout,
    error,
  } = useAuth();
  const [movements, setMovements] = useState<MovementsMap>({});
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [adminSummaries, setAdminSummaries] = useState<AccountSummary[]>([]);
  const [adminReport, setAdminReport] = useState<MovementReportRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile || accounts.length === 0) return;
    let cancelled = false;
    async function fetchMovements() {
      setMovementsLoading(true);
      try {
        const entries = await Promise.all(
          accounts.map(async (account) => {
            const data = await apiFetch<UserMovement[]>(
              `/api/movements/account/${account.account_id}`,
              {
                token: token ?? undefined,
                baseUrl: apiBase,
              }
            );
            return [account.account_id, data] as const;
          })
        );
        if (!cancelled) {
          const next: MovementsMap = {};
          entries.forEach(([accountId, data]) => {
            next[accountId] = data;
          });
          setMovements(next);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setMovementsLoading(false);
        }
      }
    }
    fetchMovements();
    return () => {
      cancelled = true;
    };
  }, [accounts, apiBase, profile, token]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    let cancelled = false;
    async function fetchAdminData() {
      setAdminLoading(true);
      try {
        const [summary, report] = await Promise.all([
          apiFetch<AccountSummary[]>("/api/accounts/summary", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
          apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
        ]);
        if (!cancelled) {
          setAdminSummaries(summary);
          setAdminReport(report);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    }
    fetchAdminData();
    return () => {
      cancelled = true;
    };
  }, [apiBase, profile?.is_admin, token]);

  const hedgeFunds = useMemo(() => {
    return accounts.flatMap((account) =>
      account.positions.map((position) => ({
        accountNumber: account.account_number,
        ...position,
      }))
    );
  }, [accounts]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04050d] text-white">
        <p className="text-white/70">
          {loading ? "Loading your workspace..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04050d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{profile.full_name}</h1>
            <p className="text-white/70">{profile.email}</p>
          </div>
          <div className="flex gap-3">
            {profile.is_admin && (
              <div className="rounded-full border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-200">
                Admin
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">
              Accounts
            </p>
            <p className="mt-3 text-4xl font-semibold">{accounts.length}</p>
            <p className="mt-1 text-sm text-white/60">
              Active vehicles in your name
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">
              Hedge funds
            </p>
            <p className="mt-3 text-4xl font-semibold">
              {hedgeFunds.length || "—"}
            </p>
            <p className="mt-1 text-sm text-white/60">
              Current fund exposures
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">
              Status
            </p>
            <p className="mt-3 text-4xl font-semibold capitalize">
              {profile.status}
            </p>
            <p className="mt-1 text-sm text-white/60">Profile health</p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Movements</h2>
              {movementsLoading && (
                <span className="text-sm text-white/60">Refreshing…</span>
              )}
            </div>
            {accounts.map((account) => (
              <div key={account.account_id} className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-white/50">
                      Account {account.account_number}
                    </p>
                    <p className="text-lg font-semibold">
                      Net invested {currency.format(Number(account.net_invested))}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-1 text-xs text-white/60">
                    Cash + Fund Share
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/5 text-left text-white/60">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Amount / Shares</th>
                        <th className="px-4 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movements[account.account_id] ?? []).map((movement) => (
                        <tr
                          key={`${movement.type}-${movement.id}`}
                          className="border-t border-white/5 text-white/80"
                        >
                          <td className="px-4 py-3">
                            {dateFormat.format(
                              new Date(movement.effective_date)
                            )}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            {movement.type === "cash"
                              ? movement.cash_type
                              : movement.share_movement_type}
                          </td>
                          <td className="px-4 py-3">
                            {movement.type === "cash"
                              ? currency.format(Number(movement.amount ?? 0))
                              : `${movement.shares_change ?? "—"} @ ${
                                  movement.share_price ?? "—"
                                }`}
                          </td>
                          <td className="px-4 py-3 text-xs text-white/60">
                            {movement.type === "fund_share"
                              ? `Fund: ${movement.fund_name ?? "N/A"}`
                              : movement.currency}
                          </td>
                        </tr>
                      ))}
                      {movements[account.account_id]?.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-white/50"
                          >
                            No movements recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6 text-white/60">
                No accounts assigned yet.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold">Profile</h2>
              <p className="mt-4 text-sm text-white/60">Firebase UID</p>
              <p className="font-mono text-sm text-white/80">
                {profile.firebase_uid}
              </p>
              <p className="mt-4 text-sm text-white/60">Created</p>
              <p className="text-white/80">
                {dateFormat.format(new Date(profile.created_at))}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-50">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5" />
                <p className="text-sm uppercase tracking-[0.4em]">
                  Hedge fund exposure
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {hedgeFunds.length === 0 && (
                  <p className="text-sm text-emerald-100/80">
                    No fund positions yet.
                  </p>
                )}
                {hedgeFunds.map((position) => (
                  <div
                    key={`${position.accountNumber}-${position.fund_id}`}
                    className="rounded-2xl border border-emerald-400/20 bg-black/10 p-3"
                  >
                    <p className="text-sm text-emerald-100/70">
                      {position.accountNumber} · {position.fund_name}
                    </p>
                    <p className="text-lg font-semibold">
                      {position.total_shares} shares
                    </p>
                    {position.latest_nav_per_share && (
                      <p className="text-xs text-emerald-100/70">
                        NAV {position.latest_nav_per_share} ·{" "}
                        {position.currency}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {profile.is_admin && (
          <section className="mt-12 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/50">
                  Admin view
                </p>
                <h2 className="text-3xl font-semibold">Firmwide overview</h2>
              </div>
              {adminLoading && (
                <span className="rounded-full border border-white/10 px-4 py-1 text-xs text-white/70">
                  Loading…
                </span>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 text-white/70">
                <BarChart3 className="h-5 w-5" />
                <h3 className="text-xl font-semibold">Account summaries</h3>
              </div>
              <div className="mt-4 overflow-x-auto text-sm">
                <table className="min-w-full">
                  <thead className="bg-white/5 text-left text-white/60">
                    <tr>
                      <th className="px-4 py-2">Investor</th>
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2">Net invested</th>
                      <th className="px-4 py-2">Deposits</th>
                      <th className="px-4 py-2">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSummaries.map((summary) => (
                      <tr
                        key={summary.account_id}
                        className="border-t border-white/5 text-white/80"
                      >
                        <td className="px-4 py-3">
                          {summary.user_full_name}
                          <p className="text-xs text-white/50">
                            {summary.user_email}
                          </p>
                        </td>
                        <td className="px-4 py-3">{summary.account_number}</td>
                        <td className="px-4 py-3">
                          {currency.format(Number(summary.net_invested))}
                        </td>
                        <td className="px-4 py-3">
                          {currency.format(Number(summary.total_deposits))}
                        </td>
                        <td className="px-4 py-3">
                          {currency.format(Number(summary.total_fees))}
                        </td>
                      </tr>
                    ))}
                    {adminSummaries.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-white/50"
                        >
                          No accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 text-white/70">
                <ArrowRight className="h-5 w-5" />
                <h3 className="text-xl font-semibold">Global movements</h3>
              </div>
              <div className="mt-4 overflow-x-auto text-sm">
                <table className="min-w-full">
                  <thead className="bg-white/5 text-left text-white/60">
                    <tr>
                      <th className="px-4 py-2">Investor</th>
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Cash</th>
                      <th className="px-4 py-2">Fund shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminReport.map((row) => (
                      <tr
                        key={`${row.cash_movement_id}-${row.account_id}`}
                        className="border-t border-white/5 text-white/80"
                      >
                        <td className="px-4 py-3">{row.user_full_name}</td>
                        <td className="px-4 py-3">{row.account_number}</td>
                        <td className="px-4 py-3">
                          {dateFormat.format(new Date(row.effective_date))}
                        </td>
                        <td className="px-4 py-3">
                          {row.cash_movement_type} ·{" "}
                          {currency.format(Number(row.amount))}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.shares_change
                            ? `${row.shares_change} @ ${row.share_price}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {adminReport.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-white/50"
                        >
                          No movements yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

