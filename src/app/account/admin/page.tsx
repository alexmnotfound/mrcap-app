"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type {
  AccountSummary,
  MovementReportRow,
} from "@/types/api";

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    profile,
    loading,
    token,
    apiBase,
    error,
  } = useAuth();
  const [adminSummaries, setAdminSummaries] = useState<AccountSummary[]>([]);
  const [adminReport, setAdminReport] = useState<MovementReportRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    } else if (!loading && profile && !profile.is_admin) {
      router.replace("/account/dashboard");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile?.is_admin || !token) return;
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

  if (!profile.is_admin) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">
            Redirigiendo...
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
            <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Admin Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
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
        </div>
      </div>
    </DashboardLayout>
  );
}

