import { useCallback, useEffect, useState } from "react";
import { DepartureSchedule, PreOrder, Customer } from "../types";
import { listenPreOrdersBySchedule, updatePreOrder, deletePreOrder } from "../services/preOrdersFirebase";
import { formatDate, formatIDR } from "../utils/format";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EditingCell {
  poId: string;
  field: "namaPelanggan" | "noTelponPelanggan" | "totalKg" | "catatan" | "pic";
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function usePreOrderDetail(
  schedule: DepartureSchedule,
  schedules: DepartureSchedule[],
  allPreOrders: PreOrder[],
  setShowForm: (v: boolean) => void,
  setEditing: (v: PreOrder | null) => void,
  setConvertTarget: (v: PreOrder | null) => void,
  handleSubmit: (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => Promise<void>,
  showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [pos, setPOs] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [viewItemsPO, setViewItemsPO] = useState<PreOrder | null>(null);

  // ─── Live listener ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const unsub = listenPreOrdersBySchedule(schedule.id, (rows) => {
      setPOs(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [schedule.id]);

  // ─── Toast helper ─────────────────────────────────────────────────────────
  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast?.(message, type);
  };

  // ─── Inline Cell Save ─────────────────────────────────────────────────────
  const handleCellSave = useCallback(
    async (poId: string, field: EditingCell["field"], rawVal: string) => {
      setEditingCell(null);
      const po = pos.find((p) => p.id === poId);
      if (!po) return;

      let newVal: string | number = rawVal;
      if (field === "totalKg") {
        newVal = parseFloat(rawVal) || 0;
        if (newVal === po.totalKg) return;
      } else {
        if (rawVal === (po[field] ?? "")) return;
      }

      setSavingCell(poId + field);
      try {
        await updatePreOrder(poId, { [field]: newVal });
        toast("Berhasil diperbarui");
      } catch (err: any) {
        toast(err.message || "Gagal menyimpan", "error");
      } finally {
        setSavingCell(null);
      }
    },
    [pos]
  );

  // ─── Toggle item check ────────────────────────────────────────────────────
  async function handleToggleItemCheck(po: PreOrder, itemIdx: number) {
    const updatedItems = po.items.map((item, idx) =>
      idx === itemIdx ? { ...item, checked: !item.checked } : item
    );
    await updatePreOrder(po.id, { items: updatedItems });
    setViewItemsPO((prev) => {
      if (!prev || prev.id !== po.id) return prev;
      const updated = [...prev.items];
      updated[itemIdx] = { ...updated[itemIdx], checked: !updated[itemIdx].checked };
      return { ...prev, items: updated };
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
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

  // ─── WhatsApp (single) ────────────────────────────────────────────────────
  function shareWA(po: PreOrder) {
    const sch = schedules.find((s) => s.id === po.idJadwal);
    const lastDropDate = sch?.tanggalLastDrop ? formatDate(sch.tanggalLastDrop) : "-";
    const feeJastiper = sch?.hargaFeeJastiper ? formatIDR(sch.hargaFeeJastiper) : "Rp 0";
    const itemsText = po.items
      .map((item) => `${item.checked ? "✅" : "⬜"} ${item.namaBarang}`)
      .join("\n");
    const msg =
      `*Jastiper:* ${po.namaJastiper || "-"}\n` +
      `*Rute:* ${po.rute || "-"}\n` +
      `*Last Drop:* ${lastDropDate}\n` +
      `*Keberangkatan:* ${formatDate(po.tanggalBerangkat)}\n` +
      `*Fee Jastip:* ${feeJastiper} / Kg\n` +
      `*Konsumen:* ${po.namaPelanggan}\n` +
      `*Total Berat:* ${po.totalKg.toFixed(1)} Kg\n\n` +
      `*Daftar Barang:*\n${itemsText}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ─── WhatsApp (bulk) ──────────────────────────────────────────────────────
  function shareMultipleWA() {
    const selected = pos.filter((p) => selectedIds.includes(p.id));
    if (!selected.length) return;
    const feeJastiper = schedule.hargaFeeJastiper
      ? formatIDR(schedule.hargaFeeJastiper)
      : "Rp 0";
    const header =
      `*Jastiper:* ${schedule.namaJastiper}\n` +
      `*Rute:* ${schedule.rute}\n` +
      `*Last Drop:* ${formatDate(schedule.tanggalLastDrop)}\n` +
      `*Keberangkatan:* ${formatDate(schedule.tanggalBerangkat)}\n` +
      `*Fee Jastip:* ${feeJastiper} / Kg`;
    const poDetails = selected
      .map((po, i) => `${i + 1}. ${po.namaPelanggan} (${po.totalKg.toFixed(1)} Kg)`)
      .join("\n");
    const msg = `${header}\n\n*Konsumen:*\n${poDetails}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ─── Select toggle ────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ─── Customer change (dropdown) ───────────────────────────────────────────
  const handleCustomerChange = useCallback(
    async (poId: string, customer: Customer) => {
      const po = pos.find((p) => p.id === poId);
      if (!po) return;
      // Skip jika tidak ada perubahan
      if (po.idPelanggan === customer.id) return;
      setSavingCell(poId + "namaPelanggan");
      try {
        await updatePreOrder(poId, {
          idPelanggan: customer.id || "",
          namaPelanggan: customer.nama || "",
          noTelponPelanggan: customer.telpon || "",
        });
        toast(`Pelanggan diubah ke ${customer.nama}`);
      } catch (err: any) {
        toast(err.message || "Gagal menyimpan", "error");
      } finally {
        setSavingCell(null);
      }
    },
    [pos]
  );

  // ─── Derived ─────────────────────────────────────────────────────────────
  const totalBeratPOs = pos.reduce((s, p) => s + (p.totalKg || 0), 0);

  return {
    // state
    pos,
    loading,
    editingCell,
    setEditingCell,
    savingCell,
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    viewItemsPO,
    setViewItemsPO,
    // actions
    handleCellSave,
    handleCustomerChange,
    handleToggleItemCheck,
    handleDelete,
    shareWA,
    shareMultipleWA,
    toggleSelect,
    // derived
    totalBeratPOs,
  };
}
