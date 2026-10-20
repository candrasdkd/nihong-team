import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  fetchLedger,
  getLedgerPage,
  readLedgerSummary,
  subscribeLedgerSummary,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  voidLedgerEntries,
  recalculateLedgerSummary,
  type LedgerEntry,
  type LedgerSummary,
  type LedgerUpsert,
} from "../services/ledgerFirebase";
import { filterLedger, visibleSelectedIds } from "../utils/ledger";
import { MONTH_LABEL_ID } from "../utils/helpers";

const knownCategories = ["Belanja", "Keuntungan Bulanan", "Lainnya", "Operasional", "Pengembalian Modal", "Refund", "Tiket Pesawat"];
export const LEDGER_PAGE_SIZE = 15;

export function useLedger() {
  const params = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);

  // ===== Filters =====
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "Masuk" | "Keluar">((params.get("type") as any) || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(params.get("category") || "");

  const defaultFrom = "";
  const defaultTo = "";

  const [dateFrom, setDateFrom] = useState<string>(params.get("from") || defaultFrom);
  const [dateTo, setDateTo] = useState<string>(params.get("to") || defaultTo);

  // ===== Data =====
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [globalSummary, setGlobalSummary] = useState<LedgerSummary | null>(null);
  const [syncingSummary, setSyncingSummary] = useState(false);
  const [renderLimit, setRenderLimit] = useState(LEDGER_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageCursor = useRef<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const loadingMoreRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCharts, setShowCharts] = useState(true);

  const filtered = useMemo(() => filterLedger(rows, {
    q, type: typeFilter, category: categoryFilter, from: dateFrom, to: dateTo,
  }), [rows, q, typeFilter, categoryFilter, dateFrom, dateTo]);

  const displayedRows = useMemo(() => {
    return filtered.slice(0, renderLimit);
  }, [filtered, renderLimit]);

  // Reset limits when filters change
  useEffect(() => {
    setRenderLimit(LEDGER_PAGE_SIZE);
    setSelectedIds(new Set());
  }, [q, typeFilter, categoryFilter, dateFrom, dateTo]);

  const isFiltered = typeFilter !== "" || categoryFilter !== "" || dateFrom !== "" || dateTo !== "";

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(q.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const pageParams = {
    from: dateFrom || undefined,
    to: dateTo || undefined,
    type: typeFilter || undefined,
    category: categoryFilter || undefined,
  };

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore || q.trim() || searchTerm || !pageCursor.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getLedgerPage(pageParams, pageCursor.current, LEDGER_PAGE_SIZE);
      pageCursor.current = page.cursor;
      setRows((previous) => {
        const existingIds = new Set(previous.map((row) => row.id));
        return [...previous, ...page.rows.filter((row) => !existingIds.has(row.id))];
      });
      setRenderLimit((previous) => previous + LEDGER_PAGE_SIZE);
      setHasMore(page.hasMore);
      setError(null);
    } catch (err) {
      console.error("Gagal memuat transaksi kas berikutnya:", err);
      setError("Transaksi berikutnya gagal dimuat. Periksa koneksi atau indeks Firestore, lalu coba lagi.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (loading || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 150) return;
      if (q.trim() || searchTerm) {
        setRenderLimit(previous => Math.min(previous + LEDGER_PAGE_SIZE, Math.max(LEDGER_PAGE_SIZE, filtered.length)));
      } else {
        void loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, filtered.length, hasMore, q, searchTerm, dateFrom, dateTo, typeFilter, categoryFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHasMore(false);
    setRows([]);
    setRenderLimit(LEDGER_PAGE_SIZE);
    pageCursor.current = undefined;
    loadingMoreRef.current = false;

    const params = {
      from: dateFrom || undefined,
      to: dateTo || undefined,
      type: typeFilter || undefined,
      category: categoryFilter || undefined,
    };

    // Firestore Standard cannot query substring text. Keep the existing exact search behavior,
    // but run the complete read only after the user enters a search term.
    const load = searchTerm
      ? fetchLedger(params).then((allRows) => ({ rows: filterLedger(allRows, { ...params, q: searchTerm }), hasMore: false, cursor: undefined }))
      : getLedgerPage(params, undefined, LEDGER_PAGE_SIZE);

    load.then((page) => {
      if (cancelled) return;
      setRows(page.rows);
      setHasMore(page.hasMore);
      pageCursor.current = page.cursor;
      setLoading(false);
    }).catch((err: unknown) => {
      if (cancelled) return;
      console.error("Gagal memuat transaksi kas:", err);
      setError("Data kas gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [reloadKey, searchTerm, typeFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeLedgerSummary((summary) => {
      if (!cancelled) setGlobalSummary(summary);
    }, (err) => {
      console.error("Gagal mendengarkan ringkasan kas:", err);
    });

    readLedgerSummary().then((summary) => {
      if (!cancelled) setGlobalSummary(summary);
    }).catch((err) => {
      console.error("Gagal memuat ringkasan kas:", err);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function handleRecalculate() {
    setSyncingSummary(true);
    try {
      await recalculateLedgerSummary();
      setReloadKey((value) => value + 1);
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
    const set = new Set<string>(knownCategories);
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
        try { await deleteLedgerEntry(id); setReloadKey((value) => value + 1); }
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
        try { await voidLedgerEntries(ids); setSelectedIds(new Set()); setReloadKey((value) => value + 1); }
        catch (error) { alert(error instanceof Error ? error.message : "Pembatalan gagal."); throw error; }
      },
    });
  }

  async function handleSubmitForm(val: LedgerUpsert, opts?: { trackAsCapital?: boolean }) {
    if (showForm.editing?.id) await updateLedgerEntry(showForm.editing.id, val, { ...opts, expectedRevision: showForm.editing.revision || 0 });
    else await createLedgerEntry(val, opts);
    setReloadKey((value) => value + 1);
  }

  async function fetchAllFilteredLedger() {
    const allRows = await fetchLedger({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      type: typeFilter || undefined,
      category: categoryFilter || undefined,
    });
    return filterLedger(allRows, { q, type: typeFilter, category: categoryFilter, from: dateFrom, to: dateTo });
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
    hasMore,
    loadingMore,
    loadMore,
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
    fetchAllFilteredLedger,
    filterCount,
    defaultFrom,
    defaultTo,
  };
}
