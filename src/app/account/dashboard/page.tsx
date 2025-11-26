"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type {
  UserMovement,
  FundPerformance,
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
  const [fundPerformance, setFundPerformance] = useState<FundPerformance[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());

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

  // Fetch fund performance data
  useEffect(() => {
    if (!profile || accounts.length === 0) return;
    let cancelled = false;
    async function fetchPerformance() {
      setPerformanceLoading(true);
      try {
        // Get unique fund IDs from positions
        const fundIds = new Set<number>();
        accounts.forEach((account) => {
          account.positions.forEach((position) => {
            if (position.fund_id) {
              fundIds.add(position.fund_id);
            }
          });
        });

        // Fetch performance for each fund
        const performanceData = await Promise.all(
          Array.from(fundIds).map(async (fundId) => {
            try {
              return await apiFetch<FundPerformance>(
                `/api/funds/${fundId}/performance?limit=100`,
                {
                  token: token ?? undefined,
                  baseUrl: apiBase,
                }
              );
            } catch (err) {
              console.error(`Error fetching performance for fund ${fundId}:`, err);
              return null;
            }
          })
        );

        if (!cancelled) {
          setFundPerformance(performanceData.filter((p): p is FundPerformance => p !== null));
        }
      } catch (err) {
        console.error(err);
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
  }, [accounts, apiBase, profile, token]);

  // Debug: Log accounts data to verify commission_rate
  useEffect(() => {
    if (accounts.length > 0) {
      console.log("[Dashboard] Accounts data:", accounts.map(acc => ({
        account_id: acc.account_id,
        account_number: acc.account_number,
        commission_rate: acc.commission_rate,
      })));
    }
  }, [accounts]);

  const hedgeFunds = useMemo(() => {
    return accounts.flatMap((account) =>
      account.positions.map((position) => ({
        accountNumber: account.account_number,
        ...position,
      }))
    );
  }, [accounts]);

  // Get commission rate for an account from the account data
  const getCommissionRate = (accountNumber: string): number => {
    const account = accounts.find((acc) => acc.account_number === accountNumber);
    if (account?.commission_rate) {
      const rate = Number(account.commission_rate);
      console.log(`[Commission] Account ${accountNumber}: commission_rate=${account.commission_rate}, parsed=${rate}`);
      return rate;
    }
    console.warn(`[Commission] Account ${accountNumber}: commission_rate not found, defaulting to 0.15`);
    // Default to 15% if not specified
    return 0.15;
  };

  // Extract share purchases and calculate evolution
  const sharePurchases = useMemo(() => {
    const purchases: Array<{
      id: number;
      date: Date;
      accountNumber: string;
      fundId: number;
      fundName: string;
      shares: number;
      buyPrice: number;
      currency: string;
      totalAmount: number;
    }> = [];

    Object.entries(movements).forEach(([accountId, accountMovements]) => {
      const account = accounts.find((a) => a.account_id === Number(accountId));
      if (!account) return;

      accountMovements.forEach((movement) => {
        if (
          movement.type === "fund_share" &&
          movement.share_movement_type === "subscription" &&
          movement.fund_id &&
          movement.shares_change &&
          movement.share_price
        ) {
          const shares = Number(movement.shares_change);
          const buyPrice = Number(movement.share_price);
          const baseAmount = shares * buyPrice;
          const totalAmount = movement.total_amount ? Number(movement.total_amount) : baseAmount;

          purchases.push({
            id: movement.id,
            date: new Date(movement.effective_date),
            accountNumber: account.account_number,
            fundId: movement.fund_id,
            fundName: movement.fund_name || "N/A",
            shares: shares,
            buyPrice: buyPrice,
            currency: movement.currency || "USD",
            totalAmount: totalAmount,
          });
        }
      });
    });

    // Sort by date
    purchases.sort((a, b) => a.date.getTime() - b.date.getTime());
    return purchases;
  }, [movements, accounts]);

  // Enhance purchases with current values, earnings, and commission (based on gains)
  const sharePurchasesWithMetrics = useMemo(() => {
    return sharePurchases.map((purchase) => {
      const performance = fundPerformance.find((p) => p.fund_id === purchase.fundId);
      const currentShareValue = performance?.latest_share_value
        ? Number(performance.latest_share_value)
        : purchase.buyPrice;
      const currentValue = purchase.shares * currentShareValue;
      const earnings = currentValue - purchase.totalAmount;
      
      // Commission is calculated as a percentage of gains (only if there are gains)
      const commissionRate = getCommissionRate(purchase.accountNumber);
      const commission = earnings > 0 ? earnings * commissionRate : 0;

      // Final amount = Monto en dólares + ganancias - comisiones
      const finalAmount = purchase.totalAmount + earnings - commission;

      return {
        ...purchase,
        currentValue,
        earnings,
        commission,
        finalAmount,
      };
    });
  }, [sharePurchases, fundPerformance]);

  // Calculate financial metrics (after sharePurchasesWithMetrics is calculated)
  const financialMetrics = useMemo(() => {
    // Wait for sharePurchasesWithMetrics to be calculated if we have purchases
    // This ensures commissions are included in the calculations
    const hasPurchases = sharePurchases.length > 0;
    const metricsReady = !hasPurchases || sharePurchasesWithMetrics.length > 0;
    
    if (!metricsReady) {
      return {
        balance: null,
        gains: null,
        totalInvested: 0,
      };
    }

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

    // Calculate total commissions based on purchases (if available)
    let totalCommissions = 0;
    if (sharePurchasesWithMetrics.length > 0) {
      totalCommissions = sharePurchasesWithMetrics.reduce((sum, purchase) => {
        return sum + purchase.commission;
      }, 0);
    }

    // Net balance after commissions
    const netBalance = totalBalance - totalCommissions;
    const gains = totalBalance - totalInvested;
    // Net gains after commissions
    const netGains = gains - totalCommissions;

    return {
      balance: netBalance,
      gains: netGains,
      totalInvested: totalInvested,
    };
  }, [accounts, sharePurchasesWithMetrics, sharePurchases]);

  // Calculate evolution per month for each purchase
  const purchaseEvolution = useMemo(() => {
    if (sharePurchases.length === 0 || fundPerformance.length === 0) return [];

    return sharePurchases.map((purchase) => {
      const performance = fundPerformance.find((p) => p.fund_id === purchase.fundId);
      if (!performance || !performance.navs || performance.navs.length === 0) {
        return {
          purchase,
          evolution: [],
        };
      }

      // Get NAV data for months since purchase
      const purchaseDate = new Date(purchase.date);
      const purchaseYear = purchaseDate.getFullYear();
      const purchaseMonth = purchaseDate.getMonth();

      // Filter NAVs from purchase month onwards
      const navsSincePurchase = performance.navs.filter((nav) => {
        const navDate = new Date(nav.as_of_date);
        return navDate >= new Date(purchaseYear, purchaseMonth, 1);
      });

      if (navsSincePurchase.length === 0) {
        return {
          purchase,
          evolution: [],
        };
      }

      // Group NAVs by month (one NAV per month)
      const monthlyNavs = new Map<string, typeof navsSincePurchase[0]>();
      navsSincePurchase.forEach((nav) => {
        const navDate = new Date(nav.as_of_date);
        const monthKey = `${navDate.getFullYear()}-${String(navDate.getMonth() + 1).padStart(2, "0")}`;
        // Keep the latest NAV for each month
        if (!monthlyNavs.has(monthKey)) {
          monthlyNavs.set(monthKey, nav);
        } else {
          const existing = monthlyNavs.get(monthKey)!;
          const existingDate = new Date(existing.as_of_date);
          if (navDate > existingDate) {
            monthlyNavs.set(monthKey, nav);
          }
        }
      });

      // Calculate evolution for each month
      const evolution = Array.from(monthlyNavs.entries())
        .map(([monthKey, nav]) => {
          const navDate = new Date(nav.as_of_date);
          const monthLabel = navDate.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
          const shareValue = Number(nav.share_value);
          const value = purchase.shares * shareValue;
          const totalCost = purchase.shares * purchase.buyPrice;
          const gain = value - totalCost;
          const gainPercent = purchase.buyPrice > 0 ? (gain / totalCost) * 100 : 0;

          return {
            month: monthLabel,
            monthDate: new Date(navDate.getFullYear(), navDate.getMonth(), 1),
            shareValue,
            value,
            gain,
            gainPercent,
          };
        })
        .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());

      return {
        purchase,
        evolution,
      };
    });
  }, [sharePurchases, fundPerformance]);

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

          {/* Section General */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-slate-900">General</h2>
            <div className="grid gap-6 lg:grid-cols-4">
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Balance
              </p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {financialMetrics.balance !== null
                  ? currency.format(financialMetrics.balance)
                  : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Valor total de tu portafolio
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Rendimiento
              </p>
              <p
                className={`mt-3 text-4xl font-semibold ${
                  financialMetrics.gains === null
                    ? "text-slate-900"
                    : financialMetrics.gains >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {financialMetrics.gains !== null ? (
                  <>
                    {financialMetrics.gains >= 0 ? "+" : ""}
                    {currency.format(financialMetrics.gains)}
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {financialMetrics.gains !== null
                  ? financialMetrics.gains >= 0
                    ? "Ganancia"
                    : "Pérdida"
                  : ""}{" "}
                total
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

          {/* Section Inversiones */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-slate-900">Inversiones</h2>
            <div className="space-y-6">
              <div className="card border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-slate-900" />
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-900">
                    Participaciones y Evolución
                  </p>
                </div>
                <div className="mt-4 space-y-4">
                  {performanceLoading ? (
                    <p className="text-sm text-slate-600">Cargando evolución...</p>
                  ) : sharePurchasesWithMetrics.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Aún no hay compras de participaciones registradas.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Share purchases at buy time */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                          Participaciones al momento de compra
                        </h3>
                        <div className="overflow-x-auto">
                          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full text-xs">
                              <thead className="bg-slate-50 text-left text-slate-700">
                                <tr>
                                  <th className="px-3 py-2 font-medium">Fecha</th>
                                  <th className="px-3 py-2 font-medium">Fondo</th>
                                  <th className="px-3 py-2 font-medium text-right">Participaciones</th>
                                  <th className="px-3 py-2 font-medium text-right">Precio compra</th>
                                  <th className="px-3 py-2 font-medium text-right">Monto en dólares</th>
                                  <th className="px-3 py-2 font-medium text-right">Rendimiento</th>
                                  <th className="px-3 py-2 font-medium text-right">Comisiones</th>
                                  <th className="px-3 py-2 font-medium text-right">Monto final</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sharePurchasesWithMetrics.map((purchase) => (
                                  <tr
                                    key={purchase.id}
                                    className="border-t border-slate-100 text-slate-900"
                                  >
                                    <td className="px-3 py-2">
                                      {dateFormat.format(purchase.date)}
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      {purchase.fundName}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {numberFormat.format(purchase.shares)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {currency.format(purchase.buyPrice)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {currency.format(purchase.totalAmount)}
                                    </td>
                                    <td
                                      className={`px-3 py-2 text-right font-medium ${
                                        purchase.earnings >= 0 ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {purchase.earnings >= 0 ? "+" : ""}
                                      {currency.format(purchase.earnings)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-red-500">
                                      {currency.format(purchase.commission)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-green-600">
                                      {currency.format(purchase.finalAmount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Monthly evolution per purchase */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                          Evolución mensual
                        </h3>
                        <div className="space-y-3">
                          {purchaseEvolution.map((item, idx) => {
                            if (item.evolution.length === 0) return null;
                            
                            const isExpanded = expandedPurchases.has(item.purchase.id);
                            const latestEvolution = item.evolution[item.evolution.length - 1];
                            const purchaseWithMetrics = sharePurchasesWithMetrics.find(
                              (p) => p.id === item.purchase.id
                            );
                            const toggleExpanded = () => {
                              const newExpanded = new Set(expandedPurchases);
                              if (isExpanded) {
                                newExpanded.delete(item.purchase.id);
                              } else {
                                newExpanded.add(item.purchase.id);
                              }
                              setExpandedPurchases(newExpanded);
                            };
                            
                            return (
                              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                  onClick={toggleExpanded}
                                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-slate-600" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-600" />
                                    )}
                                    <div>
                                      <p className="text-xs font-semibold text-slate-900">
                                        {item.purchase.fundName} - Comprado el {dateFormat.format(item.purchase.date)}
                                      </p>
                                      <p className="text-xs text-slate-600 mt-0.5">
                                        {numberFormat.format(item.purchase.shares)} participaciones @ {currency.format(item.purchase.buyPrice)} · Monto: {currency.format(purchaseWithMetrics?.totalAmount || 0)} · Valor actual: {currency.format(latestEvolution?.value || 0)} ({latestEvolution?.gainPercent >= 0 ? "+" : ""}{latestEvolution ? numberFormat.format(latestEvolution.gainPercent) : "0.00"}%)
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-600 font-medium">
                                    {isExpanded ? "Ocultar" : "Ver detalles"}
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div className="overflow-hidden border-t border-slate-200 bg-white">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-slate-50 text-left text-slate-700">
                                        <tr>
                                          <th className="px-3 py-2 font-medium">Mes</th>
                                          <th className="px-3 py-2 font-medium text-right">Valor cuota</th>
                                          <th className="px-3 py-2 font-medium text-right">Valor total</th>
                                          <th className="px-3 py-2 font-medium text-right">Rendimiento</th>
                                          <th className="px-3 py-2 font-medium text-right">%</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.evolution.map((month, monthIdx) => (
                                          <tr
                                            key={monthIdx}
                                            className="border-t border-slate-100 text-slate-900"
                                          >
                                            <td className="px-3 py-2 font-medium">
                                              {month.month}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {currency.format(month.shareValue)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {currency.format(month.value)}
                                            </td>
                                            <td
                                              className={`px-3 py-2 text-right font-medium ${
                                                month.gain >= 0 ? "text-green-600" : "text-red-600"
                                              }`}
                                            >
                                              {month.gain >= 0 ? "+" : ""}
                                              {currency.format(month.gain)}
                                            </td>
                                            <td
                                              className={`px-3 py-2 text-right font-medium ${
                                                month.gainPercent >= 0 ? "text-green-600" : "text-red-600"
                                              }`}
                                            >
                                              {month.gainPercent >= 0 ? "+" : ""}
                                              {numberFormat.format(month.gainPercent)}%
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {purchaseEvolution.every((item) => item.evolution.length === 0) && (
                            <p className="text-xs text-slate-600">
                              No hay datos de evolución disponibles.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section Detalles */}
          <section className="mb-8">
            <h2 className="mb-6 text-2xl font-semibold text-slate-900">Detalles</h2>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Movimientos</h3>
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
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

