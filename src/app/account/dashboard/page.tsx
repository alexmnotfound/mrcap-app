"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type {
  UserMovement,
} from "@/types/api";

type MovementsMap = Record<number, UserMovement[]>;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
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

  const hedgeFunds = useMemo(() => {
    return accounts.flatMap((account) =>
      account.positions.map((position) => ({
        accountNumber: account.account_number,
        ...position,
      }))
    );
  }, [accounts]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    let totalBalance = 0;
    let totalInvested = 0;

    accounts.forEach((account) => {
      // Sum net_invested for total invested
      totalInvested += Number(account.net_invested) || 0;

      // Sum market_value for all positions (balance)
      account.positions.forEach((position) => {
        if (position.market_value) {
          totalBalance += Number(position.market_value) || 0;
        }
      });
    });

    const gains = totalBalance - totalInvested;

    return {
      balance: totalBalance,
      gains: gains,
      totalInvested: totalInvested,
    };
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
                Balance
              </p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {currency.format(financialMetrics.balance)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Valor total de tu portafolio
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Ganancias
              </p>
              <p
                className={`mt-3 text-4xl font-semibold ${
                  financialMetrics.gains >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {financialMetrics.gains >= 0 ? "+" : ""}
                {currency.format(financialMetrics.gains)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {financialMetrics.gains >= 0 ? "Ganancia" : "Pérdida"} total
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Total Invertido
              </p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {currency.format(financialMetrics.totalInvested)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Inversión neta acumulada
              </p>
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
                                : `${movement.shares_change ? numberFormat.format(Number(movement.shares_change)) : "—"} @ ${
                                    movement.share_price ? numberFormat.format(Number(movement.share_price)) : "—"
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
                        {numberFormat.format(Number(position.total_shares))} participaciones
                      </p>
                      {position.latest_share_value && (
                        <p className="mt-1 text-xs text-blue-700/70">
                          Valor cuota: {numberFormat.format(Number(position.latest_share_value))} ·{" "}
                          {position.currency}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

