import { useEffect, useMemo, useState } from "react";
import { Jastiper } from "../types";
import { listenJastipers, addJastiper, updateJastiper, deleteJastiper } from "../services/jastipersFirebase";

export function useJastipers(showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void) {
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Jastiper | null>(null);
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

  useEffect(() => {
    const unsub = listenJastipers((rows) => {
      setJastipers(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return jastipers;
    return jastipers.filter(
      (j) =>
        j.nama.toLowerCase().includes(s) ||
        j.noTelpon?.toLowerCase().includes(s) ||
        j.alamat?.toLowerCase().includes(s)
    );
  }, [jastipers, q]);

  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast?.(message, type);
  };

  async function handleSubmit(data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updateJastiper(editing.id, data);
      toast("Jastiper berhasil diperbarui");
    } else {
      await addJastiper(data);
      toast("Jastiper berhasil ditambahkan");
    }
  }

  function handleDelete(j: Jastiper) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Jastiper",
      message: `Yakin ingin menghapus "${j.nama}" dari daftar jastiper?`,
      onConfirm: async () => {
        try {
          await deleteJastiper(j.id);
          toast("Jastiper berhasil dihapus");
        } catch {
          toast("Gagal menghapus jastiper", "error");
        }
      },
    });
  }

  return {
    jastipers,
    loading,
    q,
    setQ,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    filtered,
    handleSubmit,
    handleDelete,
  };
}
