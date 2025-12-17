"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, ArrowUp, ArrowDown, Search, Plus, Edit, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import type {
  AccountSummary,
  MovementReportRow,
  FundNav,
  CashMovement,
  Fund,
  FundShareMovement,
  FundShareMovementUpdate,
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
  const [funds, setFunds] = useState<Fund[]>([]);
  const [navs, setNavs] = useState<FundNav[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  
  // NAV Management
  const [showNavForm, setShowNavForm] = useState(false);
  const [editingNav, setEditingNav] = useState<FundNav | null>(null);
  const [navFormData, setNavFormData] = useState({
    fund_id: "",
    as_of_date: "",
    fund_accumulated: "",
    shares_amount: "",
    share_value: "",
    delta_previous: "",
    delta_since_origin: "",
  });
  
  // Cash Movement Management
  const [showCashForm, setShowCashForm] = useState(false);
  const [editingCash, setEditingCash] = useState<CashMovement | null>(null);
  const [cashFormData, setCashFormData] = useState({
    account_id: "",
    type: "deposit" as "deposit" | "withdrawal" | "fee",
    amount: "",
    currency: "USD",
    effective_date: "",
    fund_id: "",
  });
  
  // Fund Share Movement Management
  const [showFundShareForm, setShowFundShareForm] = useState(false);
  const [editingFundShare, setEditingFundShare] = useState<FundShareMovement | null>(null);
  const [fundShareFormData, setFundShareFormData] = useState({
    fund_id: "",
    shares_change: "",
    share_price: "",
    total_amount: "",
    effective_date: "",
  });
  
  // Cash Movements sorting
  type SortableCashColumn = "id" | "account_id" | "type" | "amount" | "currency" | "effective_date";
  const [cashSortColumn, setCashSortColumn] = useState<SortableCashColumn | null>("effective_date");
  const [cashSortDirection, setCashSortDirection] = useState<"asc" | "desc">("desc");
  
  type SortableColumn = "user_full_name" | "account_number" | "net_invested" | "total_deposits" | "total_fees";
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  type SortableReportColumn = "user_full_name" | "account_number" | "effective_date" | "amount" | "shares_change";
  const [reportSortColumn, setReportSortColumn] = useState<SortableReportColumn | null>("effective_date");
  const [reportSortDirection, setReportSortDirection] = useState<"asc" | "desc">("desc");

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
        const [summary, report, fundsData, navsData] = await Promise.all([
          apiFetch<AccountSummary[]>("/api/accounts/summary", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
          apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
          apiFetch<Fund[]>("/api/funds", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
          apiFetch<FundNav[]>("/api/funds/navs", {
            token: token ?? undefined,
            baseUrl: apiBase,
          }),
        ]);
        if (!cancelled) {
          setAdminSummaries(summary);
          setAdminReport(report);
          setFunds(fundsData);
          setNavs(navsData);
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
  
  // Fetch cash movements for management
  useEffect(() => {
    if (!profile?.is_admin || !token) return;
    async function fetchCashMovements() {
      try {
        const movements = await apiFetch<CashMovement[]>("/api/movements/cash", {
          token: token ?? undefined,
          baseUrl: apiBase,
        });
        setCashMovements(movements);
      } catch (err) {
        console.error("Failed to fetch cash movements:", err);
      }
    }
    fetchCashMovements();
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

  // Sort cash movements
  const sortedCashMovements = useMemo(() => {
    if (!cashSortColumn) return cashMovements;
    
    return [...cashMovements].sort((a, b) => {
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";
      
      if (cashSortColumn === "id") {
        aVal = a.id;
        bVal = b.id;
      } else if (cashSortColumn === "account_id") {
        aVal = a.account_id;
        bVal = b.account_id;
      } else if (cashSortColumn === "type") {
        aVal = a.type.toLowerCase();
        bVal = b.type.toLowerCase();
      } else if (cashSortColumn === "amount") {
        aVal = Number(a.amount) || 0;
        bVal = Number(b.amount) || 0;
      } else if (cashSortColumn === "currency") {
        aVal = a.currency.toLowerCase();
        bVal = b.currency.toLowerCase();
      } else if (cashSortColumn === "effective_date") {
        aVal = new Date(a.effective_date).getTime();
        bVal = new Date(b.effective_date).getTime();
      }
      
      if (aVal < bVal) return cashSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return cashSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [cashMovements, cashSortColumn, cashSortDirection]);

  const handleCashSort = (column: SortableCashColumn) => {
    if (cashSortColumn === column) {
      setCashSortDirection(cashSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCashSortColumn(column);
      setCashSortDirection("asc");
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
                <h3 className="text-xl font-semibold text-slate-900">Movimientos de Cuentas</h3>
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
                      <th className="px-4 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedReport.map((row) => (
                      <tr
                        key={`${row.cash_movement_id}-${row.account_id}-${row.fund_share_movement_id || 'cash'}`}
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
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {row.fund_share_movement_id && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!token) return;
                                    try {
                                      const movement = await apiFetch<FundShareMovement>(
                                        `/api/movements/fund-share/${row.fund_share_movement_id}`,
                                        { token, baseUrl: apiBase }
                                      );
                                      setEditingFundShare(movement);
                                      setFundShareFormData({
                                        fund_id: movement.fund_id.toString(),
                                        shares_change: movement.shares_change,
                                        share_price: movement.share_price,
                                        total_amount: movement.total_amount,
                                        effective_date: movement.effective_date,
                                      });
                                      setShowFundShareForm(true);
                                    } catch (err: any) {
                                      alert(err.message || "Error al cargar movimiento");
                                    }
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm("¿Estás seguro de eliminar este movimiento de participaciones?")) return;
                                    if (!token) return;
                                    try {
                                      await apiFetch(`/api/movements/fund-share/${row.fund_share_movement_id}`, {
                                        token,
                                        baseUrl: apiBase,
                                        method: "DELETE",
                                      });
                                      const report = await apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
                                        token,
                                        baseUrl: apiBase,
                                      });
                                      setAdminReport(report);
                                    } catch (err: any) {
                                      alert(err.message || "Error al eliminar movimiento");
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedReport.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          {reportSearchQuery ? "No se encontraron movimientos que coincidan con la búsqueda." : "Aún no hay movimientos."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Fund Share Movement Edit Form */}
              {showFundShareForm && editingFundShare && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">Editar Movimiento de Participaciones</h4>
                    <button
                      onClick={() => {
                        setShowFundShareForm(false);
                        setEditingFundShare(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token) return;
                      try {
                        const payload: FundShareMovementUpdate = {
                          fund_id: fundShareFormData.fund_id ? Number(fundShareFormData.fund_id) : null,
                          shares_change: fundShareFormData.shares_change || null,
                          share_price: fundShareFormData.share_price || null,
                          total_amount: fundShareFormData.total_amount || null,
                          effective_date: fundShareFormData.effective_date || null,
                        };
                        
                        await apiFetch<FundShareMovement>(`/api/movements/fund-share/${editingFundShare.id}`, {
                          token,
                          baseUrl: apiBase,
                          method: "PUT",
                          body: JSON.stringify(payload),
                        });
                        
                        // Refresh data
                        const report = await apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
                          token,
                          baseUrl: apiBase,
                        });
                        setAdminReport(report);
                        setShowFundShareForm(false);
                        setEditingFundShare(null);
                      } catch (err: any) {
                        alert(err.message || "Error al guardar movimiento");
                      }
                    }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fondo *
                      </label>
                      <select
                        required
                        value={fundShareFormData.fund_id}
                        onChange={(e) => setFundShareFormData({ ...fundShareFormData, fund_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar fondo...</option>
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>
                            {fund.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Participaciones *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={fundShareFormData.shares_change}
                        onChange={(e) => setFundShareFormData({ ...fundShareFormData, shares_change: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Precio por Participación *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={fundShareFormData.share_price}
                        onChange={(e) => setFundShareFormData({ ...fundShareFormData, share_price: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Monto Total *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={fundShareFormData.total_amount}
                        onChange={(e) => setFundShareFormData({ ...fundShareFormData, total_amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fecha Efectiva *
                      </label>
                      <input
                        type="date"
                        required
                        value={fundShareFormData.effective_date}
                        onChange={(e) => setFundShareFormData({ ...fundShareFormData, effective_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFundShareForm(false);
                          setEditingFundShare(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Actualizar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* NAV Management Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Gestión de NAVs</h3>
                </div>
                <button
                  onClick={() => {
                    setEditingNav(null);
                    setNavFormData({
                      fund_id: "",
                      as_of_date: "",
                      fund_accumulated: "",
                      shares_amount: "",
                      share_value: "",
                      delta_previous: "",
                      delta_since_origin: "",
                    });
                    setShowNavForm(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo NAV
                </button>
              </div>
              
              {showNavForm && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">
                      {editingNav ? "Editar NAV" : "Nuevo NAV"}
                    </h4>
                    <button
                      onClick={() => {
                        setShowNavForm(false);
                        setEditingNav(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token) return;
                      try {
                        const payload = {
                          fund_id: Number(navFormData.fund_id),
                          as_of_date: navFormData.as_of_date,
                          fund_accumulated: navFormData.fund_accumulated,
                          shares_amount: navFormData.shares_amount,
                          share_value: navFormData.share_value,
                          delta_previous: navFormData.delta_previous || null,
                          delta_since_origin: navFormData.delta_since_origin || null,
                        };
                        
                        if (editingNav) {
                          await apiFetch<FundNav>(`/api/funds/navs/${editingNav.id}`, {
                            token,
                            baseUrl: apiBase,
                            method: "PUT",
                            body: JSON.stringify(payload),
                          });
                        } else {
                          await apiFetch<FundNav>(`/api/funds/${navFormData.fund_id}/navs`, {
                            token,
                            baseUrl: apiBase,
                            method: "POST",
                            body: JSON.stringify(payload),
                          });
                        }
                        
                        // Refresh data
                        const navsData = await apiFetch<FundNav[]>("/api/funds/navs", {
                          token,
                          baseUrl: apiBase,
                        });
                        setNavs(navsData);
                        setShowNavForm(false);
                        setEditingNav(null);
                      } catch (err: any) {
                        alert(err.message || "Error al guardar NAV");
                      }
                    }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fondo *
                      </label>
                      <select
                        required
                        value={navFormData.fund_id}
                        onChange={(e) => setNavFormData({ ...navFormData, fund_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar fondo...</option>
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>
                            {fund.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={navFormData.as_of_date}
                        onChange={(e) => setNavFormData({ ...navFormData, as_of_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fondo Acumulado *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={navFormData.fund_accumulated}
                        onChange={(e) => setNavFormData({ ...navFormData, fund_accumulated: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Cantidad de Participaciones *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={navFormData.shares_amount}
                        onChange={(e) => setNavFormData({ ...navFormData, shares_amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor por Participación *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={navFormData.share_value}
                        onChange={(e) => setNavFormData({ ...navFormData, share_value: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Delta Anterior (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={navFormData.delta_previous}
                        onChange={(e) => setNavFormData({ ...navFormData, delta_previous: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Delta desde Origen (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={navFormData.delta_since_origin}
                        onChange={(e) => setNavFormData({ ...navFormData, delta_since_origin: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNavForm(false);
                          setEditingNav(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        {editingNav ? "Actualizar" : "Crear"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fondo</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium text-right">Fondo Acumulado</th>
                      <th className="px-4 py-3 font-medium text-right">Participaciones</th>
                      <th className="px-4 py-3 font-medium text-right">Valor por Participación</th>
                      <th className="px-4 py-3 font-medium text-right">Delta Anterior</th>
                      <th className="px-4 py-3 font-medium text-right">Delta Origen</th>
                      <th className="px-4 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navs.map((nav) => {
                      const fund = funds.find((f) => f.id === nav.fund_id);
                      return (
                        <tr key={nav.id} className="border-t border-slate-100 text-slate-700">
                          <td className="px-4 py-3">{fund?.name || `Fondo ${nav.fund_id}`}</td>
                          <td className="px-4 py-3">
                            {dateFormat.format(new Date(nav.as_of_date))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {currency.format(Number(nav.fund_accumulated))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {Number(nav.shares_amount).toFixed(6)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {currency.format(Number(nav.share_value))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {nav.delta_previous ? `${Number(nav.delta_previous).toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {nav.delta_since_origin ? `${Number(nav.delta_since_origin).toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingNav(nav);
                                  setNavFormData({
                                    fund_id: nav.fund_id.toString(),
                                    as_of_date: nav.as_of_date,
                                    fund_accumulated: nav.fund_accumulated,
                                    shares_amount: nav.shares_amount,
                                    share_value: nav.share_value,
                                    delta_previous: nav.delta_previous || "",
                                    delta_since_origin: nav.delta_since_origin || "",
                                  });
                                  setShowNavForm(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Estás seguro de eliminar el NAV del ${dateFormat.format(new Date(nav.as_of_date))}?`)) return;
                                  if (!token) return;
                                  try {
                                    await apiFetch(`/api/funds/navs/${nav.id}`, {
                                      token,
                                      baseUrl: apiBase,
                                      method: "DELETE",
                                    });
                                    const navsData = await apiFetch<FundNav[]>("/api/funds/navs", {
                                      token,
                                      baseUrl: apiBase,
                                    });
                                    setNavs(navsData);
                                  } catch (err: any) {
                                    alert(err.message || "Error al eliminar NAV");
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {navs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          Aún no hay NAVs registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash Movement Management Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">Gestión de Movimientos de Efectivo</h3>
                </div>
                <button
                  onClick={() => {
                    setEditingCash(null);
                    setCashFormData({
                      account_id: "",
                      type: "deposit",
                      amount: "",
                      currency: "USD",
                      effective_date: "",
                      fund_id: "",
                    });
                    setShowCashForm(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Movimiento
                </button>
              </div>
              
              {showCashForm && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">
                      {editingCash ? "Editar Movimiento" : "Nuevo Movimiento"}
                    </h4>
                    <button
                      onClick={() => {
                        setShowCashForm(false);
                        setEditingCash(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token) return;
                      try {
                        const payload: any = {
                          account_id: Number(cashFormData.account_id),
                          type: cashFormData.type,
                          amount: cashFormData.amount,
                          currency: cashFormData.currency,
                          effective_date: cashFormData.effective_date,
                        };
                        
                        // Include fund_id if it's a deposit and fund is selected
                        if (cashFormData.type === "deposit" && cashFormData.fund_id) {
                          payload.fund_id = Number(cashFormData.fund_id);
                        }
                        
                        if (editingCash) {
                          await apiFetch<CashMovement>(`/api/movements/cash/${editingCash.id}`, {
                            token,
                            baseUrl: apiBase,
                            method: "PUT",
                            body: JSON.stringify(payload),
                          });
                        } else {
                          await apiFetch<CashMovement>("/api/movements/cash", {
                            token,
                            baseUrl: apiBase,
                            method: "POST",
                            body: JSON.stringify(payload),
                          });
                        }
                        
                        // Refresh data
                        const [report, movements] = await Promise.all([
                          apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
                            token,
                            baseUrl: apiBase,
                          }),
                          apiFetch<CashMovement[]>("/api/movements/cash", {
                            token,
                            baseUrl: apiBase,
                          }),
                        ]);
                        setAdminReport(report);
                        setCashMovements(movements);
                        
                        setShowCashForm(false);
                        setEditingCash(null);
                      } catch (err: any) {
                        alert(err.message || "Error al guardar movimiento");
                      }
                    }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Cuenta *
                      </label>
                      <select
                        required
                        value={cashFormData.account_id}
                        onChange={(e) => setCashFormData({ ...cashFormData, account_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar cuenta...</option>
                        {adminSummaries.map((account) => (
                          <option key={account.account_id} value={account.account_id}>
                            {account.account_number} {account.user_full_name ? `(${account.user_full_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tipo *
                      </label>
                      <select
                        required
                        value={cashFormData.type}
                        onChange={(e) => {
                          const newType = e.target.value as "deposit" | "withdrawal" | "fee";
                          setCashFormData({ 
                            ...cashFormData, 
                            type: newType,
                            // Clear fund_id if not a deposit
                            fund_id: newType === "deposit" ? cashFormData.fund_id : ""
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="deposit">Depósito</option>
                        <option value="withdrawal">Retiro</option>
                        <option value="fee">Comisión</option>
                      </select>
                    </div>
                    {cashFormData.type === "deposit" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Fondo (para suscripción automática)
                        </label>
                        <select
                          value={cashFormData.fund_id}
                          onChange={(e) => setCashFormData({ ...cashFormData, fund_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">No suscribir automáticamente</option>
                          {funds.map((fund) => (
                            <option key={fund.id} value={fund.id}>
                              {fund.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Monto *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={cashFormData.amount}
                        onChange={(e) => setCashFormData({ ...cashFormData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Moneda *
                      </label>
                      <input
                        type="text"
                        required
                        value={cashFormData.currency}
                        onChange={(e) => setCashFormData({ ...cashFormData, currency: e.target.value.toUpperCase() })}
                        maxLength={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Fecha Efectiva *
                      </label>
                      <input
                        type="date"
                        required
                        value={cashFormData.effective_date}
                        onChange={(e) => setCashFormData({ ...cashFormData, effective_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCashForm(false);
                          setEditingCash(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        {editingCash ? "Actualizar" : "Crear"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("id")}
                      >
                        <div className="flex items-center gap-2">
                          ID
                          {cashSortColumn === "id" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("account_id")}
                      >
                        <div className="flex items-center gap-2">
                          Cuenta ID
                          {cashSortColumn === "account_id" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("type")}
                      >
                        <div className="flex items-center gap-2">
                          Tipo
                          {cashSortColumn === "type" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("amount")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Monto
                          {cashSortColumn === "amount" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("currency")}
                      >
                        <div className="flex items-center gap-2">
                          Moneda
                          {cashSortColumn === "currency" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleCashSort("effective_date")}
                      >
                        <div className="flex items-center gap-2">
                          Fecha
                          {cashSortColumn === "effective_date" && (
                            cashSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCashMovements.map((movement) => (
                      <tr key={movement.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-4 py-3">{movement.id}</td>
                        <td className="px-4 py-3">
                          {movement.account_id}
                          {movement.user_name && (
                            <span className="ml-2 text-xs text-slate-500">
                              ({movement.user_name})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize">{movement.type}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currency.format(Number(movement.amount))}
                        </td>
                        <td className="px-4 py-3">{movement.currency}</td>
                        <td className="px-4 py-3">
                          {dateFormat.format(new Date(movement.effective_date))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCash(movement);
                                setCashFormData({
                                  account_id: movement.account_id.toString(),
                                  type: movement.type,
                                  amount: movement.amount,
                                  currency: movement.currency,
                                  effective_date: movement.effective_date,
                                  fund_id: movement.fund_id ? movement.fund_id.toString() : "",
                                });
                                setShowCashForm(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`¿Estás seguro de eliminar este movimiento de ${movement.type}?`)) return;
                                if (!token) return;
                                try {
                                  await apiFetch(`/api/movements/cash/${movement.id}`, {
                                    token,
                                    baseUrl: apiBase,
                                    method: "DELETE",
                                  });
                                  
                        // Refresh data
                        const [report, movements] = await Promise.all([
                          apiFetch<MovementReportRow[]>("/api/movements/report/cash-share", {
                            token,
                            baseUrl: apiBase,
                          }),
                          apiFetch<CashMovement[]>("/api/movements/cash", {
                            token,
                            baseUrl: apiBase,
                          }),
                        ]);
                        setAdminReport(report);
                        setCashMovements(movements);
                                } catch (err: any) {
                                  alert(err.message || "Error al eliminar movimiento");
                                }
                              }}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {cashMovements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Aún no hay movimientos de efectivo.
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

