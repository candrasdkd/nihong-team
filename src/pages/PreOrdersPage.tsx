import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Search, MessageCircle, Plane,
  Package, CheckCircle2, X, Pencil, Trash2, User, Weight, ArrowRight
} from "lucide-react";
import { usePreOrders } from "../hooks/usePreOrders";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { ConvertPreOrderModal } from "../components/PreOrder/ConvertPreOrderModal";
import { PreOrderToastContainer } from "../components/PreOrder/PreOrderToastContainer";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { formatDate, formatIDR } from "../utils/format";
import { FlagID, FlagJP } from "../components/ui/Flags";
import { PreOrder } from "../types";

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
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    counts,
    groupedBySchedule,
    hasMoreSelesai,
    loadMoreSelesai,
    addToast,
    handleSubmit,
    handleDelete,
    handleToggleItemCheck,
    handleSelectToggle,
    handleShareMultipleWhatsApp,
  } = usePreOrders();

  const STATUS_FILTERS = ["", "Pending", "Selesai"];
  const totalPO = (counts.pending || 0) + (counts.selesai || 0);
  const [viewItemsPO, setViewItemsPO] = React.useState<PreOrder | null>(null);

  // Auto-open create form when triggered by SpeedDialFAB
  React.useEffect(() => {
    if (formTrigger > 0) {
      setEditing(null);
      setShowForm(true);
      onFormTriggerConsumed?.();
    }
  }, [formTrigger, onFormTriggerConsumed]);

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <PreOrderToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

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

          {/* Actions Row */}
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
                placeholder="Cari pelanggan..."
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
            placeholder="Cari pelanggan, rute, barang..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                <div className="h-3.5 bg-slate-200 rounded w-24" />
                <div className="h-3 bg-slate-100 rounded w-36" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
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
              {q || statusFilter ? "Coba ubah filter pencarian." : "Buat Booking Jadwal baru untuk mencatat titipan konsumen."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedBySchedule.map((group, idx) => {
              const slotFill = group.schedule
                ? Math.min(100, (group.schedule.beratTerpakai / group.schedule.slotBeratKg) * 100)
                : 0;
              const isFull = slotFill >= 100;

              return (
                <motion.div
                  key={group.schedule?.id || idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Schedule Group Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                          <Plane size={13} className="text-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800 truncate">{group.label}</p>
                          {group.date && (
                            <p className="text-[11px] text-slate-400 font-semibold">
                              {formatDate(group.date)}
                              {group.jastiper && (
                                <> &bull; <span className="text-slate-600 font-bold">{group.jastiper}</span></>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border select-none ${
                          isFull
                            ? "text-red-600 bg-red-50 border-red-200"
                            : "text-slate-600 bg-slate-50 border-slate-200"
                        }`}>
                          {group.preOrders.length} PO
                        </span>
                        {group.schedule && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border select-none ${
                            isFull
                              ? "text-red-600 bg-red-50 border-red-200"
                              : "text-rose-600 bg-rose-50 border-rose-100"
                          }`}>
                            {group.schedule.beratTerpakai.toFixed(1)}/{group.schedule.slotBeratKg} Kg
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Slot Progress Bar */}
                    {group.schedule && (
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? "bg-red-500" : slotFill > 75 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${slotFill}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Pre-Orders Spreadsheet Grid View */}
                  <div className="p-2 sm:p-4">
                    {group.preOrders.length === 0 ? (
                      <div className="py-6 text-center text-xs font-semibold text-slate-400 italic border border-dashed border-slate-200 rounded-xl select-none m-2">
                        Belum ada pre-order di jadwal ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full border border-slate-200/80 rounded-xl bg-white shadow-xs">
                        <table className="min-w-[850px] w-full border-collapse text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-350 sticky top-0 z-20">
                            <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                              <th className="border border-slate-200 px-2 py-2 w-9 text-center bg-slate-100/50">#</th>
                              <th className="border border-slate-200 px-2 py-2 w-10 text-center bg-slate-50/20">Pilih</th>
                              <th className="border border-slate-200 px-3 py-2 min-w-[160px]">Pelanggan</th>
                              <th className="border border-slate-200 px-3 py-2 w-28">Total Berat</th>
                              <th className="border border-slate-200 px-3 py-2 min-w-[220px]">Daftar Barang</th>
                              <th className="border border-slate-200 px-3 py-2 w-24 text-center">Status</th>
                              <th className="border border-slate-200 px-3 py-2 w-32 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {group.preOrders.map((po, poIdx) => {
                              const isSelesai = po.status === "Selesai";
                              const checkedCount = po.items.filter((i) => i.checked).length;
                              const totalItems = po.items.length;

                              const individualShareWA = () => {
                                const sch = schedules.find((s) => s.id === po.idJadwal);
                                const lastDropDate = sch?.tanggalLastDrop ? formatDate(sch.tanggalLastDrop) : "-";
                                const departureDate = po.tanggalBerangkat ? formatDate(po.tanggalBerangkat) : "-";
                                const feeJastiper = sch?.hargaFeeJastiper ? formatIDR(sch.hargaFeeJastiper) : "Rp 0";
                                const itemsText = po.items
                                  .map((item) => `${item.checked ? "✅" : "⬜"} ${item.namaBarang}`)
                                  .join("\n");

                                const message = `*Jastiper:* ${po.namaJastiper || "-"}
*Rute:* ${po.rute || "-"}
*Last Drop:* ${lastDropDate}
*Keberangkatan:* ${departureDate}
*Fee Jastip:* ${feeJastiper} / Kg
*Konsumen:* ${po.namaPelanggan}
*Total Berat:* ${po.totalKg.toFixed(1)} Kg

*Daftar Barang:*
${itemsText}`;

                                window.open(
                                  `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              };

                              return (
                                <tr
                                  key={po.id}
                                  className={`group transition-all duration-150 ${
                                    selectedIds.includes(po.id)
                                      ? "bg-rose-50/40 hover:bg-rose-50/60"
                                      : "hover:bg-slate-50/80"
                                  }`}
                                >
                                  {/* Row index */}
                                  <td className="border border-slate-200 px-2 py-1.5 w-9 text-center bg-slate-50/80 font-mono text-[10px] text-slate-400 select-none">
                                    {poIdx + 1}
                                  </td>

                                  {/* Checkbox */}
                                  <td className="border border-slate-200 px-2 py-1.5 w-10 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(po.id)}
                                      onChange={() => handleSelectToggle(po.id)}
                                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                  </td>

                                  {/* Pelanggan */}
                                  <td className="border border-slate-200 px-3 py-1.5 min-w-[160px] align-middle">
                                    <div className="font-extrabold text-slate-800 text-xs leading-tight">
                                      {po.namaPelanggan}
                                    </div>
                                    {po.noTelponPelanggan && (
                                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                        {po.noTelponPelanggan}
                                      </div>
                                    )}
                                  </td>

                                  {/* Total Berat */}
                                  <td className="border border-slate-200 px-3 py-1.5 w-28 align-middle text-slate-700">
                                    <div className="flex items-center gap-1 font-bold text-xs">
                                      <Weight size={11} className="text-slate-400 shrink-0" />
                                      <span>{po.totalKg.toFixed(1)} Kg</span>
                                    </div>
                                  </td>

                                  {/* Daftar Barang */}
                                  <td className="border border-slate-200 px-3 py-1.5 min-w-[220px] align-middle">
                                    <div className="flex flex-col gap-1">
                                      {totalItems === 0 ? (
                                        <span className="text-slate-400 italic text-[11px]">Tidak ada barang</span>
                                      ) : (
                                        <button
                                          onClick={() => setViewItemsPO(po)}
                                          className="inline-flex items-center justify-start gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 font-extrabold text-[10px] text-slate-600 transition-all active:scale-95 w-max"
                                        >
                                          <Package size={11} className="shrink-0" />
                                          <span>{totalItems} Barang ({checkedCount} Selesai)</span>
                                        </button>
                                      )}
                                      {po.catatan && (
                                        <div className="text-[10px] text-slate-400 font-medium italic leading-tight flex items-start gap-1" title={po.catatan}>
                                          <span>📝</span>
                                          <span className="line-clamp-1 max-w-[180px]">{po.catatan}</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="border border-slate-200 px-3 py-1.5 w-24 text-center align-middle">
                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${isSelesai ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                                      {po.status}
                                    </span>
                                  </td>

                                  {/* Aksi */}
                                  <td className="border border-slate-200 px-3 py-1.5 w-32 text-right align-middle">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={individualShareWA}
                                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-transparent hover:border-emerald-100"
                                        title="Bagikan WA"
                                      >
                                        <MessageCircle size={13} />
                                      </button>

                                      {!isSelesai ? (
                                        <>
                                          <button
                                            onClick={() => { setEditing(po); setShowForm(true); }}
                                            className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                                            title="Edit"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(po)}
                                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-650 transition-colors border border-transparent hover:border-rose-100"
                                            title="Hapus"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                          <button
                                            onClick={() => setConvertTarget(po)}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold transition-all active:scale-95 shrink-0"
                                            title="Pindahkan ke Pesanan"
                                          >
                                            <ArrowRight size={9} strokeWidth={3} />
                                            <span>Pindahkan</span>
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded select-none">
                                          Selesai
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
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

      {/* Modals */}
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

      {convertTarget && (
        <ConvertPreOrderModal
          preOrder={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={() => {
            addToast("Booking berhasil dikonversi ke Pesanan!", "success");
            setConvertTarget(null);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3 z-[90]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white leading-none">{selectedIds.length} Terpilih</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Booking dipilih</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Batal"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleShareMultipleWhatsApp}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded-xl shadow-md shadow-emerald-900/50 transition-all active:scale-95"
              >
                <MessageCircle size={13} />
                Bagikan WA
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Pre-Order Items Checklist Modal */}
      <AnimatePresence>
        {viewItemsPO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setViewItemsPO(null)}
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Daftar Titipan Barang</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Konsumen: <span className="text-rose-600 font-bold">{viewItemsPO.namaPelanggan}</span>
                  </p>
                </div>
                <button
                  onClick={() => setViewItemsPO(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4 max-h-[300px] overflow-y-auto">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100/80 text-[10px] font-bold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Jastiper</span>
                    <span className="text-slate-800 font-extrabold">{viewItemsPO.namaJastiper}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Rute</span>
                    <span className="text-slate-800 font-extrabold">{viewItemsPO.rute}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Keberangkatan</span>
                    <span className="text-slate-800 font-extrabold">{formatDate(viewItemsPO.tanggalBerangkat)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Berat</span>
                    <span className="text-rose-600 font-extrabold">{viewItemsPO.totalKg.toFixed(1)} Kg</span>
                  </div>
                </div>

                {/* Items checklist */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Checklist Barang ({viewItemsPO.items.filter(i => i.checked).length} / {viewItemsPO.items.length} Selesai)
                  </p>
                  
                  <div className="space-y-1.5 bg-slate-50/50 border border-slate-100 p-2.5 rounded-2xl">
                    {viewItemsPO.items.map((item, idx) => {
                      const isSelesai = viewItemsPO.status === "Selesai";
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-colors ${isSelesai ? "cursor-default" : "cursor-pointer hover:bg-white hover:shadow-2xs active:bg-slate-100"}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={() => {
                              handleToggleItemCheck(viewItemsPO, idx);
                              setViewItemsPO(prev => {
                                if (!prev) return null;
                                const updatedItems = [...prev.items];
                                updatedItems[idx] = { ...updatedItems[idx], checked: !updatedItems[idx].checked };
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            disabled={isSelesai}
                            className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 w-4 h-4 shrink-0"
                          />
                          <span className={`text-xs font-semibold flex-1 ${item.checked ? "line-through text-slate-400 font-normal" : "text-slate-700"}`}>
                            {item.namaBarang}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                {viewItemsPO.catatan && (
                  <div className="flex items-start gap-1.5 bg-amber-50/40 border border-amber-100/50 rounded-2xl px-3 py-2 text-[10px] font-semibold text-slate-505">
                    <span className="text-amber-500">📝</span>
                    <p className="italic leading-relaxed">{viewItemsPO.catatan}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setViewItemsPO(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

