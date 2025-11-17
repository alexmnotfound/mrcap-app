"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
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
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">
            {loading ? "Cargando tu espacio de trabajo..." : "Redirigiendo al inicio de sesión..."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">Bienvenido de nuevo, {profile.full_name}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <section className="mb-8 grid gap-6 lg:grid-cols-3">
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Cuentas
              </p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{accounts.length}</p>
              <p className="mt-1 text-sm text-slate-600">
                Vehículos activos a tu nombre
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Fondos de inversión
              </p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {hedgeFunds.length || "—"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Exposiciones actuales a fondos
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Estado
              </p>
              <p className="mt-3 text-4xl font-semibold capitalize text-slate-900">
                {profile.status}
              </p>
              <p className="mt-1 text-sm text-slate-600">Salud del perfil</p>
            </div>
          </section>

          {/* Main Content Grid */}
          <section className="mb-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-900">Movimientos</h2>
                {movementsLoading && (
                  <span className="text-sm text-slate-500">Actualizando…</span>
                )}
              </div>
              {accounts.map((account) => (
                <div key={account.account_id} className="mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                        Cuenta {account.account_number}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        Inversión neta {currency.format(Number(account.net_invested))}
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Efectivo + Participaciones
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Tipo</th>
                          <th className="px-4 py-3 font-medium">Monto / Participaciones</th>
                          <th className="px-4 py-3 font-medium">Detalles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(movements[account.account_id] ?? []).map((movement) => (
                          <tr
                            key={`${movement.type}-${movement.id}`}
                            className="border-t border-slate-100 text-slate-700"
                          >
                            <td className="px-4 py-3">
                              {dateFormat.format(
                                new Date(movement.effective_date)
                              )}
                            </td>
                            <td className="px-4 py-3 capitalize font-medium">
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
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {movement.type === "fund_share"
                                ? `Fondo: ${movement.fund_name ?? "N/A"}`
                                : movement.currency}
                          </td>
                        </tr>
                      ))}
                      {movements[account.account_id]?.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            Aún no hay movimientos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                Aún no se han asignado cuentas.
              </div>
            )}
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-2xl font-semibold text-slate-900">Perfil</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Firebase UID</p>
                    <p className="mt-1 font-mono text-sm text-slate-900 break-all">
                      {profile.firebase_uid}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Creado</p>
                    <p className="mt-1 text-slate-900">
                      {dateFormat.format(new Date(profile.created_at))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium uppercase tracking-wider text-blue-700">
                    Exposición a fondos
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {hedgeFunds.length === 0 && (
                    <p className="text-sm text-blue-700/70">
                      Aún no hay posiciones en fondos.
                    </p>
                  )}
                  {hedgeFunds.map((position) => (
                    <div
                      key={`${position.accountNumber}-${position.fund_id}`}
                      className="rounded-lg border border-blue-200 bg-white p-3"
                    >
                      <p className="text-sm text-blue-700/80">
                        {position.accountNumber} · {position.fund_name}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-900">
                        {position.total_shares} participaciones
                      </p>
                      {position.latest_nav_per_share && (
                        <p className="mt-1 text-xs text-blue-700/70">
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

          {/* Admin Section */}
          {profile.is_admin && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Vista de administrador
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold text-slate-900">Vista general de la firma</h2>
                </div>
                {adminLoading && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-medium text-slate-600">
                    Cargando…
                  </span>
                )}
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Resúmenes de cuentas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Inversor</th>
                        <th className="px-4 py-3 font-medium">Cuenta</th>
                        <th className="px-4 py-3 font-medium">Inversión neta</th>
                        <th className="px-4 py-3 font-medium">Depósitos</th>
                        <th className="px-4 py-3 font-medium">Comisiones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminSummaries.map((summary) => (
                        <tr
                          key={summary.account_id}
                          className="border-t border-slate-100 text-slate-700"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{summary.user_full_name}</div>
                            <div className="text-xs text-slate-500">
                              {summary.user_email}
                            </div>
                          </td>
                          <td className="px-4 py-3">{summary.account_number}</td>
                          <td className="px-4 py-3 font-medium">
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
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            Aún no hay cuentas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Movimientos globales</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Inversor</th>
                        <th className="px-4 py-3 font-medium">Cuenta</th>
                        <th className="px-4 py-3 font-medium">Fecha</th>
                        <th className="px-4 py-3 font-medium">Efectivo</th>
                        <th className="px-4 py-3 font-medium">Participaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminReport.map((row) => (
                        <tr
                          key={`${row.cash_movement_id}-${row.account_id}`}
                          className="border-t border-slate-100 text-slate-700"
                        >
                          <td className="px-4 py-3">{row.user_full_name}</td>
                          <td className="px-4 py-3">{row.account_number}</td>
                          <td className="px-4 py-3">
                            {dateFormat.format(new Date(row.effective_date))}
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize">{row.cash_movement_type}</span> ·{" "}
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
                            className="px-4 py-6 text-center text-slate-500"
                          >
                            Aún no hay movimientos.
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
    </DashboardLayout>
  );
}

