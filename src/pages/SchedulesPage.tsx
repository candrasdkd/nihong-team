import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Search, CheckCircle2, Pencil, Trash2, Plane, User } from "lucide-react";
import { useSchedules } from "../hooks/useSchedules";
import { ScheduleToastContainer } from "../components/Schedule/ScheduleToastContainer";
import { ScheduleFormModal } from "../components/Schedule/ScheduleFormModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { FlagID, FlagJP } from "../components/ui/Flags";
import { formatIDR } from "../utils/format";
import { StatusBadge } from "../components/Schedule/StatusBadge";

const formatDate = (d: string) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

const TableSkeleton = () => (
  <>
    {[1, 2, 3].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-100">
        <td className="px-3 sm:px-4 py-3 text-center align-middle w-[40px]">
          <div className="h-4 bg-slate-200 rounded w-4 mx-auto" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[150px]">
          <div className="h-4 bg-slate-200 rounded w-20" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[150px]">
          <div className="h-4 bg-slate-150 rounded w-20" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[200px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
            <div className="h-4 bg-slate-200 rounded w-24" />
          </div>
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[150px]">
          <div className="h-4 bg-slate-150 rounded w-20" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[120px]">
          <div className="h-4 bg-slate-200 rounded w-16" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[120px]">
          <div className="h-4 bg-slate-200 rounded w-16" />
        </td>
        <td className="px-3 sm:px-4 py-3 align-middle w-[100px]">
          <div className="h-6 bg-slate-200 rounded-full w-14" />
        </td>
        <td className="px-3 sm:px-4 py-3 text-right align-middle w-[100px]">
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-slate-200" />
            <div className="w-8 h-8 rounded-xl bg-slate-200" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

export function SchedulesPage({ formTrigger = 0, onFormTriggerConsumed }: { formTrigger?: number; onFormTriggerConsumed?: () => void }) {
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

  React.useEffect(() => {
    if (formTrigger > 0) {
      setEditing(null);
      setShowForm(true);
      onFormTriggerConsumed?.();
    }
  }, [formTrigger, onFormTriggerConsumed]);

  return (
    <div className="min-h-screen bg-surface-base pb-28 font-sans text-slate-800">
      <AnimatePresence>
        <ScheduleToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="page-container space-y-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Jadwal Keberangkatan</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Kelola jadwal perjalanan jastiper dan kapasitas berat.</p>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block relative overflow-hidden rounded-card bg-brand-navy px-6 py-7 shadow-sm"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-orange/5 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs font-bold text-brand-orange mb-3">
                <Calendar size={12} />
                <span>Manajemen Jadwal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Jadwal Keberangkatan</h2>
              <p className="text-slate-300 mt-1.5 text-sm max-w-lg">
                Buat dan kelola jadwal perjalanan jastiper. Pantau kapasitas berat dan batas titip barang dari konsumen.
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
              Buat Jadwal
            </Button>
          </div>
        </motion.div>

        {/* Stats + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Card className="flex items-center gap-2 !p-3 !rounded-input">
            <Calendar size={16} className="text-brand-navy" />
            <span className="text-sm font-bold text-slate-700">{filtered.length} Total Jadwal</span>
          </Card>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-input px-4 py-2.5 shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{openCount} Open</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-0.5 bg-slate-100 border border-surface-border rounded-input p-0.5 ml-auto">
            {[
              { value: "", label: "Semua" },
              { value: "Open", label: "Open" },
              { value: "Closed", label: "Closed" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-input text-xs font-bold transition-all min-h-[36px] ${
                  statusFilter === s.value ? "bg-white text-brand-navy shadow-sm" : "text-slate-500 hover:text-slate-800"
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

        {/* Desktop Table & Mobile Cards */}
        {loading ? (
          <div className="bg-white shadow-xl shadow-slate-200/20 border border-slate-200/60 rounded-2xl overflow-hidden animate-pulse">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 select-none">
                  <tr className="text-slate-500 text-left">
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-center w-[40px]">No</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Tanggal Berangkat</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Last Drop</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Jastiper</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Rute</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Kapasitas</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Fee Jastip</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <TableSkeleton />
                </tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
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
            <div className="bg-white shadow-xl shadow-slate-200/20 border border-slate-200/60 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 select-none">
                    <tr className="text-slate-500 text-left">
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-center w-[40px]">No</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Tanggal Berangkat</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Last Drop</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Jastiper</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Rute</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Kapasitas</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Fee Jastip</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleSchedules.map((sch, schIdx) => {
                      const percentage = Math.min(100, Math.round(((sch.beratTerpakai || 0) / (sch.slotBeratKg || 1)) * 100));
                      const progressBarColor = percentage >= 90
                        ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                        : percentage >= 75
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                          : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(59,130,246,0.2)]";
                      const isIDtoJP = sch.rute === "Indonesia → Jepang";

                      return (
                        <tr key={sch.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                          <td className="px-3 sm:px-4 py-3 text-center align-middle font-bold text-slate-400 w-[40px] select-none">
                            {schIdx + 1}
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="font-extrabold text-slate-800 text-xs">
                              {formatDate(sch.tanggalBerangkat)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="font-extrabold text-amber-700 text-xs bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 inline-block">
                              {formatDate(sch.tanggalLastDrop)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600 font-extrabold text-xs shadow-inner shrink-0">
                                {sch.namaJastiper ? sch.namaJastiper.charAt(0).toUpperCase() : <User size={12} />}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm leading-tight">{sch.namaJastiper}</div>
                                {sch.catatan && (
                                  <div className="text-[10px] text-slate-400 font-semibold italic mt-1 truncate max-w-[180px]" title={sch.catatan}>
                                    📝 {sch.catatan}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-xl shadow-xs shrink-0">
                                {isIDtoJP ? (
                                  <>
                                    <FlagID size="sm" />
                                    <Plane size={9} className="text-blue-500 shrink-0 animate-pulse" />
                                    <FlagJP size="sm" />
                                  </>
                                ) : (
                                  <>
                                    <FlagJP size="sm" />
                                    <Plane size={9} className="text-blue-500 shrink-0 rotate-180 animate-pulse" />
                                    <FlagID size="sm" />
                                  </>
                                )}
                              </div>
                              <span className="font-extrabold text-slate-700 text-xs tracking-tight">{sch.rute}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="space-y-1 max-w-[150px]">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span>{sch.beratTerpakai} / {sch.slotBeratKg} Kg</span>
                                <span className="text-slate-400 font-semibold">({percentage}%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100/50">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <div className="font-extrabold text-slate-800 text-xs">
                              {sch.hargaFeeJastiper ? formatIDR(sch.hargaFeeJastiper) : "Rp 0"}{" "}
                              <span className="text-slate-400 font-normal">/ Kg</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 align-middle">
                            <StatusBadge status={sch.status} />
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditing(sch);
                                  setShowForm(true);
                                }}
                                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all duration-200"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(sch)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-650 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200"
                                title="Hapus"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination / Load More */}
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

