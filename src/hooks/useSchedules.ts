import { useEffect, useMemo, useState } from "react";
import { DepartureSchedule, Jastiper } from "../types";
import { listenSchedules, addSchedule, updateSchedule, deleteSchedule } from "../services/schedulesFirebase";
import { listenJastipers } from "../services/jastipersFirebase";

export function useSchedules(showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void) {
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Open");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DepartureSchedule | null>(null);
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
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const unsubS = listenSchedules((rows) => {
      setSchedules(rows);
      setLoading(false);

      // Auto-close schedules whose departure date has already passed
      const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      rows.forEach((sch) => {
        if (sch.status === "Open" && sch.tanggalBerangkat < todayStr) {
          updateSchedule(sch.id, { status: "Closed" }).catch(() => {});
        }
      });
    });
    const unsubJ = listenJastipers((rows) => setJastipers(rows));
    return () => {
      unsubS();
      unsubJ();
    };
  }, []);

  const filtered = useMemo(() => {
    let list = schedules;
    if (statusFilter) list = list.filter((s) => s.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (sch) =>
          sch.rute.toLowerCase().includes(s) ||
          sch.namaJastiper.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) =>
      a.tanggalBerangkat.localeCompare(b.tanggalBerangkat),
    );
  }, [schedules, statusFilter, q]);

  // Reset pagination whenever search query or status filter changes
  useEffect(() => {
    setVisibleCount(10);
  }, [q, statusFilter]);

  const visibleSchedules = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast?.(message, type);
  };

  async function handleSubmit(data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">) {
    if (editing) {
      await updateSchedule(editing.id, data);
      toast("Jadwal berhasil diperbarui");
    } else {
      await addSchedule(data);
      toast("Jadwal keberangkatan berhasil dibuat");
    }
  }

  function handleDelete(s: DepartureSchedule) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Jadwal",
      message: `Yakin ingin menghapus jadwal "${s.rute}" tanggal ${s.tanggalBerangkat}?`,
      onConfirm: async () => {
        try {
          await deleteSchedule(s.id);
          toast("Jadwal berhasil dihapus");
        } catch {
          toast("Gagal menghapus jadwal", "error");
        }
      },
    });
  }

  const openCount = schedules.filter((s) => s.status === "Open").length;

  return {
    schedules,
    jastipers,
    loading,
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    visibleCount,
    setVisibleCount,
    filtered,
    visibleSchedules,
    openCount,
    handleSubmit,
    handleDelete,
  };
}
