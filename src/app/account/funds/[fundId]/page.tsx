"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  BarChart3,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type { FundPerformance } from "@/types/api";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

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
  // Time period filter for chart - moved to top with other hooks
  const [timePeriod, setTimePeriod] = useState<"3M" | "6M" | "1Y" | "ALL">("ALL");

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
              : "Error al cargar el rendimiento del fondo"
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

  // All computed values and useMemo hooks must be before early returns
  const navData = performance?.navs || [];
  const hasNavData = navData.length > 0;
  const latestNav = performance?.latest_share_value
    ? Number(performance.latest_share_value)
    : null;
  // Use delta_previous from the latest NAV data if available, otherwise calculate
  const latestNavData = hasNavData ? navData[navData.length - 1] : null;
  const navChange = latestNavData?.delta_previous
    ? Number(latestNavData.delta_previous)
    : null;

  // Latest shares amount
  const latestSharesAmount = hasNavData && navData[navData.length - 1]?.shares_amount
    ? Number(navData[navData.length - 1].shares_amount)
    : null;

  // Average historical gain (from delta_previous values)
  const averageGain = useMemo(() => {
    if (!hasNavData) return null;
    const deltas = navData
      .map((nav) => nav.delta_previous)
      .filter((delta): delta is string => delta !== null && delta !== undefined)
      .map((delta) => Number(delta));
    
    if (deltas.length === 0) return null;
    const sum = deltas.reduce((acc, val) => acc + val, 0);
    return sum / deltas.length;
  }, [navData, hasNavData]);

  // Filtered chart data based on time period
  const chartData = useMemo(() => {
    if (!hasNavData) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timePeriod) {
      case "3M":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case "ALL":
        cutoffDate = new Date(0); // Beginning of time
        break;
    }

    const filtered = navData
      .filter((nav) => new Date(nav.as_of_date) >= cutoffDate)
      .sort((a, b) => new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime());

    return filtered.map((nav, index) => ({
      index: index,
      date: new Date(nav.as_of_date).toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      }),
      fullDate: nav.as_of_date,
      dateLabel: new Date(nav.as_of_date).toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      shareValue: Number(nav.share_value),
      fundAccumulated: Number(nav.fund_accumulated),
      deltaPrevious: nav.delta_previous ? Number(nav.delta_previous) : null,
      deltaSinceOrigin: nav.delta_since_origin ? Number(nav.delta_since_origin) : null,
    }));
  }, [navData, hasNavData, timePeriod]);

  // Average delta previous for the filtered chart data
  const averageDeltaPrevious = useMemo(() => {
    if (chartData.length === 0) return null;
    const deltas = chartData
      .map((d) => d.deltaPrevious)
      .filter((delta): delta is number => delta !== null && delta !== undefined);
    
    if (deltas.length === 0) return null;
    const sum = deltas.reduce((acc, val) => acc + val, 0);
    return sum / deltas.length;
  }, [chartData]);

  // Early returns AFTER all hooks are called
  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">
            {loading ? "Cargando..." : "Redirigiendo al inicio de sesión..."}
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
              <p className="text-slate-600">ID de fondo inválido</p>
              <Link
                href="/account/funds"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Volver a Fondos
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
              Volver a Fondos
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900">
              {performance?.fund_name || "Fondo"}
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
              <p className="text-slate-600">Cargando rendimiento del fondo...</p>
            </div>
          ) : !performance ? (
            <div className="card p-12 text-center">
              <p className="text-slate-600">Fondo no encontrado</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="mb-8 grid gap-6 md:grid-cols-4">
                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Valor cuota
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {latestNav
                      ? currency.format(latestNav)
                      : "—"}
                  </p>
                  {navChange !== null && (
                    <div className="mt-2">
                      <p
                        className={`text-sm font-medium ${
                          navChange >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {navChange >= 0 ? "+" : ""}
                        {navChange.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Cantidad de cuotas
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {latestSharesAmount
                      ? latestSharesAmount.toLocaleString()
                      : "—"}
                  </p>
                  {hasNavData && navData[navData.length - 1]?.as_of_date && (
                    <p className="mt-1 text-sm text-slate-600">
                      Al{" "}
                      {dateFormat.format(
                        new Date(navData[navData.length - 1].as_of_date)
                      )}
                    </p>
                  )}
                </div>

                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Rendimiento promedio (mes)
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {averageGain !== null
                      ? `${averageGain >= 0 ? "+" : ""}${averageGain.toFixed(2)}%`
                      : "—"}
                  </p>
                </div>

                <div className="card p-6">
                  <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Valor del fondo
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">
                    {hasNavData && navData[navData.length - 1]?.fund_accumulated
                      ? currency.format(Number(navData[navData.length - 1].fund_accumulated))
                      : "—"}
                  </p>
                  {hasNavData && navData[navData.length - 1]?.as_of_date && (
                    <p className="mt-1 text-sm text-slate-600">
                      Al{" "}
                      {dateFormat.format(
                        new Date(navData[navData.length - 1].as_of_date)
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Evolution Charts */}
              {hasNavData && chartData.length > 0 && (
                <div className="mb-8 grid gap-6 md:grid-cols-2">
                  {/* Delta Since Origin Chart */}
                  <div className="card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LineChart className="h-5 w-5 text-green-600" />
                        <h2 className="text-xl font-semibold text-slate-900">
                          Evolución del FCI
                        </h2>
                      </div>
                      <div className="flex gap-2">
                        {(["3M", "6M", "1Y", "ALL"] as const).map((period) => (
                          <button
                            key={period}
                            onClick={() => setTimePeriod(period)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                              timePeriod === period
                                ? "bg-green-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {period === "ALL" ? "Todo" : period}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart 
                          data={chartData}
                          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="index"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value, index) => {
                              const dataPoint = chartData[index];
                              return dataPoint ? dataPoint.date : "";
                            }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                const dataPoint = payload[0].payload;
                                return dataPoint ? dataPoint.dateLabel : label;
                              }
                              return label;
                            }}
                            formatter={(value: any) => {
                              if (value === null || value === undefined) return "—";
                              const numValue = Number(value);
                              if (isNaN(numValue)) return "—";
                              return `${numValue >= 0 ? "+" : ""}${numValue.toFixed(2)}%`;
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="deltaSinceOrigin"
                            name="Evolución del FCI"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Delta vs Previous Month Chart */}
                  <div className="card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LineChart className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-slate-900">
                          Delta mensual
                        </h2>
                      </div>
                      <div className="flex gap-2">
                        {(["3M", "6M", "1Y", "ALL"] as const).map((period) => (
                          <button
                            key={period}
                            onClick={() => setTimePeriod(period)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                              timePeriod === period
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {period === "ALL" ? "Todo" : period}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart 
                          data={chartData}
                          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="index"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value, index) => {
                              const dataPoint = chartData[index];
                              return dataPoint ? dataPoint.date : "";
                            }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                const dataPoint = payload[0].payload;
                                return dataPoint ? dataPoint.dateLabel : label;
                              }
                              return label;
                            }}
                            formatter={(value: any) => {
                              if (value === null || value === undefined) return "—";
                              const numValue = Number(value);
                              if (isNaN(numValue)) return "—";
                              return `${numValue >= 0 ? "+" : ""}${numValue.toFixed(2)}%`;
                            }}
                          />
                          <Legend />
                          {averageDeltaPrevious !== null && (
                            <ReferenceLine
                              y={averageDeltaPrevious}
                              stroke="#f59e0b"
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              label={{
                                value: `${averageDeltaPrevious >= 0 ? "+" : ""}${averageDeltaPrevious.toFixed(2)}%`,
                                position: "left",
                                fill: "#f59e0b",
                                fontSize: 12,
                                fontWeight: 600,
                                offset: 5,
                              }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="deltaPrevious"
                            name="Delta mensual"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* NAV History Table */}
              {hasNavData && (
                <div className="card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-slate-900">
                      Historial
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Fondo Acumulado</th>
                          <th className="px-4 py-3 font-medium">Cantidad de Participaciones</th>
                          <th className="px-4 py-3 font-medium">Valor de Participación</th>
                          <th className="px-4 py-3 font-medium">Delta </th>
                          <th className="px-4 py-3 font-medium">Acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...navData].reverse().map((nav) => {
                          const deltaPrevious = nav.delta_previous
                            ? Number(nav.delta_previous)
                            : null;
                          const deltaSinceOrigin = nav.delta_since_origin
                            ? Number(nav.delta_since_origin)
                            : null;

                          return (
                            <tr
                              key={nav.as_of_date}
                              className="border-t border-slate-100 text-slate-700"
                            >
                              <td className="px-4 py-3">
                                {dateFormat.format(new Date(nav.as_of_date))}
                              </td>
                              <td className="px-4 py-3">
                                {currency.format(Number(nav.fund_accumulated))}
                              </td>
                              <td className="px-4 py-3">
                                {Number(nav.shares_amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {currency.format(Number(nav.share_value))}
                              </td>
                              <td className="px-4 py-3">
                                {deltaPrevious !== null ? (
                                  <span
                                    className={`font-medium ${
                                      deltaPrevious >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {deltaPrevious >= 0 ? "+" : ""}
                                    {deltaPrevious.toFixed(2)}%
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {deltaSinceOrigin !== null ? (
                                  <span
                                    className={`font-medium ${
                                      deltaSinceOrigin >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {deltaSinceOrigin >= 0 ? "+" : ""}
                                    {deltaSinceOrigin.toFixed(2)}%
                                  </span>
                                ) : (
                                  "—"
                                )}
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
                    Sin datos de rendimiento
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Aún no hay datos de NAV disponibles para este fondo.
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

