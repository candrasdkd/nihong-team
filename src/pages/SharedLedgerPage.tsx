// src/pages/SharedLedgerPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card } from "../components/ui/Card";
import { formatIDR } from "../utils/format";
import { useLedger } from "../hooks/useLedger";
import { formatAndAddYear, MONTH_LABEL_ID, toInputDate } from "../utils/helpers";
import {
  TrendingUp, TrendingDown, Wallet, Search, Filter,
  ArrowUpRight, ArrowDownLeft, X, FileText, Download, Check,
  Coins, CreditCard, Landmark, CircleDollarSign, Activity,
  BarChart3, Copy, ExternalLink
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

// ===== StatCard Component =====
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
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
          : "bg-rose-50 text-rose-700 border-rose-200/50"
      }`}
    >
      {type === "Masuk" ? (
        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
      ) : (
        <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
      )}
      {type === "Masuk" ? "Pemasukan" : "Pengeluaran"}
    </span>
  );
}

// ===== SharedLedgerPage Component =====
export function SharedLedgerPage() {
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
    isFiltered,
    rows,
    globalSummary,
    limitValue,
    renderLimit,
    setRenderLimit,
    setLimitValue,
    loading,
    showCharts,
    setShowCharts,
    filtered,
    displayedRows,
    categories,
    totalMasuk,
    totalKeluar,
    saldo,
    groupedTransactions,
    chartData,
    categoryBreakdown,
    showFilter,
    setShowFilter,
    showStats,
    setShowStats,
    filterCount,
    defaultFrom,
    defaultTo,
  } = useLedger();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-surface-base pb-24 font-sans text-slate-800">
      {/* Standalone Header without Sidebar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
            N
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-tight">Laporan Buku Kas</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Nihong Jastip · Laporan Publik</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm h-10 text-xs font-semibold px-3 sm:px-4"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Link Disalin</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Salin Link Laporan</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportLedgerToExcel(filtered, "Laporan_Kas.xlsx")}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm h-10 text-xs font-semibold px-3 sm:px-4"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6 space-y-6">
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

            {/* Desktop toggle chart */}
            <Button
              variant="outline"
              onClick={() => setShowCharts(!showCharts)}
              className={`hidden sm:flex items-center gap-2 h-11 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 ${showCharts ? "bg-indigo-50 border-indigo-200 text-indigo-600" : ""}`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>{showCharts ? "Sembunyikan Grafik" : "Tampilkan Grafik"}</span>
            </Button>

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
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="label" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => `Rp ${v >= 1e6 ? `${(v / 1e6).toFixed(0)}J` : `${(v / 1e3).toFixed(0)}rb`}`}
                          />
                          <Tooltip 
                            contentStyle={{ background: "white", borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                            labelStyle={{ fontWeight: "bold", color: "#1e293b", fontSize: "11px" }}
                            itemStyle={{ fontSize: "11px", padding: "2px 0" }}
                            formatter={(v: any) => [formatIDR(Number(v)), ""]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="masuk" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorMasuk)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="keluar" 
                            stroke="#f43f5e" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorKeluar)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Categories Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Rincian Kategori</h3>
                    <p className="text-[10px] text-slate-400 mb-4">Pengeluaran & Pemasukan berdasarkan kategori</p>
                    <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                      {categoryBreakdown.length === 0 ? (
                        <div className="text-xs text-slate-400 py-6 text-center">Belum ada kategori terekam</div>
                      ) : (
                        categoryBreakdown.map((item) => (
                          <div key={`${item.tipe}-${item.kategori}`} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600 truncate max-w-[120px]">{item.kategori}</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold font-mono ${item.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.tipe === "Masuk" ? "+" : "-"}{formatIDR(item.total)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Jumlah Transaksi</span>
                    <span>{filtered.length} baris</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions Table & List */}
        <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4 text-right">Jumlah</th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">Memuat laporan kas...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">Tidak ada transaksi ditemukan</td>
                  </tr>
                ) : (
                  groupedTransactions.map(({ date, items }) => (
                    <React.Fragment key={date}>
                      <tr className="bg-slate-50/40 border-b border-slate-100/50">
                        <td colSpan={6} className="px-6 py-2.5 text-xs font-bold text-slate-400 tracking-wide select-none">
                          {formatGroupDate(date)}
                        </td>
                      </tr>
                      {items.map((r) => {
                        const MethodIcon = getMethodIcon(r.metode);
                        return (
                          <tr key={r.id} className="group hover:bg-slate-50/40 transition-colors">
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
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold font-mono">
                              <span className={r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}>
                                {r.tipe === "Masuk" ? "+" : "-"}{formatIDR(r.jumlah)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-slate-400 max-w-[200px] truncate" title={r.catatan || ""}>
                                {r.catatan || "-"}
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

          {/* Mobile Card List view */}
          <div className="sm:hidden divide-y divide-slate-100">
            {loading && rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Memuat laporan kas...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Tidak ada transaksi kas</div>
            ) : (
              groupedTransactions.map(({ date, items }) => (
                <div key={date} className="flex flex-col">
                  <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    {formatGroupDate(date)}
                  </div>
                  {items.map((r) => {
                    const MethodIcon = getMethodIcon(r.metode);
                    return (
                      <div key={r.id} className="p-4 active:bg-slate-50 transition-colors flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          r.tipe === "Masuk" 
                            ? "bg-emerald-50 border-emerald-100/50 text-emerald-600" 
                            : "bg-rose-50 border-rose-100/50 text-rose-600"
                        }`}>
                          {r.tipe === "Masuk" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-xs font-black text-slate-800 truncate">{r.keterangan || "Tanpa keterangan"}</span>
                            <span className={`text-xs font-extrabold font-mono whitespace-nowrap ${r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}>
                              {r.tipe === "Masuk" ? "+" : "-"}{formatIDR(r.jumlah)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">{r.kategori || "Lainnya"}</span>
                            {r.metode && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <MethodIcon className="w-3 h-3" />
                                <span>{r.metode}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Load More Fallback Button */}
          {((q.trim() !== "" || isFiltered) ? renderLimit < filtered.length : rows.length >= limitValue) && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  if (q.trim() !== "" || isFiltered) {
                    setRenderLimit((prev) => prev + 50);
                  } else {
                    setLimitValue((prev) => {
                      const next = prev + 50;
                      setRenderLimit(next);
                      return next;
                    });
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
    </div>
  );
}

// ===== Filter Modal Component =====
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
