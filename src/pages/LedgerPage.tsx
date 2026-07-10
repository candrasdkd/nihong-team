// src/pages/LedgerPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card } from "../components/ui/Card";
import { formatIDR } from "../utils/format";
import {
  type LedgerEntry,
  type LedgerUpsert,
  type LedgerSummary,
} from "../services/ledgerFirebase";
import { useLedger } from "../hooks/useLedger";
import { LedgerFormModal } from "../components/LedgerFormModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { useCapitalAdvance } from "../hooks/useCapitalAdvance";
import { CapitalAdvanceTracker } from "../components/CapitalAdvanceTracker";
import { formatAndAddYear, MONTH_LABEL_ID } from "../utils/helpers";
import { FAB_COLOR_CLASS } from "../utils/constants";
import {
  TrendingUp, TrendingDown, Wallet, Search, Filter,
  Plus, Trash2, Pencil, ArrowUpRight, ArrowDownLeft,
  X, FileText, Download, Check, Coins, CreditCard, Landmark, CircleDollarSign,
  Activity, BarChart3, Eye, EyeOff, RotateCw
} from "lucide-react";
import { exportLedgerToExcel } from "../utils/exportExcel";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

// ===== Helper Functions =====
function toInputDate(d: Date) {
  const iso = new Date(
    d.getTime() - d.getTimezoneOffset() * 60000,
  ).toISOString();
  return iso.slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function formatGroupDate(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toInputDate(yesterday);

  if (dateStr === today) return "Hari Ini";
  if (dateStr === yesterdayStr) return "Kemarin";
  return formatAndAddYear(dateStr);
}

function getMethodIcon(method: string | null) {
  const m = String(method || "").toLowerCase();
  if (m.includes("cash") || m.includes("tunai")) return Coins;
  if (m.includes("transfer") || m.includes("bank")) return Landmark;
  if (m.includes("wallet") || m.includes("gopay") || m.includes("ovo") || m.includes("dana")) return CreditCard;
  return CircleDollarSign;
}

const LedgerTableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-100">
        <td className="px-6 py-4 w-10 align-middle">
          <div className="w-4 h-4 bg-slate-200/75 rounded" />
        </td>
        <td className="px-6 py-4 whitespace-nowrap align-middle">
          <div className="w-16 h-4 bg-slate-200/70 rounded" />
        </td>
        <td className="px-6 py-4 align-middle">
          <div className="w-48 h-4 bg-slate-200/85 rounded mb-2" />
          <div className="w-20 h-3 bg-slate-200/60 rounded" />
        </td>
        <td className="px-6 py-4 whitespace-nowrap align-middle">
          <div className="w-16 h-5 bg-slate-200/70 rounded-lg" />
        </td>
        <td className="px-6 py-4 whitespace-nowrap align-middle">
          <div className="w-14 h-5 bg-slate-200/70 rounded-full" />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right align-middle">
          <div className="w-24 h-4 bg-slate-200/85 rounded ml-auto" />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right align-middle">
          <div className="w-12 h-4 bg-slate-200/70 rounded ml-auto" />
        </td>
      </tr>
    ))}
  </>
);

const LedgerMobileSkeleton = () => (
  <div className="divide-y divide-slate-100 bg-white border-y border-slate-100 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 flex items-center gap-3">
        <div className="w-5 h-5 bg-slate-200/75 rounded shrink-0" />
        <div className="w-10 h-10 rounded-full bg-slate-200/70 shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 bg-slate-200/85 rounded w-1/2" />
          <div className="h-3 bg-slate-200/60 rounded w-1/3" />
        </div>
        <div className="w-5 h-5 bg-slate-200/75 rounded shrink-0" />
      </div>
    ))}
  </div>
);

// ===== Sub Components =====

function StatCard({
  label,
  value,
  type,
  sub,
}: {
  label: string;
  value: number;
  type: "income" | "expense" | "balance";
  sub?: string;
}) {
  if (type === "balance") {
    return (
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-navyDark p-5 text-white shadow-lg border border-brand-navyDark/80 flex flex-col justify-between h-[130px] hover:shadow-xl transition-all duration-300 group">
        {/* Grid Decor */}
        <div 
          className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "16px 16px"
          }} 
        />
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-400/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 text-indigo-200">
              <Wallet className="w-4.5 h-4.5 text-indigo-300" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{label}</span>
          </div>
          <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md opacity-80 shadow-inner flex items-center justify-center text-[10px] text-yellow-900 font-bold border border-yellow-200/50 select-none">
            VIP
          </div>
        </div>

        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-white select-all">
            {formatIDR(value)}
          </span>
          {sub ? (
            <p className="text-[10px] text-slate-300 mt-1 font-semibold truncate">{sub}</p>
          ) : (
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Kas Aktif · Nihong Jastip</p>
          )}
        </div>
      </div>
    );
  }

  const config = {
    income: { 
      icon: TrendingUp, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10", 
      accent: "bg-emerald-500" 
    },
    expense: { 
      icon: TrendingDown, 
      color: "text-rose-500", 
      bg: "bg-rose-500/10", 
      accent: "bg-rose-500" 
    },
  }[type as "income" | "expense"];

  const Icon = config.icon;

  return (
    <div
      className="relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-[130px] transition-all hover:shadow-md duration-300 group"
    >
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-transparent group-hover:${config.accent} transition-colors duration-300`} />
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">
          {formatIDR(value)}
        </span>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: "Masuk" | "Keluar" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
        type === "Masuk"
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
          : "bg-rose-500/10 text-rose-700 border-rose-500/20"
      }`}
    >
      {type === "Masuk" ? "Pemasukan" : "Pengeluaran"}
    </span>
  );
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-3 text-xs">
      <p className="font-semibold text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-300 font-medium">{entry.name}</span>
          </div>
          <span className="font-bold text-white font-mono">{formatIDR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

function formatShortIDR(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`;
  return String(v);
}

function CategorySummaryCard({ data }: { data: { kategori: string; total: number; tipe: "Masuk" | "Keluar" }[] }) {
  const [activeTab, setActiveTab] = useState<"Masuk" | "Keluar">("Keluar");

  const filteredData = useMemo(() => {
    return data.filter(d => d.tipe === activeTab);
  }, [data, activeTab]);

  const maxTotal = useMemo(() => {
    return Math.max(...filteredData.map(d => d.total), 1);
  }, [filteredData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Alokasi Kategori</h3>
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab("Masuk")}
              className={`px-2.5 py-1 rounded-md transition-all ${activeTab === "Masuk" ? "bg-white text-emerald-600 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"}`}
            >
              Masuk
            </button>
            <button
              onClick={() => setActiveTab("Keluar")}
              className={`px-2.5 py-1 rounded-md transition-all ${activeTab === "Keluar" ? "bg-white text-rose-600 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"}`}
            >
              Keluar
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Belum ada data kategori</div>
          ) : (
            filteredData.slice(0, 5).map((d, i) => {
              const pct = (d.total / maxTotal) * 100;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600 truncate">{d.kategori}</span>
                    <span className="text-slate-800 font-bold font-mono">{formatIDR(d.total)}</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`h-full rounded-full ${activeTab === "Masuk" ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-rose-400 to-pink-500"}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function LedgerPage({ formTrigger = 0, onFormTriggerConsumed }: { formTrigger?: number; onFormTriggerConsumed?: () => void }) {
  const {
    q,
    setQ,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    rows,
    setRows,
    globalSummary,
    syncingSummary,
    limitValue,
    setLimitValue,
    renderLimit,
    setRenderLimit,
    loading,
    selectedIds,
    setSelectedIds,
    showCharts,
    setShowCharts,
    filtered,
    displayedRows,
    categories,
    totalMasuk,
    totalKeluar,
    saldo,
    toggleSelect,
    toggleSelectAll,
    selectedTotalMasuk,
    selectedTotalKeluar,
    selectedCount,
    groupedTransactions,
    chartData,
    categoryBreakdown,
    showForm,
    setShowForm,
    showFilter,
    setShowFilter,
    showStats,
    setShowStats,
    confirmModal,
    setConfirmModal,
    handleRecalculate,
    handleDelete,
    handleBulkDelete,
    handleSubmitForm,
    filterCount,
    defaultFrom,
    defaultTo,
  } = useLedger();

  const {
    pending,
    loading: loadingAdvances,
    confirmModal: advConfirmModal,
    setConfirmModal: setAdvConfirmModal,
    handleMarkReturned,
  } = useCapitalAdvance();

  React.useEffect(() => {
    if (formTrigger > 0) {
      setShowForm({ open: true, editing: null });
      onFormTriggerConsumed?.();
    }
  }, [formTrigger, onFormTriggerConsumed]);



  return (
    <div className="min-h-screen bg-surface-base pb-24 font-sans text-slate-800">
      {/* 1. Header Section (Sticky) */}
      <div className="bg-surface-card/80 backdrop-blur-md border-b border-surface-border static sm:sticky sm:top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                <Activity className="w-5 h-5 text-brand-navyDark" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent leading-none">
                    Buku Kas
                  </h1>
                  <button
                    disabled={syncingSummary}
                    onClick={handleRecalculate}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                    title="Sinkronisasi Saldo"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${syncingSummary ? "animate-spin text-indigo-500" : ""}`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Kelola arus kas masuk dan keluar</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => exportLedgerToExcel(filtered, "Laporan_Kas.xlsx")}
                className="hidden sm:flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm h-10 text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </Button>
              <Button
                onClick={() => setShowForm({ open: true, editing: null })}
                className="hidden sm:flex items-center gap-2 bg-brand-navyDark hover:bg-brand-navy text-white shadow-lg shadow-slate-900/10 h-10 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Transaksi</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Capital Advance Tracker Panel */}
        <CapitalAdvanceTracker
          pending={pending}
          loading={loadingAdvances}
          onMarkReturned={handleMarkReturned}
        />
        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder="Cari transaksi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-100 focus:bg-white rounded-xl transition-all h-11"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Desktop toggle chart */}
            <Button
              variant="outline"
              onClick={() => setShowCharts(!showCharts)}
              className={`hidden sm:flex items-center gap-2 h-11 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 ${showCharts ? "bg-indigo-50 border-indigo-200 text-indigo-600" : ""}`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>{showCharts ? "Sembunyikan Grafik" : "Tampilkan Grafik"}</span>
            </Button>

            {/* Mobile toggles */}
            <Button
              variant="outline"
              onClick={() => setShowStats(!showStats)}
              className={`sm:hidden flex-1 h-11 flex items-center justify-center gap-2 transition-all ${
                showStats
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {showStats ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Tutup Ringkasan</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Ringkasan</span>
                </>
              )}
            </Button>

            {pending.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 h-11 bg-rose-50/80 border border-rose-100/50 rounded-xl text-rose-700 text-xs font-bold select-none shrink-0">
                <Coins className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Modal Aktif: {pending.length}</span>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setShowFilter(true)}
              className={`flex-1 sm:flex-none relative h-11 border-slate-200 ${filterCount > 0 ? "border-indigo-500 text-indigo-600 bg-indigo-50" : ""}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Filter</span>
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 items-center justify-center text-[8px] text-white font-bold">{filterCount}</span>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`${showStats ? "grid" : "hidden sm:grid"} grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300`}>
          <StatCard label="Pemasukan" value={totalMasuk} type="income" />
          <StatCard label="Pengeluaran" value={totalKeluar} type="expense" />
          <StatCard 
            label="Sisa Saldo Kas" 
            value={globalSummary ? globalSummary.totalSaldo : saldo} 
            type="balance"
            sub={globalSummary ? `Net flow periode ini: ${totalMasuk - totalKeluar >= 0 ? "+" : ""}${formatIDR(totalMasuk - totalKeluar)}` : undefined}
          />
        </div>

        {/* Charts & Visualization Section */}
        <AnimatePresence>
          {showCharts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden hidden sm:block"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
                {/* Chart Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Aliran Arus Kas</h3>
                      <p className="text-[10px] text-slate-400">Visualisasi pemasukan vs pengeluaran kas</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Pemasukan
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Pengeluaran
                      </span>
                    </div>
                  </div>
                  <div className="h-64 sm:h-72 w-full">
                    {chartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Tidak ada data untuk grafik</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={8} />
                          <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={formatShortIDR} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area type="monotone" dataKey="masuk" name="Pemasukan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" />
                          <Area type="monotone" dataKey="keluar" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorKeluar)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Category allocation */}
                <div className="lg:col-span-1">
                  <CategorySummaryCard data={categoryBreakdown} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <Card className="bg-white shadow-sm border border-slate-100 overflow-hidden rounded-2xl">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      disabled={loading}
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Keterangan</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Kategori</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Nominal</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 bg-white">
                {loading ? (
                  <LedgerTableSkeleton />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Tidak ada transaksi</h3>
                        <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau tambah transaksi baru.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedTransactions.map(({ date, items }) => (
                    <React.Fragment key={date}>
                      {/* Group Header Row */}
                      <tr className="bg-slate-50/30">
                        <td colSpan={7} className="px-6 py-2.5 text-xs font-bold text-slate-400 tracking-wide select-none">
                          {formatGroupDate(date)}
                        </td>
                      </tr>
                      {items.map((r) => {
                        const isSelected = selectedIds.has(r.id);
                        const MethodIcon = getMethodIcon(r.metode);
                        return (
                          <tr
                            key={r.id}
                            className={`group hover:bg-slate-50/40 transition-colors ${isSelected ? "bg-indigo-50/30 hover:bg-indigo-50/40" : ""}`}
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleSelect(r.id)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                              {formatAndAddYear(r.tanggal).split(" ").slice(0, 2).join(" ")}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-800 line-clamp-1">
                                {r.keterangan || "Tanpa keterangan"}
                              </div>
                              {r.metode && (
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                  <MethodIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{r.metode}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {r.kategori ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                                  {r.kategori}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-semibold">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <TypeBadge type={r.tipe} />
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-black text-right font-mono ${r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              {r.tipe === "Masuk" ? "+" : "-"}
                              {formatIDR(Number(r.jumlah || 0))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() =>
                                    setShowForm({ open: true, editing: r })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden">
            {loading ? (
              <LedgerMobileSkeleton />
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Tidak ada transaksi</h3>
                <p className="text-sm mt-1 max-w-xs mx-auto text-slate-400">
                  Coba ubah filter pencarian Anda atau tambahkan transaksi baru.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {groupedTransactions.map(({ date, items }) => (
                  <div key={date} className="space-y-1.5">
                    <div className="px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest static sm:sticky sm:top-16 bg-white/95 backdrop-blur-sm z-10">
                      {formatGroupDate(date)}
                    </div>
                    <div className="divide-y divide-slate-100/60 bg-white border-y border-slate-100">
                      {items.map((r) => {
                        const isSelected = selectedIds.has(r.id);
                        const MethodIcon = getMethodIcon(r.metode);
                        return (
                          <div
                            key={r.id}
                            className={`p-4 active:bg-slate-50 transition-colors flex items-center gap-3 ${isSelected ? "bg-indigo-50/40" : ""}`}
                          >
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleSelect(r.id)}
                              />
                            </div>

                            <div
                              className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                              onClick={() => setShowForm({ open: true, editing: r })}
                            >
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  r.tipe === "Masuk"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-rose-100 text-rose-600"
                                }`}
                              >
                                {r.tipe === "Masuk" ? (
                                  <ArrowDownLeft className="w-5 h-5" />
                                ) : (
                                  <ArrowUpRight className="w-5 h-5" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 break-all">
                                  {r.keterangan || "Tanpa Keterangan"}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px]">
                                  <span className={`font-bold font-mono ${r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}>
                                    {r.tipe === "Keluar" && "-"}
                                    {formatIDR(Number(r.jumlah || 0))}
                                  </span>
                                  {r.metode && (
                                    <>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-slate-500 flex items-center gap-1">
                                        <MethodIcon className="w-3 h-3 text-slate-400" />
                                        {r.metode}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {r.kategori && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                                      {r.kategori}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(r.id);
                              }}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              aria-label="Hapus transaksi"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Load More Fallback Button */}
          {(q.trim() !== "" ? renderLimit < filtered.length : rows.length >= limitValue) && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  if (q.trim() !== "") {
                    setRenderLimit((prev) => prev + 50);
                  } else {
                    setLimitValue((prev) => prev + 50);
                  }
                }}
                className="w-full sm:w-auto h-10 px-6 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Memuat..." : "Muat Lebih Banyak"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilter && (
          <FilterModal
            initial={{
              type: typeFilter,
              category: categoryFilter,
              from: dateFrom,
              to: dateTo,
            }}
            defaults={{ from: defaultFrom, to: defaultTo, categories }}
            onApply={(p: any) => {
              setTypeFilter(p.type);
              setCategoryFilter(p.category);
              setDateFrom(p.from);
              setDateTo(p.to);
              setShowFilter(false);
            }}
            onReset={() => {
              setTypeFilter("");
              setCategoryFilter("");
              setDateFrom(defaultFrom);
              setDateTo(defaultTo);
              setShowFilter(false);
            }}
            onClose={() => setShowFilter(false)}
          />
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm.open && (
          <LedgerFormModal
            initial={showForm.editing ?? undefined}
            onClose={() => setShowForm({ open: false, editing: null })}
            onSubmit={handleSubmitForm}
          />
        )}
      </AnimatePresence>

      {/* Mobile Export Excel Button */}
      {filtered.length > 0 && (
        <button
          onClick={() => exportLedgerToExcel(filtered, "Laporan_Kas.xlsx")}
          className="sm:hidden fixed bottom-36 right-6 z-35 h-12 w-12 bg-white border border-slate-100 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all animate-in slide-in-from-bottom-5 duration-200"
          title="Export Excel"
        >
          <Download className="w-5 h-5 text-emerald-600" />
        </button>
      )}

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setShowForm({ open: true, editing: null })}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-35 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Selection Summary Bar (Premium Floating Action Dock) */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <div className="fixed bottom-24 sm:bottom-6 left-0 right-0 z-[80] flex justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full sm:w-auto min-w-[320px] max-w-2xl"
            >
              <div className="bg-slate-900/95 backdrop-blur-lg text-white rounded-2xl shadow-2xl border border-slate-800/80 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {selectedCount}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Terpilih</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-emerald-400 font-bold font-mono">+{formatIDR(selectedTotalMasuk)}</span>
                      <span className="text-slate-600 text-xs">/</span>
                      <span className="text-xs text-rose-400 font-bold font-mono">-{formatIDR(selectedTotalKeluar)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-slate-800/50 pt-3 sm:pt-0 sm:border-t-0">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1.5 transition-colors"
                  >
                    Batal
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => exportLedgerToExcel(filtered.filter(r => selectedIds.has(r.id)), "Laporan_Kas_Terpilih.xlsx")}
                      className="h-9 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ekspor Excel</span>
                    </Button>
                    <Button
                      onClick={handleBulkDelete}
                      className="h-9 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus ({selectedCount})</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            type={confirmModal.type}
          />
        )}

        {advConfirmModal.isOpen && (
          <ConfirmModal
            isOpen={advConfirmModal.isOpen}
            onClose={() => setAdvConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={advConfirmModal.onConfirm}
            title={advConfirmModal.title}
            message={advConfirmModal.message}
            confirmText={advConfirmModal.confirmText}
            type={advConfirmModal.type}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Filter Modal Component (Clean Dialog Style) =====
function FilterModal({ initial, defaults, onApply, onReset, onClose }: any) {
  const [local, setLocal] = useState(initial);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="relative w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Filter Transaksi</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tipe Transaksi
            </label>
            <Select
              value={local.type}
              onChange={(e) =>
                setLocal({ ...local, type: (e.target as any).value })
              }
              className="w-full h-11 bg-slate-50 border-slate-100 rounded-xl"
            >
              <option value="">Semua</option>
              <option value="Masuk">Pemasukan</option>
              <option value="Keluar">Pengeluaran</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kategori
            </label>
            <Select
              value={local.category}
              onChange={(e) =>
                setLocal({ ...local, category: (e.target as any).value })
              }
              className="w-full h-11 bg-slate-50 border-slate-100 rounded-xl"
            >
              <option value="">Semua Kategori</option>
              {defaults.categories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dari
              </label>
              <Input
                type="date"
                value={local.from}
                onChange={(e) => setLocal({ ...local, from: e.target.value })}
                className="w-full text-sm h-11 bg-slate-50 border-slate-100 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sampai
              </label>
              <Input
                type="date"
                value={local.to}
                onChange={(e) => setLocal({ ...local, to: e.target.value })}
                className="w-full text-sm h-11 bg-slate-50 border-slate-100 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
          <Button variant="ghost" onClick={onReset} className="flex-1 text-slate-500 hover:bg-slate-100">
            Reset
          </Button>
          <Button
            onClick={() => onApply(local)}
            className="flex-[2] bg-slate-900 text-white hover:bg-slate-800"
          >
            Terapkan Filter
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
