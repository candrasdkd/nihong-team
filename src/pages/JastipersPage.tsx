import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRound, Plus, Pencil, Trash2, Search, Phone, MapPin,
  Users, X, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Jastiper } from "../types";
import { listenJastipers, addJastiper, updateJastiper, deleteJastiper } from "../services/jastipersFirebase";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-lg font-extrabold shrink-0 shadow-sm border border-white/20`}>
      {initial}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastMsg = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
            t.type === "error"
              ? "bg-white border-red-200 text-red-700"
              : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="ml-2 p-0.5 rounded-full hover:bg-black/10"><X size={14} /></button>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function JastiperFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Jastiper | null;
  onClose: () => void;
  onSubmit: (data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [nama, setNama] = useState(initial?.nama || "");
  const [noTelpon, setNoTelpon] = useState(initial?.noTelpon || "");
  const [alamat, setAlamat] = useState(initial?.alamat || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) { setError("Nama Jastiper wajib diisi."); return; }
    setLoading(true);
    try {
      await onSubmit({ nama: nama.trim(), noTelpon: noTelpon.trim(), alamat: alamat.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border-t-4 border-t-violet-500 z-10"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <UserRound size={18} className="text-violet-600" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {initial ? "Edit Jastiper" : "Tambah Jastiper Baru"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Jastiper *</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                placeholder="Contoh: BUDI SANTOSO"
                style={{ textTransform: "uppercase" }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">No. Telpon / WhatsApp</label>
              <input
                value={noTelpon}
                onChange={(e) => setNoTelpon(e.target.value)}
                placeholder="08xxxxxxxxxx"
                type="tel"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alamat</label>
              <textarea
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat lengkap Jastiper..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
              <Button
                type="submit"
                isLoading={loading}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-md shadow-violet-600/20"
              >
                {initial ? "Simpan Perubahan" : "Tambah Jastiper"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function JastipersPage() {
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Jastiper | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

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
        j.alamat?.toLowerCase().includes(s),
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

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <ToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d1b69] via-[#3b2784] to-[#1e1152] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-400/15 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-purple-400/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-violet-500/20 border border-violet-400/30 px-3 py-1 rounded-full text-xs font-bold text-violet-300 mb-3">
                <UserRound size={12} />
                <span>Manajemen Jastiper</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Daftar Jastiper 🧳
              </h2>
              <p className="text-slate-400 mt-1.5 text-sm max-w-lg">
                Kelola data jastiper Anda — nama, kontak, dan alamat. Jastiper terdaftar bisa dipilih saat membuat Jadwal Keberangkatan.
              </p>
            </div>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 font-bold px-5 py-2.5 rounded-xl border border-violet-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Tambah Jastiper
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, nomor HP, atau alamat..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm transition-all"
          />
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
            <Users size={16} className="text-violet-500" />
            <span className="text-sm font-bold text-slate-700">{jastipers.length} Jastiper Terdaftar</span>
          </div>
        </div>

        {/* Grid Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-28 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-5 shadow-inner">
              <UserRound size={32} className="text-violet-300" />
            </div>
            <h3 className="font-extrabold text-slate-700 text-lg mb-1">
              {q ? "Jastiper Tidak Ditemukan" : "Belum Ada Jastiper"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              {q ? "Coba ubah kata kunci pencarian Anda." : "Tambahkan jastiper pertama Anda menggunakan tombol di atas."}
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filtered.map((j, idx) => (
                <motion.div
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm hover:shadow-md hover:border-violet-200/60 transition-all duration-300 group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={j.nama} />
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-800 text-sm truncate tracking-tight">{j.nama}</h3>
                        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Jastiper</span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditing(j); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(j)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    {j.noTelpon ? (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={13} className="text-emerald-500 shrink-0" />
                        <a
                          href={`https://wa.me/${j.noTelpon.replace(/\D/g, "").replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-emerald-600 hover:underline transition-colors"
                        >
                          {j.noTelpon}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Phone size={13} className="shrink-0" />
                        <span className="italic">Tidak ada nomor HP</span>
                      </div>
                    )}

                    {j.alamat ? (
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
                        <span className="font-semibold line-clamp-2 leading-relaxed">{j.alamat}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <MapPin size={13} className="shrink-0" />
                        <span className="italic">Alamat belum diisi</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Modals */}
      {showForm && (
        <JastiperFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText="Hapus"
            type="danger"
            onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
