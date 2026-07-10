import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Plus, Search, Users } from "lucide-react";
import { useJastipers } from "../hooks/useJastipers";
import { JastiperToastContainer } from "../components/Jastiper/JastiperToastContainer";
import { JastiperCard } from "../components/Jastiper/JastiperCard";
import { JastiperFormModal } from "../components/Jastiper/JastiperFormModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
    <div className="min-h-screen bg-surface-base pb-28 font-sans text-slate-800">
      <AnimatePresence>
        <JastiperToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="page-container space-y-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Daftar Jastiper</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola data jastiper, kontak, dan alamat.</p>
        </div>

        {/* Hero Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden sm:block relative overflow-hidden rounded-card bg-brand-navy px-6 py-7 shadow-sm"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-orange/5 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs font-bold text-brand-orange mb-3">
                <UserRound size={12} />
                <span>Manajemen Jastiper</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Daftar Jastiper</h2>
              <p className="text-slate-300 mt-2 text-sm max-w-lg leading-relaxed">
                Kelola data jastiper Anda — nama, kontak, dan alamat. Jastiper terdaftar bisa dipilih saat membuat Jadwal Keberangkatan.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              variant="primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jastiper
            </Button>
          </div>
        </motion.div>

        {/* Stats & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, nomor HP, atau alamat..."
              className="w-full pl-10 pr-4 py-2.5 rounded-input border border-surface-border bg-surface-card focus:ring-2 focus:ring-brand-navy/20 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm transition-all"
            />
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <Card className="flex items-center gap-2 !p-3 !rounded-input">
              <Users size={16} className="text-brand-navy" />
              <span className="text-sm font-bold text-slate-700">{filtered.length} Jastiper Terdaftar</span>
            </Card>
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
