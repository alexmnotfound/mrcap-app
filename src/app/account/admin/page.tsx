"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, ArrowUp, ArrowDown, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  type SortableColumn = "user_full_name" | "account_number" | "net_invested" | "total_deposits" | "total_fees";
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  type SortableReportColumn = "user_full_name" | "account_number" | "effective_date" | "amount" | "shares_change";
  const [reportSortColumn, setReportSortColumn] = useState<SortableReportColumn | null>(null);
  const [reportSortDirection, setReportSortDirection] = useState<"asc" | "desc">("asc");

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

  // Filter and sort summaries, and calculate final values (market value - commissions)
  const filteredAndSortedSummaries = useMemo(() => {
    let filtered = adminSummaries;

    // Filter by search query (name or account number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = adminSummaries.filter(
        (summary) =>
          summary.user_full_name?.toLowerCase().includes(query) ||
          summary.account_number?.toLowerCase().includes(query)
      );
    }

    // Add calculated final value (market value - commissions) to each summary
    const summariesWithFinalValue = filtered.map((summary) => {
      const totalMarketValue = summary.positions.reduce((sum, pos) => {
        return sum + (Number(pos.market_value) || 0);
      }, 0);
      
      // Calculate commissions from gains
      const netInvestedBeforeCommissions = Number(summary.total_deposits) - Number(summary.total_withdrawals);
      const gains = totalMarketValue - netInvestedBeforeCommissions;
      const commissionRate = Number(summary.commission_rate) || 0;
      const calculatedCommissions = gains > 0 ? gains * commissionRate : 0;
      
      // Final value = market value - calculated commissions
      const finalValue = totalMarketValue - calculatedCommissions;
      
      return {
        ...summary,
        finalValue, // Add final value for display
      };
    });

    // Sort
    if (sortColumn) {
      summariesWithFinalValue.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        // For net_invested, use finalValue instead
        if (sortColumn === "net_invested") {
          aVal = (a as any).finalValue || 0;
          bVal = (b as any).finalValue || 0;
        } else if (sortColumn === "total_deposits" || sortColumn === "total_fees") {
          aVal = Number(a[sortColumn]) || 0;
          bVal = Number(b[sortColumn]) || 0;
        } else {
          // String comparison
          aVal = String(a[sortColumn] ?? "").toLowerCase();
          bVal = String(b[sortColumn] ?? "").toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return summariesWithFinalValue;
  }, [adminSummaries, searchQuery, sortColumn, sortDirection]);

  // Calculate totals for the summaries table
  const summaryTotals = useMemo(() => {
    return filteredAndSortedSummaries.reduce(
      (acc, summary: any) => {
        // Use finalValue for net_invested total (market value - commissions)
        acc.net_invested += summary.finalValue || 0;
        acc.total_deposits += Number(summary.total_deposits) || 0;
        acc.total_fees += Number(summary.total_fees) || 0;
        return acc;
      },
      { net_invested: 0, total_deposits: 0, total_fees: 0 }
    );
  }, [filteredAndSortedSummaries]);

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter and sort report
  const filteredAndSortedReport = useMemo(() => {
    let filtered = adminReport;

    // Filter by search query (name or account number)
    if (reportSearchQuery.trim()) {
      const query = reportSearchQuery.toLowerCase().trim();
      filtered = adminReport.filter(
        (row) =>
          row.user_full_name?.toLowerCase().includes(query) ||
          row.account_number?.toLowerCase().includes(query)
      );
    }

    // Sort
    if (reportSortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number | Date = "";
        let bVal: string | number | Date = "";

        if (reportSortColumn === "user_full_name") {
          aVal = a.user_full_name?.toLowerCase() || "";
          bVal = b.user_full_name?.toLowerCase() || "";
        } else if (reportSortColumn === "account_number") {
          aVal = a.account_number?.toLowerCase() || "";
          bVal = b.account_number?.toLowerCase() || "";
        } else if (reportSortColumn === "effective_date") {
          aVal = new Date(a.effective_date).getTime();
          bVal = new Date(b.effective_date).getTime();
        } else if (reportSortColumn === "amount") {
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
        } else if (reportSortColumn === "shares_change") {
          aVal = Number(a.shares_change) || 0;
          bVal = Number(b.shares_change) || 0;
        }

        if (aVal < bVal) return reportSortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return reportSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [adminReport, reportSearchQuery, reportSortColumn, reportSortDirection]);

  const handleReportSort = (column: SortableReportColumn) => {
    if (reportSortColumn === column) {
      // Toggle direction if clicking the same column
      setReportSortDirection(reportSortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setReportSortColumn(column);
      setReportSortDirection("asc");
    }
  };

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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Resúmenes de cuentas</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o cuenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("user_full_name")}
                      >
                        <div className="flex items-center gap-2">
                          Inversor
                          {sortColumn === "user_full_name" && (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("account_number")}
                      >
                        <div className="flex items-center gap-2">
                          Cuenta
                          {sortColumn === "account_number" && (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("net_invested")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Inversión neta
                          {sortColumn === "net_invested" && (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("total_deposits")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Depósitos
                          {sortColumn === "total_deposits" && (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("total_fees")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Comisiones
                          {sortColumn === "total_fees" && (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedSummaries.map((summary) => (
                      <tr
                        key={summary.account_id}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{summary.user_full_name}</div>
                        </td>
                        <td className="px-4 py-3">{summary.account_number}</td>
                        <td className="px-4 py-3 font-medium text-right">
                          {currency.format((summary as any).finalValue || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currency.format(Number(summary.total_deposits))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currency.format(Number(summary.total_fees))}
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedSummaries.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          {searchQuery ? "No se encontraron cuentas que coincidan con la búsqueda." : "Aún no hay cuentas."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredAndSortedSummaries.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-slate-900" colSpan={2}>
                          Total
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 text-right">
                          {currency.format(summaryTotals.net_invested)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 text-right">
                          {currency.format(summaryTotals.total_deposits)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 text-right">
                          {currency.format(summaryTotals.total_fees)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Movimientos globales</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o cuenta..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleReportSort("user_full_name")}
                      >
                        <div className="flex items-center gap-2">
                          Inversor
                          {reportSortColumn === "user_full_name" && (
                            reportSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleReportSort("account_number")}
                      >
                        <div className="flex items-center gap-2">
                          Cuenta
                          {reportSortColumn === "account_number" && (
                            reportSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleReportSort("effective_date")}
                      >
                        <div className="flex items-center gap-2">
                          Fecha
                          {reportSortColumn === "effective_date" && (
                            reportSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleReportSort("amount")}
                      >
                        <div className="flex items-center gap-2">
                          Efectivo
                          {reportSortColumn === "amount" && (
                            reportSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleReportSort("shares_change")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Participaciones
                          {reportSortColumn === "shares_change" && (
                            reportSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedReport.map((row) => (
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
                        <td className="px-4 py-3 text-xs text-right">
                          {row.shares_change
                            ? `${Number(row.shares_change).toFixed(2)} @ ${Number(row.share_price).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedReport.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          {reportSearchQuery ? "No se encontraron movimientos que coincidan con la búsqueda." : "Aún no hay movimientos."}
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

