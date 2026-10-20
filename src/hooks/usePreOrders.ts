import { useEffect, useMemo, useRef, useState } from "react";
import { PreOrder, DepartureSchedule, Customer } from "../types";
import {
  addPreOrder,
  updatePreOrder,
  deletePreOrder,
  fetchPreOrders,
  getPreOrderCounts,
  getPreOrdersPage,
  PreOrdersPageCursor,
} from "../services/preOrdersFirebase";
import { listenSchedules } from "../services/schedulesFirebase";
import { listenCustomers } from "../services/customersFirebase";
import { formatDate, formatIDR, compareDepartureDates } from "../utils/format";

export const PREORDER_PAGE_SIZE = 25;

export const UNSCHEDULED_SCHEDULE_ID = "__unscheduled__";

export interface ScheduleGroupItem {
  schedule: DepartureSchedule;
  preOrders: PreOrder[];
  /** Semua PO (Pending + Selesai) untuk menghitung kapasitas aktual. */
  allPreOrders: PreOrder[];
  label: string;
  date?: string;
  jastiper?: string;
}

export interface JastiperGroup {
  id: string;
  namaJastiper: string;
  totalKg: number;
  totalPOs: number;
  pendingPOs: number;
  schedules: ScheduleGroupItem[];
}

export function createUnscheduledSchedule(orphans: PreOrder[]): DepartureSchedule {
  const totalKg = orphans.reduce((sum, p) => sum + (p.totalKg || 0), 0);
  return {
    id: UNSCHEDULED_SCHEDULE_ID,
    idJastiper: "",
    namaJastiper: "Belum Ditetapkan",
    rute: "Lainnya / Tanpa Jadwal",
    tanggalBerangkat: "",
    tanggalLastDrop: "",
    slotBeratKg: totalKg,
    beratTerpakai: totalKg,
    status: "Open",
    catatan: "Pre-order yang belum dialokasikan ke jadwal keberangkatan handcarry",
  };
}

export function usePreOrders(showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void) {
  const [pagePreOrders, setPagePreOrders] = useState<PreOrder[]>([]);
  const [searchResults, setSearchResults] = useState<PreOrder[] | null>(null);
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageHasMore, setPageHasMore] = useState(false);
  const [totalCounts, setTotalCounts] = useState({ pending: 0, selesai: 0 });
  const [visibleSearchCount, setVisibleSearchCount] = useState(PREORDER_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PreOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<PreOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const cursorRef = useRef<PreOrdersPageCursor | undefined>(undefined);
  const requestKeyRef = useRef(0);
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(q.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    getPreOrderCounts().then((counts) => {
      if (!cancelled) setTotalCounts(counts);
    }).catch((err: unknown) => {
      console.error("load booking counts error:", err);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = ++requestKeyRef.current;
    cursorRef.current = undefined;
    setPagePreOrders([]);
    setSearchResults(null);
    setPageHasMore(false);
    setLoadingMore(false);
    setVisibleSearchCount(PREORDER_PAGE_SIZE);
    setLoading(true);

    const load = async () => {
      try {
        if (searchTerm) {
          // Firestore has no arbitrary substring query. Scan the active status
          // scope only after debounce, then keep the rendered list page-sized.
          const rows = await fetchPreOrders(statusFilter);
          const normalized = searchTerm.toLocaleLowerCase();
          const matches = rows.filter((po) =>
            (po.namaPelanggan || "").toLocaleLowerCase().includes(normalized)
            || (po.rute || "").toLocaleLowerCase().includes(normalized)
            || (po.namaJastiper || "").toLocaleLowerCase().includes(normalized)
            || (po.items || []).some((item) => (item.namaBarang || "").toLocaleLowerCase().includes(normalized)),
          );
          if (!cancelled && requestKeyRef.current === requestKey) {
            setSearchResults(matches);
            setPagePreOrders(matches.slice(0, PREORDER_PAGE_SIZE));
            setPageHasMore(matches.length > PREORDER_PAGE_SIZE);
            setLoading(false);
          }
          return;
        }

        const page = await getPreOrdersPage(statusFilter, PREORDER_PAGE_SIZE);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setPagePreOrders(page.rows);
          cursorRef.current = page.cursor;
          setPageHasMore(page.hasMore);
          setLoading(false);
        }
      } catch (err) {
        console.error("load booking page error:", err);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setPagePreOrders([]);
          setSearchResults(null);
          setPageHasMore(false);
          setLoading(false);
          toastRef.current?.("Booking gagal dimuat. Periksa koneksi lalu coba lagi.", "error");
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [searchTerm, statusFilter, refreshKey]);

  // 2. Listen to schedules and customers needed by the grouped list and forms.
  useEffect(() => {
    const unsubS = listenSchedules((rows) => {
      const sorted = [...rows].sort((a, b) =>
        compareDepartureDates(a.tanggalBerangkat, b.tanggalBerangkat)
      );
      setSchedules(sorted);
    });
    const unsubC = listenCustomers((rows) => setCustomers(rows));
    return () => {
      unsubS();
      unsubC();
    };
  }, []);

  const preOrders = useMemo(() => searchResults ?? pagePreOrders, [searchResults, pagePreOrders]);
  const visiblePreOrders = useMemo(() => searchResults
    ? searchResults.slice(0, visibleSearchCount)
    : pagePreOrders,
    [searchResults, visibleSearchCount, pagePreOrders]);
  const filtered = visiblePreOrders;

  const groupedBySchedule = useMemo(() => {
    const list: {
      schedule?: DepartureSchedule;
      preOrders: PreOrder[];
      allPreOrders: PreOrder[];
      label: string;
      date?: string;
      jastiper?: string;
    }[] = [];

    // Group by known schedules
    schedules.forEach((sch) => {
      if (statusFilter === "Pending" && sch.status === "Closed") return;

      const matchPO = filtered.filter((p) => p.idJadwal === sch.id);
      const allPOsForCapacity = preOrders.filter((p) => p.idJadwal === sch.id);
      if (matchPO.length > 0) {
        list.push({
          schedule: sch,
          preOrders: matchPO,
          allPreOrders: allPOsForCapacity,
          label: `${sch.rute} (${sch.status})`,
          date: sch.tanggalBerangkat,
          jastiper: sch.namaJastiper,
        });
      }
    });

    // Selesai tab: terbaru dulu (descending); Pending/All: terdekat dulu (ascending)
    list.sort((a, b) => {
      const cmp = compareDepartureDates(a.date, b.date);
      return statusFilter === "Selesai" ? -cmp : cmp;
    });

    // Check if there are pre-orders with schedules not in the list (or empty idJadwal)
    const orphans = filtered.filter((p) => !schedules.some((s) => s.id === p.idJadwal));
    if (orphans.length > 0) {
      list.push({
        schedule: createUnscheduledSchedule(orphans),
        preOrders: orphans,
        allPreOrders: orphans,
        label: "Lainnya / Tanpa Jadwal",
      });
    }

    return list;
  }, [schedules, filtered, q, statusFilter]);

  const groupedByJastiper = useMemo(() => {
    const jastiperMap = new Map<string, JastiperGroup>();

    // 1. Group active schedules by Jastiper
    schedules.forEach((sch) => {
      if (statusFilter === "Pending" && sch.status === "Closed") return;

      const matchPO = filtered.filter((p) => p.idJadwal === sch.id);
      // Semua PO (Pending + Selesai) untuk hitung kapasitas aktual
      const allPOsForCapacity = preOrders.filter((p) => p.idJadwal === sch.id);
      if (matchPO.length > 0) {
        const jastiperName = sch.namaJastiper?.trim() || "Jastiper Tanpa Nama";
        const jastiperId = sch.idJastiper?.trim() || jastiperName;

        if (!jastiperMap.has(jastiperId)) {
          jastiperMap.set(jastiperId, {
            id: jastiperId,
            namaJastiper: jastiperName,
            totalKg: 0,
            totalPOs: 0,
            pendingPOs: 0,
            schedules: [],
          });
        }

        const group = jastiperMap.get(jastiperId)!;
        const totalKgSch = matchPO.reduce((sum, p) => sum + (p.totalKg || 0), 0);
        const pendingCount = matchPO.filter((p) => p.status === "Pending").length;

        group.totalKg += totalKgSch;
        group.totalPOs += matchPO.length;
        group.pendingPOs += pendingCount;

        group.schedules.push({
          schedule: sch,
          preOrders: matchPO,
          allPreOrders: allPOsForCapacity,
          label: `${sch.rute} (${sch.status})`,
          date: sch.tanggalBerangkat,
          jastiper: sch.namaJastiper,
        });
      }
    });

    // Sort schedules inside each jastiper group by date ascending (nearest departure date first)
    const result: JastiperGroup[] = Array.from(jastiperMap.values()).map((g) => ({
      ...g,
      schedules: g.schedules.sort((a, b) => {
        const cmp = compareDepartureDates(a.date, b.date);
        return statusFilter === "Selesai" ? -cmp : cmp;
      }),
    }));

    // Sort Jastiper groups so that the Jastiper with the nearest departure date comes first
    result.sort((a, b) => {
      const earliestA = a.schedules[0]?.date;
      const earliestB = b.schedules[0]?.date;
      const cmp = compareDepartureDates(earliestA, earliestB);
      const directedCmp = statusFilter === "Selesai" ? -cmp : cmp;
      if (directedCmp !== 0) return directedCmp;
      return a.namaJastiper.localeCompare(b.namaJastiper);
    });

    // 2. Check if there are orphans
    const orphans = filtered.filter((p) => !schedules.some((s) => s.id === p.idJadwal));
    if (orphans.length > 0) {
      const totalKgOrphans = orphans.reduce((sum, p) => sum + (p.totalKg || 0), 0);
      const pendingOrphans = orphans.filter((p) => p.status === "Pending").length;

      result.push({
        id: UNSCHEDULED_SCHEDULE_ID,
        namaJastiper: "Lainnya / Tanpa Jadwal",
        totalKg: totalKgOrphans,
        totalPOs: orphans.length,
        pendingPOs: pendingOrphans,
        schedules: [
          {
            schedule: createUnscheduledSchedule(orphans),
            preOrders: orphans,
            allPreOrders: orphans,
            label: "Lainnya / Tanpa Jadwal",
            date: "",
            jastiper: "Belum Ditetapkan",
          },
        ],
      });
    }

    return result;
  }, [schedules, filtered, q, statusFilter]);

  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast?.(message, type);
  };

  const refreshBookings = () => {
    cursorRef.current = undefined;
    setRefreshKey((value) => value + 1);
  };

  async function handleSubmit(data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updatePreOrder(editing.id, data);
      toast("Booking berhasil diperbarui");
    } else {
      await addPreOrder(data);
      toast("Booking berhasil dibuat");
    }
    refreshBookings();
  }

  function handleDelete(po: PreOrder) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Booking",
      message: `Yakin ingin menghapus pre order "${po.namaPelanggan}"? Berat ${po.totalKg} Kg akan dikembalikan ke jadwal.`,
      onConfirm: async () => {
        try {
          await deletePreOrder(po.id);
          toast("Booking berhasil dihapus");
          refreshBookings();
        } catch {
          toast("Gagal menghapus pre order", "error");
        }
      },
    });
  }

  async function handleToggleItemCheck(po: PreOrder, itemIdx: number) {
    try {
      const updatedItems = po.items.map((item, idx) =>
        idx === itemIdx ? { ...item, checked: !item.checked } : item
      );
      await updatePreOrder(po.id, { items: updatedItems });
      toast("Status check barang berhasil diubah");
      refreshBookings();
    } catch (err: any) {
      toast(err.message || "Gagal mengubah status barang", "error");
    }
  }

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleShareMultipleWhatsApp = () => {
    const selectedPOs = preOrders.filter((po) => selectedIds.includes(po.id));
    if (selectedPOs.length === 0) return;

    const groups: Record<
      string,
      {
        jastiper: string;
        rute: string;
        lastDrop: string;
        departure: string;
        feeJastiper: string;
        pos: PreOrder[];
      }
    > = {};

    selectedPOs.forEach((po) => {
      const schId = po.idJadwal || "no-schedule";
      if (!groups[schId]) {
        const sch = schedules.find((s) => s.id === po.idJadwal);
        groups[schId] = {
          jastiper: po.namaJastiper || sch?.namaJastiper || "-",
          rute: po.rute || sch?.rute || "-",
          lastDrop: sch?.tanggalLastDrop ? formatDate(sch.tanggalLastDrop) : "-",
          departure: po.tanggalBerangkat ? formatDate(po.tanggalBerangkat) : "-",
          feeJastiper: sch?.hargaFeeJastiper ? formatIDR(sch.hargaFeeJastiper) : "Rp 0",
          pos: [],
        };
      }
      groups[schId].pos.push(po);
    });

    const formattedGroups = Object.values(groups).map((g) => {
      const header = `*Jastiper:* ${g.jastiper}
*Rute:* ${g.rute}
*Last Drop:* ${g.lastDrop}
*Keberangkatan:* ${g.departure}
*Fee Jastip:* ${g.feeJastiper} / Kg`;

      const poDetails = g.pos
        .map((po, idx) => `${idx + 1}. ${po.namaPelanggan} (${po.totalKg.toFixed(1)} Kg)`)
        .join("\n");

      return `${header}\n\n*Konsumen:*\n${poDetails}`;
    });

    const message = formattedGroups.join("\n\n-----------------------------\n\n");
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const counts = totalCounts;
  const hasMore = searchResults ? visibleSearchCount < searchResults.length : pageHasMore;
  const resultCount = searchResults?.length ?? (statusFilter === "Pending"
    ? totalCounts.pending
    : statusFilter === "Selesai"
      ? totalCounts.selesai
      : totalCounts.pending + totalCounts.selesai);
  const loadedCount = filtered.length;

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    if (searchResults) {
      setVisibleSearchCount((count) => count + PREORDER_PAGE_SIZE);
      return;
    }
    if (!cursorRef.current) return;

    const requestKey = requestKeyRef.current;
    setLoadingMore(true);
    try {
      const page = await getPreOrdersPage(statusFilter, PREORDER_PAGE_SIZE, cursorRef.current);
      if (requestKey !== requestKeyRef.current) return;
      setPagePreOrders((current) => [...current, ...page.rows]);
      cursorRef.current = page.cursor;
      setPageHasMore(page.hasMore);
    } catch (err) {
      console.error("load more bookings error:", err);
      toast("Booking berikutnya gagal dimuat", "error");
    } finally {
      if (requestKey === requestKeyRef.current) setLoadingMore(false);
    }
  };

  return {
    preOrders,
    schedules,
    customers,
    loading,
    loadingMore,
    hasMore,
    resultCount,
    loadedCount,
    isSearching: Boolean(searchTerm),
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    convertTarget,
    setConvertTarget,
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    counts,
    groupedBySchedule,
    groupedByJastiper,
    loadMore,
    handleSubmit,
    handleDelete,
    handleToggleItemCheck,
    handleSelectToggle,
    handleShareMultipleWhatsApp,
  };
}
