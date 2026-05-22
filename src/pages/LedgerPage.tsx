// src/pages/LedgerPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card } from "../components/ui/Card";
import { formatIDR } from "../utils/format";
import {
  fetchLedger,
  subscribeLedger,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  type LedgerEntry,
  type LedgerUpsert,
} from "../services/ledgerFirebase";
import { LedgerFormModal } from "../components/LedgerFormModal";
import { formatAndAddYear } from "../utils/helpers";
import { BG, FAB_COLOR_CLASS } from "../utils/constants";
import {
  TrendingUp, TrendingDown, Wallet, Search, Filter,
  Plus, Trash2, Pencil, ArrowUpRight, ArrowDownLeft,
  X, FileText, Download, Check
} from "lucide-react";
import { exportLedgerToExcel } from "../utils/exportExcel";


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

// ===== Icons (Lucide Style) =====

// ===== Sub Components =====

function StatCard({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "income" | "expense" | "balance";
}) {
  const config = {
    income: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    expense: { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    balance: { icon: Wallet, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
  }[type];

  const Icon = config.icon;

  return (
    <div
      className={`p-5 rounded-2xl bg-white border ${config.border} shadow-sm flex flex-col justify-between transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${config.bg} ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">
          {formatIDR(value)}
        </span>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: "Masuk" | "Keluar" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${type === "Masuk"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
        }`}
    >
      {type === "Masuk" ? "Pemasukan" : "Pengeluaran"}
    </span>
  );
}

export function LedgerPage() {
  // ===== Filters =====
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "Masuk" | "Keluar">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () =>
      toInputDate(
        startOfMonth(new Date(now.getFullYear() - 5, now.getMonth() - 2, 1)),
      ),
    [now],
  );
  const defaultTo = useMemo(() => toInputDate(endOfMonth(now)), [now]);

  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo, setDateTo] = useState<string>(defaultTo);

  // ===== Data =====
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.kategori && set.add(r.kategori));
    return Array.from(set).sort();
  }, [rows]);

  // ===== Local text search =====
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText =
        !s ||
        [r.keterangan, r.kategori, r.metode, r.catatan, r.tanggal].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(s),
        );
      const matchesType = !typeFilter || r.tipe === typeFilter;
      const matchesCategory = !categoryFilter || r.kategori === categoryFilter;
      return matchesText && matchesType && matchesCategory;
    });
  }, [rows, q, typeFilter, categoryFilter]);

  // ===== Summary =====
  const { totalMasuk, totalKeluar, saldo } = useMemo(() => {
    let masuk = 0,
      keluar = 0;
    for (const r of filtered) {
      if (r.tipe === "Masuk") masuk += Number(r.jumlah || 0);
      else keluar += Number(r.jumlah || 0);
    }
    return { totalMasuk: masuk, totalKeluar: keluar, saldo: masuk - keluar };
  }, [filtered]);

  // ===== Selection Logic =====
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  const { selectedTotalMasuk, selectedTotalKeluar, selectedSaldo, selectedCount } = useMemo(() => {
    let masuk = 0, keluar = 0, count = 0;
    for (const r of filtered) {
      if (selectedIds.has(r.id)) {
        count++;
        if (r.tipe === "Masuk") masuk += Number(r.jumlah || 0);
        else keluar += Number(r.jumlah || 0);
      }
    }
    return {
      selectedTotalMasuk: masuk,
      selectedTotalKeluar: keluar,
      selectedSaldo: masuk - keluar,
      selectedCount: count
    };
  }, [filtered, selectedIds]);

  // ===== Fetch + Realtime =====
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function go() {
      setLoading(true);
      try {
        const data = await fetchLedger({
          from: dateFrom,
          to: dateTo,
          type: typeFilter || undefined,
          category: categoryFilter || undefined,
          limit: 500,
          order: { field: "tanggal", direction: "desc" },
        });
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
      unsub = subscribeLedger(
        {
          from: dateFrom,
          to: dateTo,
          type: typeFilter || undefined,
          category: categoryFilter || undefined,
          limit: 500,
          order: { field: "tanggal", direction: "desc" },
        },
        (live) => {
          if (!cancelled) setRows(live);
        },
      );
    }

    go();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [dateFrom, dateTo, typeFilter, categoryFilter]);

  // ===== CRUD modal state =====
  const [showForm, setShowForm] = useState<{
    open: boolean;
    editing?: LedgerEntry | null;
  }>({ open: false, editing: null });
  const [showFilter, setShowFilter] = useState(false);
  const [showStats, setShowStats] = useState(false); // Default hide for mobile

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini permanen?")) return;
    await deleteLedgerEntry(id);
  }

  async function handleSubmitForm(val: LedgerUpsert) {
    if (showForm.editing?.id) await updateLedgerEntry(showForm.editing.id, val);
    else await createLedgerEntry(val);
  }

  const filterCount = [
    typeFilter,
    categoryFilter,
    dateFrom !== defaultFrom,
    dateTo !== defaultTo,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
      {/* 1. Header Section (Sticky) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Buku Kas
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => exportLedgerToExcel(filtered, "Laporan_Kas.xlsx")}
                className="hidden sm:flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </Button>
              <Button
                onClick={() => setShowForm({ open: true, editing: null })}
                className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baru</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toolbar & Filters (Mobile & Desktop) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder="Cari transaksi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white rounded-lg transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowStats(!showStats)}
              className={`sm:hidden flex-1 h-11 flex items-center justify-center gap-2 transition-all ${
                showStats
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white"
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
                  <span>Lihat Ringkasan</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowFilter(true)}
              className={`flex-1 sm:flex-none relative h-11 ${filterCount > 0 ? "border-indigo-500 text-indigo-600 bg-indigo-50" : ""}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Filter</span>
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`${showStats ? "grid" : "hidden sm:grid"} grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300`}>
          <StatCard label="Pemasukan" value={totalMasuk} type="income" />
          <StatCard label="Pengeluaran" value={totalKeluar} type="expense" />
          <StatCard label="Sisa Saldo" value={saldo} type="balance" />
        </div>

        {/* Content Area */}
        <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden rounded-xl">
          {loading && (
            <div className="p-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3"></div>
              Memuat data transaksi...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">
                Tidak ada transaksi
              </h3>
              <p className="text-sm mt-1 max-w-xs mx-auto">
                Coba ubah filter pencarian Anda atau tambahkan transaksi baru.
              </p>
            </div>
          )}

          {/* Desktop Table View */}
          {!loading && filtered.length > 0 && (
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    {[
                      "",
                      "Tanggal",
                      "Keterangan",
                      "Kategori",
                      "Status",
                      "Nominal",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${i === 5 ? "text-right" : "text-left"}`}
                      >
                        {i === 0 ? (
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                            onChange={toggleSelectAll}
                          />
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={`group hover:bg-slate-50/80 transition-colors ${selectedIds.has(r.id) ? "bg-indigo-50/50" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                        {formatAndAddYear(r.tanggal)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 line-clamp-1">
                          {r.keterangan || "Tanpa keterangan"}
                        </div>
                        {r.metode && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {r.metode}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.kategori ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                            {r.kategori}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TypeBadge type={r.tipe} />
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right font-mono ${r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {r.tipe === "Masuk" ? "+" : "-"}
                        {formatIDR(Number(r.jumlah || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <button
                            onClick={() =>
                              setShowForm({ open: true, editing: r })
                            }
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile List View (Refined) */}
          {/* Mobile List View (Refined & Fixed) */}
          {!loading && filtered.length > 0 && (
            <div className="sm:hidden divide-y divide-slate-100">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="p-4 active:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox Mobile */}
                    <div className="pt-3 pl-1">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </div>
                    {/* Area Klik untuk Edit (Kiri & Tengah) */}
                    <div
                      className="flex-1 flex items-start gap-3 cursor-pointer"
                      onClick={() => setShowForm({ open: true, editing: r })}
                    >
                      {/* Icon Status */}
                      <div
                        className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${r.tipe === "Masuk"
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

                      {/* Detail Transaksi */}
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1 break-all">
                          {r.keterangan || "Transaksi Tanpa Nama"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span
                            className={`text-sm font-bold ${r.tipe === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {r.tipe === "Keluar" && "-"}
                            {formatIDR(Number(r.jumlah || 0))}
                          </span>
                          <span className="text-xs text-slate-300">|</span>
                          <span className="text-xs text-slate-500">
                            {formatAndAddYear(r.tanggal)}
                          </span>
                        </div>
                        {r.kategori && (
                          <div className="mt-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {r.kategori}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tombol Hapus (Kanan) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Mencegah modal edit terbuka
                        handleDelete(r.id);
                      }}
                      className="p-2 -mr-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      aria-label="Hapus transaksi"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <FilterModal
          initial={{
            type: typeFilter,
            category: categoryFilter,
            from: dateFrom,
            to: dateTo,
          }}
          defaults={{ from: defaultFrom, to: defaultTo, categories }}
          onApply={(p) => {
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

      {/* Form Modal */}
      {showForm.open && (
        <LedgerFormModal
          initial={showForm.editing ?? undefined}
          onClose={() => setShowForm({ open: false, editing: null })}
          onSubmit={handleSubmitForm}
        />
      )}

      {/* Mobile Export Excel Button */}
      {filtered.length > 0 && (
        <button
          onClick={() => exportLedgerToExcel(filtered, "Laporan_Kas.xlsx")}
          className="sm:hidden fixed bottom-36 right-[28px] z-40 h-12 w-12 bg-white border border-slate-200 rounded-full shadow-xl shadow-slate-200/50 flex items-center justify-center active:scale-95 transition-all animate-in slide-in-from-bottom-5 duration-200"
          title="Export Excel"
        >
          <Download className="w-5 h-5 text-emerald-600" />
        </button>
      )}

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setShowForm({ open: true, editing: null })}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Selection Summary Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
            <div className="px-4 py-3 sm:px-6 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedCount}
                </div>
                <span className="text-sm font-medium text-slate-300">Item dipilih</span>
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1 px-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Batalkan
              </button>
            </div>
            <div className="px-4 py-4 sm:px-6 grid grid-cols-3 gap-2 text-center bg-slate-900/50">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">Pemasukan</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  +{formatIDR(selectedTotalMasuk)}
                </div>
              </div>
              <div className="border-x border-slate-800">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">Pengeluaran</div>
                <div className="text-sm font-bold text-rose-400 font-mono">
                  -{formatIDR(selectedTotalKeluar)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">Total Saldo</div>
                <div className="text-sm font-bold text-white font-mono">
                  {formatIDR(selectedSaldo)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Filter Modal Component (Clean Dialog Style) =====
function FilterModal({ initial, defaults, onApply, onReset, onClose }: any) {
  const [local, setLocal] = useState(initial);

  // Close on click outside
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Filter Transaksi</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tipe Transaksi
            </label>
            <Select
              value={local.type}
              onChange={(e) =>
                setLocal({ ...local, type: (e.target as any).value })
              }
              className="w-full"
            >
              <option value="">Semua</option>
              <option value="Masuk">Pemasukan</option>
              <option value="Keluar">Pengeluaran</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Kategori
            </label>
            <Select
              value={local.category}
              onChange={(e) =>
                setLocal({ ...local, category: (e.target as any).value })
              }
              className="w-full"
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Dari
              </label>
              <Input
                type="date"
                value={local.from}
                onChange={(e) => setLocal({ ...local, from: e.target.value })}
                className="w-full text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Sampai
              </label>
              <Input
                type="date"
                value={local.to}
                onChange={(e) => setLocal({ ...local, to: e.target.value })}
                className="w-full text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex gap-3">
          <Button variant="ghost" onClick={onReset} className="flex-1">
            Reset
          </Button>
          <Button
            onClick={() => onApply(local)}
            className="flex-[2] bg-slate-900 text-white hover:bg-slate-800"
          >
            Terapkan Filter
          </Button>
        </div>
      </div>
    </div>
  );
}
