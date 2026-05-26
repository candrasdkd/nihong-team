import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Search, CheckCircle2 } from "lucide-react";
import { useSchedules } from "../hooks/useSchedules";
import { ScheduleToastContainer } from "../components/Schedule/ScheduleToastContainer";
import { ScheduleCard } from "../components/Schedule/ScheduleCard";
import { ScheduleFormModal } from "../components/Schedule/ScheduleFormModal";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";

export function SchedulesPage() {
  const {
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
    toasts,
    setToasts,
    confirmModal,
    setConfirmModal,
    visibleCount,
    setVisibleCount,
    filtered,
    visibleSchedules,
    openCount,
    handleSubmit,
    handleDelete,
  } = useSchedules();

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <ScheduleToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Jadwal Keberangkatan ✈️</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola jadwal perjalanan jastiper dan kapasitas berat.</p>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2a4a] via-[#1a3f6f] to-[#0c2a4a] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-sky-400/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold text-blue-300 mb-3">
                <Calendar size={12} />
                <span>Manajemen Jadwal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Jadwal Keberangkatan ✈️</h2>
              <p className="text-slate-400 mt-1.5 text-sm max-w-lg">
                Buat dan kelola jadwal perjalanan jastiper. Pantau kapasitas berat dan batas titip barang dari konsumen.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 font-bold px-5 py-2.5 rounded-xl border border-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Buat Jadwal
            </Button>
          </div>
        </motion.div>

        {/* Stats + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-700">{filtered.length} Total Jadwal</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{openCount} Open</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl p-1 ml-auto">
            {[
              { value: "", label: "Semua" },
              { value: "Open", label: "Open" },
              { value: "Closed", label: "Closed" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s.value ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari rute atau nama jastiper..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm transition-all"
          />
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-2 bg-slate-200 rounded-full w-full mt-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 shadow-inner">
              <Calendar size={32} className="text-blue-300" />
            </div>
            <h3 className="font-extrabold text-slate-700 text-lg mb-1">
              {q || statusFilter ? "Jadwal Tidak Ditemukan" : "Belum Ada Jadwal"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              {q || statusFilter ? "Coba ubah filter atau kata kunci." : "Buat jadwal keberangkatan pertama Anda."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {visibleSchedules.map((sch) => (
                  <ScheduleCard
                    key={sch.id}
                    schedule={sch}
                    onEdit={() => {
                      setEditing(sch);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDelete(sch)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {filtered.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3">
                <p className="text-xs text-slate-500 font-bold">
                  Menampilkan <span className="text-slate-800">{Math.min(visibleCount, filtered.length)}</span> dari{" "}
                  <span className="text-slate-800">{filtered.length}</span> jadwal keberangkatan
                </p>
                <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(Math.min(visibleCount, filtered.length) / filtered.length) * 100}%` }}
                  />
                </div>
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  variant="outline"
                  className="px-6 py-2 rounded-xl text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-800 shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  Muat Lebih Banyak ▾
                </Button>
              </div>
            )}
          </div>
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

      {showForm && (
        <ScheduleFormModal
          initial={editing}
          jastipers={jastipers}
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
