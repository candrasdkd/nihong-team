import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PreOrder, DepartureSchedule, Customer } from "../types";
import { addPreOrder, updatePreOrder, deletePreOrder } from "../services/preOrdersFirebase";
import { listenSchedules } from "../services/schedulesFirebase";
import { listenCustomers } from "../services/customersFirebase";
import { formatDate, formatIDR } from "../utils/format";

const COL = "pre_orders";

export const UNSCHEDULED_SCHEDULE_ID = "__unscheduled__";

export interface ScheduleGroupItem {
  schedule: DepartureSchedule;
  preOrders: PreOrder[];
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
  const [pendingPreOrders, setPendingPreOrders] = useState<PreOrder[]>([]);
  const [selesaiPreOrders, setSelesaiPreOrders] = useState<PreOrder[]>([]);
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingSelesai, setLoadingSelesai] = useState(true);
  const [selesaiLimit, setSelesaiLimit] = useState(50);
  const [hasMoreSelesai, setHasMoreSelesai] = useState(true);
  const [totalSelesaiCount, setTotalSelesaiCount] = useState(0);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PreOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<PreOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // 1. Listen to all Pending pre-orders (always up-to-date)
  useEffect(() => {
    const qPending = query(
      collection(db, COL),
      where("status", "==", "Pending"),
      orderBy("createdAt", "desc")
    );
    const unsubPending = onSnapshot(qPending, (snap) => {
      const pendingRows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PreOrder[];
      setPendingPreOrders(pendingRows);
      setLoadingPending(false);
    });

    return () => unsubPending();
  }, []);

  // 2. Fetch Selesai pre-orders statically (avoiding dynamic listener assertion errors)
  useEffect(() => {
    let active = true;
    const fetchSelesai = async () => {
      setLoadingSelesai(true);
      try {
        const qSelesai = query(
          collection(db, COL),
          where("status", "==", "Selesai"),
          orderBy("createdAt", "desc"),
          limit(selesaiLimit)
        );
        const snap = await getDocs(qSelesai);
        if (!active) return;
        const selesaiRows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PreOrder[];
        setSelesaiPreOrders(selesaiRows);
        setHasMoreSelesai(selesaiRows.length === selesaiLimit);
      } catch (err) {
        console.error("Failed to fetch selesai pre-orders:", err);
      } finally {
        if (active) setLoadingSelesai(false);
      }
    };

    fetchSelesai();
    return () => {
      active = false;
    };
  }, [selesaiLimit, pendingPreOrders]);

  // 3. Get accurate server-side total count of Selesai pre-orders
  useEffect(() => {
    const fetchSelesaiCount = async () => {
      try {
        const qCount = query(collection(db, COL), where("status", "==", "Selesai"));
        const snapshot = await getCountFromServer(qCount);
        setTotalSelesaiCount(snapshot.data().count);
      } catch (err) {
        console.error("Failed to fetch selesai count:", err);
      }
    };
    fetchSelesaiCount();
  }, [pendingPreOrders, selesaiPreOrders]); // Refresh whenever pre-orders change

  // 4. Listen to other core collections
  useEffect(() => {
    const unsubS = listenSchedules((rows) => setSchedules(rows));
    const unsubC = listenCustomers((rows) => setCustomers(rows));
    return () => {
      unsubS();
      unsubC();
    };
  }, []);

  const preOrders = useMemo(() => {
    return [...pendingPreOrders, ...selesaiPreOrders];
  }, [pendingPreOrders, selesaiPreOrders]);

  const loading = loadingPending || (statusFilter !== "Pending" && loadingSelesai);

  const filtered = useMemo(() => {
    let list = preOrders;
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.namaPelanggan.toLowerCase().includes(s) ||
          p.rute.toLowerCase().includes(s) ||
          p.namaJastiper.toLowerCase().includes(s) ||
          p.items.some((i) => i.namaBarang.toLowerCase().includes(s))
      );
    }
    return list;
  }, [preOrders, q, statusFilter]);

  const groupedBySchedule = useMemo(() => {
    const list: {
      schedule?: DepartureSchedule;
      preOrders: PreOrder[];
      label: string;
      date?: string;
      jastiper?: string;
    }[] = [];

    // Group by known schedules
    schedules.forEach((sch) => {
      if (statusFilter === "Pending" && sch.status === "Closed") return;

      const matchPO = filtered.filter((p) => p.idJadwal === sch.id);
      if (matchPO.length > 0 || !q) {
        list.push({
          schedule: sch,
          preOrders: matchPO,
          label: `${sch.rute} (${sch.status})`,
          date: sch.tanggalBerangkat,
          jastiper: sch.namaJastiper,
        });
      }
    });

    // Check if there are pre-orders with schedules not in the list (or empty idJadwal)
    const orphans = filtered.filter((p) => !schedules.some((s) => s.id === p.idJadwal));
    if (orphans.length > 0) {
      list.push({
        schedule: createUnscheduledSchedule(orphans),
        preOrders: orphans,
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
      if (matchPO.length > 0 || !q) {
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
          label: `${sch.rute} (${sch.status})`,
          date: sch.tanggalBerangkat,
          jastiper: sch.namaJastiper,
        });
      }
    });

    // Sort schedules inside each jastiper group by date ascending
    const result: JastiperGroup[] = Array.from(jastiperMap.values()).map((g) => ({
      ...g,
      schedules: g.schedules.sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    }));

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

  async function handleSubmit(data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updatePreOrder(editing.id, data);
      toast("Booking berhasil diperbarui");
    } else {
      await addPreOrder(data);
      toast("Booking berhasil dibuat");
    }
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

  const counts = {
    pending: pendingPreOrders.length,
    selesai: totalSelesaiCount,
  };

  const loadMoreSelesai = () => {
    if (hasMoreSelesai) {
      setSelesaiLimit((prev) => prev + 50);
    }
  };

  return {
    preOrders,
    schedules,
    customers,
    loading,
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
    hasMoreSelesai,
    loadMoreSelesai,
    handleSubmit,
    handleDelete,
    handleToggleItemCheck,
    handleSelectToggle,
    handleShareMultipleWhatsApp,
  };
}
