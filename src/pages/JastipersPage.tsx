import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Plus, Search, Users } from "lucide-react";
import { useJastipers } from "../hooks/useJastipers";
import { JastiperToastContainer } from "../components/Jastiper/JastiperToastContainer";
import { JastiperCard } from "../components/Jastiper/JastiperCard";
import { JastiperFormModal } from "../components/Jastiper/JastiperFormModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { FAB_COLOR_CLASS } from "../utils/constants";

export function JastipersPage() {
  const {
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
    handleSubmit,
    handleDelete,
  } = useJastipers();

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <JastiperToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftar Jastiper 🧳</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola data jastiper, kontak, dan alamat.</p>
        </div>

        {/* Hero Header Banner (Premium Redesign) */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d1b69] via-[#3b2784] to-[#1e1152] px-6 py-8 shadow-xl border border-white/5"
        >
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-purple-500/15 blur-3xl" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-violet-500/20 border border-violet-400/30 px-3 py-1 rounded-full text-xs font-bold text-violet-300 mb-3 shadow-inner">
                <UserRound size={12} className="stroke-[2.5]" />
                <span>Manajemen Jastiper</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Daftar Jastiper 🧳</h2>
              <p className="text-slate-400 mt-2 text-sm max-w-lg leading-relaxed">
                Kelola data jastiper Anda — nama, kontak, dan alamat. Jastiper terdaftar bisa dipilih saat membuat Jadwal Keberangkatan.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 font-bold px-5 py-2.5 rounded-xl border border-violet-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto transition-all"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Tambah Jastiper
            </Button>
          </div>
        </motion.div>

        {/* Stats & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, nomor HP, atau alamat..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm transition-all"
            />
          </div>

          {/* Stats Bar */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
              <Users size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-slate-700">{filtered.length} Jastiper Terdaftar</span>
            </div>
          </div>
        </div>

        {/* Grid Cards Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-28" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </div>
                </div>
                <div className="h-px bg-slate-100/80 my-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
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
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((j, idx) => (
                <JastiperCard
                  key={j.id}
                  jastiper={j}
                  idx={idx}
                  onEdit={() => {
                    setEditing(j);
                    setShowForm(true);
                  }}
                  onDelete={() => handleDelete(j)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Modals */}
      {showForm && (
        <JastiperFormModal
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
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
