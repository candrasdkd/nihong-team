import { useEffect, useMemo, useState } from "react";
import { Jastiper } from "../types";
import { listenJastipers, addJastiper, updateJastiper, deleteJastiper } from "../services/jastipersFirebase";

export type ToastMsg = { id: number; message: string; type: "success" | "error" };

export function useJastipers() {
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Jastiper | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
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

  function addToast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleSubmit(data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updateJastiper(editing.id, data);
      addToast("Jastiper berhasil diperbarui", "success");
    } else {
      await addJastiper(data);
      addToast("Jastiper berhasil ditambahkan", "success");
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
          addToast("Jastiper berhasil dihapus", "success");
        } catch {
          addToast("Gagal menghapus jastiper", "error");
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
    toasts,
    setToasts,
    confirmModal,
    setConfirmModal,
    filtered,
    addToast,
    handleSubmit,
    handleDelete,
  };
}
