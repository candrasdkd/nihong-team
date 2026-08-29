import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Search, Plane, Package, Weight, CalendarDays, User, ChevronRight, AlertCircle,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { usePreOrders } from "../hooks/usePreOrders";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { Button } from "../components/ui/Button";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { formatDate } from "../utils/format";
import { DepartureSchedule, PreOrder } from "../types";
import { PreOrderDetailPage } from "./PreOrderDetailPage";

function parseHighlightDate(dateStr?: string) {
  if (!dateStr) {
    return { day: "—", month: "TANPA", year: "", dayName: "Info" };
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, "0");
    const d = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
    const month = monthNames[monthIndex] || parts[1];
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = !isNaN(d.getDay()) ? dayNames[d.getDay()] : "";
    return { day, month, year, dayName };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { day: "—", month: "TGL", year: "", dayName: "" };
  }
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();
  const year = d.getFullYear().toString();
  const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
  return { day, month, year, dayName };
}

export function PreOrdersPage({ formTrigger = 0, onFormTriggerConsumed }: { formTrigger?: number; onFormTriggerConsumed?: () => void }) {
  const { showToast } = useOutletContext<{ showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void }>();
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
    counts,
    groupedBySchedule,
    groupedByJastiper,
    hasMoreSelesai,
    loadMoreSelesai,
    handleSubmit,
    handleDelete,
    handleToggleItemCheck,
  } = usePreOrders(showToast);

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
        showToast={showToast}
      />
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-base pb-28 font-sans text-slate-800">

      <div className="page-container space-y-6">

        {/* ── Top Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-card bg-brand-orange flex items-center justify-center shadow-sm shrink-0">
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
        ) : groupedByJastiper.length === 0 ? (
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
          <div className="space-y-6">
            {groupedByJastiper.map((jastiperGroup, jIdx) => {
              const isUnscheduledJastiper = jastiperGroup.id === "__unscheduled__";

              return (
                <div key={jastiperGroup.id || jIdx} className="space-y-3">
                  {/* Jastiper Group Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                        isUnscheduledJastiper
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-gradient-to-br from-brand-navyDark to-brand-navy text-white"
                      }`}>
                        {isUnscheduledJastiper ? (
                          <Package size={15} />
                        ) : (
                          jastiperGroup.namaJastiper[0]?.toUpperCase() || "J"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-800 tracking-tight truncate">
                            {jastiperGroup.namaJastiper}
                          </h3>
                          {!isUnscheduledJastiper && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                              {jastiperGroup.schedules.length} Jadwal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          Total titipan: <strong className="text-slate-700 font-bold">{jastiperGroup.totalKg.toFixed(1)} Kg</strong> ({jastiperGroup.totalPOs} PO)
                        </p>
                      </div>
                    </div>

                    {jastiperGroup.pendingPOs > 0 && (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                        {jastiperGroup.pendingPOs} Pending
                      </span>
                    )}
                  </div>

                  {/* Schedule Cards under this Jastiper */}
                  <div className="space-y-2.5">
                    {jastiperGroup.schedules.map((group, sIdx) => {
                      const sch = group.schedule;
                      const isUnscheduled = sch?.id === "__unscheduled__";
                      const slotFill = sch
                        ? Math.min(100, (sch.beratTerpakai / sch.slotBeratKg) * 100)
                        : 0;
                      const isFull = slotFill >= 100;
                      const totalBeratGroup = (group.allPreOrders ?? group.preOrders).reduce((s, p) => s + (p.totalKg || 0), 0);
                      const pendingCount = group.preOrders.filter((p) => p.status === "Pending").length;
                      const dateInfo = parseHighlightDate(sch?.tanggalBerangkat);

                      return (
                        <motion.div
                          key={sch?.id || sIdx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: (jIdx * 0.05) + (sIdx * 0.03) }}
                        >
                          <button
                            onClick={() => sch && setDetailSchedule(sch)}
                            className="w-full text-left bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-rose-200/60 active:scale-[0.99] active:translate-y-0 cursor-pointer group"
                          >
                            <div className="p-3.5 sm:p-4">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {/* Highlighted Calendar Date Block */}
                                {isUnscheduled ? (
                                  <div className="flex flex-col items-center justify-center w-14 sm:w-16 py-2 px-1 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0 select-none">
                                    <AlertCircle size={16} className="text-amber-500 mb-0.5" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 leading-tight">
                                      TANPA
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-600 uppercase">
                                      JADWAL
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center w-14 sm:w-16 py-2 px-1 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 shrink-0 select-none shadow-2xs group-hover:bg-rose-100/70 group-hover:border-rose-200 transition-colors">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-500">
                                      {dateInfo.month}
                                    </span>
                                    <span className="text-xl sm:text-2xl font-black text-rose-900 leading-tight my-0.5">
                                      {dateInfo.day}
                                    </span>
                                    <span className="text-[9px] font-bold text-rose-600/80">
                                      {dateInfo.dayName || dateInfo.year}
                                    </span>
                                  </div>
                                )}

                                {/* Middle Info */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* Route + Status Badge */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm sm:text-base font-black text-slate-800 tracking-tight truncate">
                                      {group.label.replace(/ \(.+\)$/, "")}
                                    </span>
                                    {isUnscheduled ? (
                                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none bg-amber-50 text-amber-700 border border-amber-200">
                                        Belum Ada Jadwal
                                      </span>
                                    ) : sch && (
                                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none bg-slate-100 text-slate-600 border border-slate-200">
                                        {sch.status}
                                      </span>
                                    )}
                                  </div>

                                  {/* Flight Details row */}
                                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                                    {sch && !isUnscheduled ? (
                                      <span className="flex items-center gap-1 text-slate-500">
                                        <Weight size={12} className="text-slate-400 shrink-0" />
                                        <span>Kapasitas: {totalBeratGroup.toFixed(1)}/{sch.slotBeratKg} Kg</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-slate-500">
                                        <Weight size={12} className="text-slate-400 shrink-0" />
                                        <span>{totalBeratGroup.toFixed(1)} Kg titipan</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Slot Progress Bar */}
                                   {sch && !isUnscheduled && (
                                     <div className="pt-1">
                                       <div className="h-1.5 w-full max-w-md rounded-full bg-slate-100 overflow-hidden">
                                         <div
                                           className={`h-full rounded-full transition-all duration-500 ${
                                             totalBeratGroup >= sch.slotBeratKg ? "bg-red-500" : totalBeratGroup / sch.slotBeratKg > 0.75 ? "bg-amber-500" : "bg-rose-500"
                                           }`}
                                           style={{ width: `${Math.min(100, (totalBeratGroup / sch.slotBeratKg) * 100)}%` }}
                                         />
                                       </div>
                                     </div>
                                   )}
                                </div>

                                {/* Right Side: PO Counters & Chevron */}
                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                  <div className="text-right hidden sm:block">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      {pendingCount > 0 ? (
                                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                                          {pendingCount} Pending
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                          Semua Selesai
                                        </span>
                                      )}
                                    </div>
                                    {sch && !isUnscheduled && (
                                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                                        Sisa {Math.max(0, sch.slotBeratKg - totalBeratGroup).toFixed(1)} Kg
                                      </div>
                                    )}
                                  </div>

                                  <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-slate-100 border border-slate-200/80 group-hover:border-slate-300 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                    <ChevronRight size={16} />
                                  </div>
                                </div>
                              </div>

                              {/* Mobile PO Counters */}
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 sm:hidden">
                                {pendingCount > 0 ? (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                                    {pendingCount} Pending
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                    Semua Selesai
                                  </span>
                                )}
                                {sch && !isUnscheduled && (
                                  <span className="ml-auto text-[10px] font-semibold text-slate-400">
                                    Sisa {Math.max(0, sch.slotBeratKg - totalBeratGroup).toFixed(1)} Kg
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
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
