import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Search, Plane, Package, Weight, CalendarDays, User, ChevronRight,
} from "lucide-react";
import { usePreOrders } from "../hooks/usePreOrders";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { PreOrderToastContainer } from "../components/PreOrder/PreOrderToastContainer";
import { Button } from "../components/ui/Button";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { formatDate } from "../utils/format";
import { DepartureSchedule, PreOrder } from "../types";
import { PreOrderDetailPage } from "./PreOrderDetailPage";

export function PreOrdersPage({ formTrigger = 0, onFormTriggerConsumed }: { formTrigger?: number; onFormTriggerConsumed?: () => void }) {
  const {
    preOrders,
    schedules,
    customers,
    loading,
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    convertTarget,
    setConvertTarget,
    toasts,
    setToasts,
    counts,
    groupedBySchedule,
    hasMoreSelesai,
    loadMoreSelesai,
    handleSubmit,
    handleDelete,
    handleToggleItemCheck,
  } = usePreOrders();

  const STATUS_FILTERS = ["", "Pending", "Selesai"];
  const totalPO = (counts.pending || 0) + (counts.selesai || 0);

  // Navigation state — which schedule's detail to show
  const [detailSchedule, setDetailSchedule] = React.useState<DepartureSchedule | null>(null);

  // Auto-open create form when triggered by SpeedDialFAB
  React.useEffect(() => {
    if (formTrigger > 0) {
      setEditing(null);
      setDetailSchedule(null); // Go back to list first
      setShowForm(true);
      onFormTriggerConsumed?.();
    }
  }, [formTrigger, onFormTriggerConsumed]);

  // ─── Detail View ──────────────────────────────────────────────────────────
  if (detailSchedule) {
    return (
      <PreOrderDetailPage
        schedule={detailSchedule}
        schedules={schedules}
        customers={customers}
        preOrders={preOrders}
        onBack={() => setDetailSchedule(null)}
        onOpenCreateForm={() => {
          setEditing(null);
          setShowForm(true);
        }}
        showForm={showForm}
        setShowForm={setShowForm}
        editing={editing}
        setEditing={setEditing}
        convertTarget={convertTarget}
        setConvertTarget={setConvertTarget}
        handleSubmit={handleSubmit}
      />
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <PreOrderToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

        {/* ── Top Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          {/* Title + Stats */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-400/30 shrink-0">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Booking Jadwal</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full select-none">
                  {counts.pending} Pending
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full select-none">
                  {counts.selesai} Selesai
                </span>
                <span className="text-[11px] text-slate-400 font-semibold select-none hidden sm:inline">
                  {totalPO} Total
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-0.5 bg-slate-100/80 border border-slate-200/80 rounded-xl p-0.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    statusFilter === s
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {s || "Semua"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative hidden sm:flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari rute, jastiper..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 shadow-sm w-44"
              />
            </div>

            {/* New Button */}
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
            >
              <Plus size={14} strokeWidth="3" />
              Buat Booking
            </button>
          </div>
        </motion.div>

        {/* Mobile Search */}
        <div className="sm:hidden relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari rute, jastiper, pelanggan..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-slate-100 shadow-sm h-24" />
            ))}
          </div>
        ) : groupedBySchedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 shadow-inner">
              <Package size={26} className="text-rose-300" />
            </div>
            <p className="font-extrabold text-slate-600 text-base mb-1">
              {q || statusFilter ? "Booking Tidak Ditemukan" : "Belum Ada Booking Jadwal"}
            </p>
            <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
              {q || statusFilter
                ? "Coba ubah filter pencarian."
                : "Buat Booking Jadwal baru untuk mencatat titipan konsumen."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedBySchedule.map((group, idx) => {
              const sch = group.schedule;
              const slotFill = sch
                ? Math.min(100, (sch.beratTerpakai / sch.slotBeratKg) * 100)
                : 0;
              const isFull = slotFill >= 100;
              const totalBeratGroup = group.preOrders.reduce((s, p) => s + (p.totalKg || 0), 0);
              const pendingCount = group.preOrders.filter((p) => p.status === "Pending").length;

              return (
                <motion.div
                  key={sch?.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                >
                  {/* Schedule Card — clickable */}
                  <button
                    onClick={() => sch && setDetailSchedule(sch)}
                    disabled={!sch}
                    className={`w-full text-left bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${
                      sch
                        ? "hover:shadow-md hover:-translate-y-0.5 hover:border-rose-200/60 active:scale-[0.99] active:translate-y-0 cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        {/* Left — main info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            sch?.status === "Open"
                              ? "bg-rose-50 border border-rose-100"
                              : "bg-slate-100 border border-slate-200"
                          }`}>
                            <Plane size={16} className={sch?.status === "Open" ? "text-rose-500" : "text-slate-400"} />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            {/* Route + status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-800 truncate">
                                {group.label.replace(/ \(.+\)$/, "")}
                              </span>
                              {sch && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md select-none ${
                                  sch.status === "Open"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {sch.status}
                                </span>
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {group.date && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                                  <CalendarDays size={10} className="text-slate-400" />
                                  {formatDate(group.date)}
                                </span>
                              )}
                              {group.jastiper && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                                  <User size={10} className="text-slate-400" />
                                  {group.jastiper}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                <Weight size={10} className="text-rose-400" />
                                {totalBeratGroup.toFixed(1)} Kg
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right — badges + arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                {group.preOrders.length} PO
                              </span>
                              {pendingCount > 0 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                  {pendingCount} Pending
                                </span>
                              )}
                            </div>
                            {sch && (
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5 text-right">
                                {sch.beratTerpakai.toFixed(1)}/{sch.slotBeratKg} Kg
                              </div>
                            )}
                          </div>
                          {sch && (
                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Mobile badges */}
                      <div className="flex items-center gap-1.5 mt-2 sm:hidden">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {group.preOrders.length} PO
                        </span>
                        {pendingCount > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            {pendingCount} Pending
                          </span>
                        )}
                        {sch && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border select-none ${
                            isFull ? "text-red-600 bg-red-50 border-red-200" : "text-rose-600 bg-rose-50 border-rose-100"
                          }`}>
                            {sch.beratTerpakai.toFixed(1)}/{sch.slotBeratKg} Kg
                          </span>
                        )}
                      </div>

                      {/* Slot Progress Bar */}
                      {sch && (
                        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFull ? "bg-red-500" : slotFill > 75 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${slotFill}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}

            {statusFilter !== "Pending" && hasMoreSelesai && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={loadMoreSelesai}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all"
                >
                  Muat Lebih Banyak
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Form Modal (for list view — no pre-selected schedule) */}
      {showForm && (
        <PreOrderFormModal
          initial={editing}
          schedules={schedules}
          customers={customers}
          preOrders={preOrders}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
