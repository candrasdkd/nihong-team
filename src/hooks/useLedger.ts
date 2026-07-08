import { useEffect, useMemo, useState } from "react";
import {
  fetchLedger,
  subscribeLedger,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  subscribeLedgerSummary,
  recalculateLedgerSummary,
  type LedgerEntry,
  type LedgerUpsert,
  type LedgerSummary,
} from "../services/ledgerFirebase";
import { MONTH_LABEL_ID } from "../utils/helpers";

export function useLedger() {
  // ===== Filters =====
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "Masuk" | "Keluar">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const defaultFrom = "";
  const defaultTo = "";

  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo, setDateTo] = useState<string>(defaultTo);

  // ===== Data =====
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [globalSummary, setGlobalSummary] = useState<LedgerSummary | null>(null);
  const [syncingSummary, setSyncingSummary] = useState(false);
  const [limitValue, setLimitValue] = useState(50);
  const [renderLimit, setRenderLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCharts, setShowCharts] = useState(true);

  // Subscribe to global cash balance summary
  useEffect(() => {
    const unsub = subscribeLedgerSummary((summary) => {
      setGlobalSummary(summary);
    });
    return () => unsub();
  }, []);

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

  const displayedRows = useMemo(() => {
    return filtered.slice(0, renderLimit);
  }, [filtered, renderLimit]);

  // Reset render limit when filters change
  useEffect(() => {
    setRenderLimit(50);
  }, [q, typeFilter, categoryFilter, dateFrom, dateTo]);

  // Auto load more when scrolling near bottom
  useEffect(() => {
    function handleScroll() {
      if (loading) return;

      const threshold = 150; // px from bottom
      const isNearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - threshold;
        
      if (!isNearBottom) return;

      const isSearching = q.trim() !== "";
      if (isSearching) {
        if (renderLimit < filtered.length) {
          setRenderLimit((prev) => prev + 50);
        }
      } else {
        if (rows.length >= limitValue) {
          setLimitValue((prev) => prev + 50);
        }
      }
    }
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [rows.length, filtered.length, limitValue, renderLimit, loading, q]);

  async function handleRecalculate() {
    setSyncingSummary(true);
    try {
      await recalculateLedgerSummary();
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
    rows.forEach((r) => r.kategori && set.add(r.kategori));
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
    if (selectedIds.size === filtered.length && filtered.length > 0) {
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

  // ===== Fetch + Realtime =====
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function go() {
      setLoading(true);
      try {
        const isSearching = q.trim() !== "";
        const queryLimit = isSearching ? undefined : limitValue;
        const data = await fetchLedger({
          from: dateFrom,
          to: dateTo,
          type: typeFilter || undefined,
          category: categoryFilter || undefined,
          limit: queryLimit,
          order: { field: "tanggal", direction: "desc" },
        });
        const sortedData = [...data].sort((a, b) => {
          const dateCompare = b.tanggal.localeCompare(a.tanggal);
          if (dateCompare !== 0) return dateCompare;
          return (b.createdAt ?? 0) - (a.createdAt ?? 0);
        });
        if (!cancelled) setRows(sortedData);
      } finally {
        if (!cancelled) setLoading(false);
      }
      unsub = subscribeLedger(
        {
          from: dateFrom,
          to: dateTo,
          type: typeFilter || undefined,
          category: categoryFilter || undefined,
          limit: q.trim() !== "" ? undefined : limitValue,
          order: { field: "tanggal", direction: "desc" },
        },
        (live) => {
          const sortedLive = [...live].sort((a, b) => {
            const dateCompare = b.tanggal.localeCompare(a.tanggal);
            if (dateCompare !== 0) return dateCompare;
            return (b.createdAt ?? 0) - (a.createdAt ?? 0);
          });
          if (!cancelled) setRows(sortedLive);
        },
      );
    }

    go();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [dateFrom, dateTo, typeFilter, categoryFilter, limitValue, q]);

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
      isOpen: true,
      title: "Hapus Transaksi",
      message: "Apakah Anda yakin ingin menghapus transaksi ini secara permanen dari kas?",
      confirmText: "Hapus",
      type: "danger",
      onConfirm: async () => {
        await deleteLedgerEntry(id);
      },
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Hapus Transaksi Terpilih",
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.size} transaksi terpilih secara permanen?`,
      confirmText: "Hapus Semua",
      type: "danger",
      onConfirm: async () => {
        setLoading(true);
        try {
          await Promise.all(Array.from(selectedIds).map((id) => deleteLedgerEntry(id)));
          setSelectedIds(new Set());
        } catch (error) {
          console.error("Gagal menghapus transaksi terpilih:", error);
          alert("Terjadi kesalahan saat menghapus beberapa transaksi.");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function handleSubmitForm(val: LedgerUpsert, opts?: { trackAsCapital?: boolean }) {
    if (showForm.editing?.id) await updateLedgerEntry(showForm.editing.id, val);
    else await createLedgerEntry(val, opts);
  }

  const filterCount = [
    typeFilter,
    categoryFilter,
    dateFrom !== defaultFrom,
    dateTo !== defaultTo,
  ].filter(Boolean).length;

  return {
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
  };
}
