import { useEffect, useMemo, useState } from "react";
import {
  fetchLedger,
  subscribeLedger,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  voidLedgerEntries,
  recalculateLedgerSummary,
  type LedgerEntry,
  type LedgerUpsert,
} from "../services/ledgerFirebase";
import { filterLedger, summarizeLedger, visibleSelectedIds } from "../utils/ledger";
import { MONTH_LABEL_ID } from "../utils/helpers";

export function useLedger() {
  const params = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);

  // ===== Filters =====
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "Masuk" | "Keluar">((params.get("type") as any) || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(params.get("category") || "");

  const defaultFrom = "";
  const defaultTo = "";

  const [dateFrom, setDateFrom] = useState<string>(params.get("from") || defaultFrom);
  const [dateTo, setDateTo] = useState<string>(params.get("to") || defaultTo);

  // ===== Data =====
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const globalSummary = useMemo(() => summarizeLedger(rows), [rows]);
  const [syncingSummary, setSyncingSummary] = useState(false);
  const [renderLimit, setRenderLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCharts, setShowCharts] = useState(true);

  // One private subscription supplies complete charts and reports.
  // Pagination limits rendering only; exporting never depends on how far the user scrolled.
  const filtered = useMemo(() => filterLedger(rows, {
    q, type: typeFilter, category: categoryFilter, from: dateFrom, to: dateTo,
  }), [rows, q, typeFilter, categoryFilter, dateFrom, dateTo]);

  const displayedRows = useMemo(() => {
    return filtered.slice(0, renderLimit);
  }, [filtered, renderLimit]);

  // Reset limits when filters change
  useEffect(() => {
    setRenderLimit(50);
    setSelectedIds(new Set());
  }, [q, typeFilter, categoryFilter, dateFrom, dateTo]);

  const isFiltered = typeFilter !== "" || categoryFilter !== "" || dateFrom !== "" || dateTo !== "";

  useEffect(() => {
    const handleScroll = () => {
      if (!loading && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 150) {
        setRenderLimit(previous => Math.min(previous + 50, Math.max(50, filtered.length)));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, filtered.length]);

  async function handleRecalculate() {
    setSyncingSummary(true);
    try {
      await recalculateLedgerSummary();
      setRows(await fetchLedger());
      setError(null);
      alert("Saldo kas berhasil disinkronisasi ulang!");
    } catch (err) {
      console.error("Gagal melakukan sinkronisasi:", err);
      alert("Gagal melakukan sinkronisasi saldo.");
    } finally {
      setSyncingSummary(false);
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => !r.voidedAt && r.kategori && set.add(r.kategori));
    return Array.from(set).sort();
  }, [rows]);

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
    if (visibleSelectedIds(filtered, selectedIds).length === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  const { selectedTotalMasuk, selectedTotalKeluar, selectedCount } = useMemo(() => {
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
      selectedCount: count
    };
  }, [filtered, selectedIds]);

  // ===== Group transactions by date =====
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: LedgerEntry[] } = {};
    displayedRows.forEach(r => {
      const date = r.tanggal;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(r);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        items: groups[date]
      }));
  }, [displayedRows]);

  // ===== Smart Chart Grouping =====
  const chartData = useMemo(() => {
    const uniqueDates = new Set(filtered.map(r => r.tanggal));
    const groupByMonth = uniqueDates.size > 31;

    const map = new Map<string, { label: string; masuk: number; keluar: number; dateKey: string }>();

    filtered.forEach(r => {
      let key = r.tanggal;
      let label = r.tanggal;
      if (groupByMonth) {
        const match = r.tanggal.match(/^(\d{4})-(\d{2})/);
        key = match ? `${match[1]}-${match[2]}` : r.tanggal;
        if (match) {
          const mIdx = Number(match[2]) - 1;
          label = `${MONTH_LABEL_ID[mIdx]} ${match[1].slice(2)}`;
        }
      } else {
        const match = r.tanggal.match(/^\d{4}-(\d{2})-(\d{2})/);
        if (match) {
          const mIdx = Number(match[1]) - 1;
          label = `${Number(match[2])} ${MONTH_LABEL_ID[mIdx]}`;
        }
      }

      if (!map.has(key)) {
        map.set(key, { label, masuk: 0, keluar: 0, dateKey: key });
      }
      const item = map.get(key)!;
      if (r.tipe === "Masuk") {
        item.masuk += Number(r.jumlah || 0);
      } else {
        item.keluar += Number(r.jumlah || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [filtered]);

  // ===== Category Breakdown =====
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { kategori: string; total: number; tipe: "Masuk" | "Keluar" }>();
    filtered.forEach(r => {
      const cat = r.kategori || "Lainnya";
      const key = `${r.tipe}-${cat}`;
      if (!map.has(key)) {
        map.set(key, { kategori: cat, total: 0, tipe: r.tipe });
      }
      map.get(key)!.total += Number(r.jumlah || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ===== Realtime =====
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeLedger({}, live => {
      setRows(live);
      setLoading(false);
      setError(null);
    }, err => {
      setLoading(false);
      setError("Data kas gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
      console.error("[useLedger]", err);
    });
  }, [reloadKey]);

  // ===== CRUD modal state =====
  const [showForm, setShowForm] = useState<{
    open: boolean;
    editing?: LedgerEntry | null;
  }>({ open: false, editing: null });
  const [showFilter, setShowFilter] = useState(false);
  const [showStats, setShowStats] = useState(false); // Mobile stats panel
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  async function handleDelete(id: string) {
    setConfirmModal({
      isOpen: true, title: "Batalkan Transaksi", type: "warning", confirmText: "Batalkan Transaksi",
      message: "Transaksi dikeluarkan dari saldo, tetapi tetap tersimpan dan bisa dipulihkan melalui Riwayat.",
      onConfirm: async () => {
        try { await deleteLedgerEntry(id); }
        catch (error) { alert(error instanceof Error ? error.message : "Pembatalan gagal."); throw error; }
      },
    });
  }

  async function handleBulkDelete() {
    // Freeze precisely the selection shown by the UI at confirmation time.
    const ids = visibleSelectedIds(filtered, selectedIds);
    if (!ids.length) return;
    setConfirmModal({
      isOpen: true, title: "Batalkan Transaksi Terpilih", type: "warning", confirmText: "Batalkan Transaksi",
      message: `Batalkan ${ids.length} transaksi terpilih? Seluruh perubahan disimpan bersamaan dan dapat dipulihkan melalui Riwayat.`,
      onConfirm: async () => {
        try { await voidLedgerEntries(ids); setSelectedIds(new Set()); }
        catch (error) { alert(error instanceof Error ? error.message : "Pembatalan gagal."); throw error; }
      },
    });
  }

  async function handleSubmitForm(val: LedgerUpsert, opts?: { trackAsCapital?: boolean }) {
    if (showForm.editing?.id) await updateLedgerEntry(showForm.editing.id, val, { ...opts, expectedRevision: showForm.editing.revision || 0 });
    else await createLedgerEntry(val, opts);
  }

  const filterCount = [
    typeFilter,
    categoryFilter,
    dateFrom !== defaultFrom,
    dateTo !== defaultTo,
  ].filter(Boolean).length;

  return {
    error, retry: () => setReloadKey(value => value + 1),
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
    setRows,
    globalSummary,
    syncingSummary,
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
  };
}
