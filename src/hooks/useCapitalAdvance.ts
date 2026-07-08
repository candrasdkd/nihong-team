import { useEffect, useState } from "react";
import {
  subscribeCapitalAdvances,
  returnCapitalAdvance,
  type CapitalAdvance,
} from "../services/capitalAdvanceFirebase";
import { formatIDR } from "../utils/format";

export function useCapitalAdvance() {
  const [pending, setPending] = useState<CapitalAdvance[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCapitalAdvances("belum_kembali", (rows) => {
      const sortedRows = [...rows].sort((a, b) => {
        const dateCompare = b.tanggalKeluar.localeCompare(a.tanggalKeluar);
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
      setPending(sortedRows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function handleMarkReturned(adv: CapitalAdvance) {
    setConfirmModal({
      isOpen: true,
      title: "Tandai Modal Kembali",
      message: `Modal sebesar ${formatIDR(adv.jumlah)} akan dicatat sebagai pemasukan kas. Lanjutkan?`,
      confirmText: "Ya, Modal Sudah Kembali",
      type: "info",
      onConfirm: async () => {
        try {
          await returnCapitalAdvance(adv.id);
        } catch (error) {
          console.error("Gagal mengembalikan modal:", error);
          alert("Terjadi kesalahan saat mengembalikan modal.");
        }
      },
    });
  }

  return {
    pending,
    loading,
    confirmModal,
    setConfirmModal,
    handleMarkReturned,
  };
}
