import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Plus, Search, MessageCircle, Plane, Calendar, User2 } from "lucide-react";
import { usePreOrders } from "../hooks/usePreOrders";
import { PreOrderCard } from "../components/PreOrder/PreOrderCard";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { ConvertPreOrderModal } from "../components/PreOrder/ConvertPreOrderModal";
import { PreOrderToastContainer } from "../components/PreOrder/PreOrderToastContainer";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { formatDate } from "../utils/format";

export function PreOrdersPage() {
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

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <PreOrderToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftar Pre Order 📦</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola barang titipan konsumen sebelum berangkat.
          </p>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4c0519] via-[#881337] to-[#4c0519] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-400/15 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-pink-400/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-400/30 px-3 py-1 rounded-full text-xs font-bold text-rose-300 mb-3">
                <ShoppingBag size={12} />
                <span>Pre Order Konsumen</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Daftar Pre Order 📦</h2>
              <p className="text-slate-400 mt-1.5 text-sm max-w-lg">
                Catat barang titipan konsumen sebelum berangkat. Setelah semua siap, konversi ke Pesanan resmi.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 font-bold px-5 py-2.5 rounded-xl border border-rose-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Buat Pre Order
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="hidden sm:grid grid-cols-2 gap-3">
          {[
            { label: "Pending", value: counts.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Selesai", value: counts.selesai, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-2`}
            >
              <span className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs font-bold text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {s || "Semua"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md ml-auto">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pelanggan, rute, barang..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:ring-2 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
            />
          </div>
        </div>

        {/* Grouped Lists by Schedule */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3"
              >
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-3 bg-slate-100 rounded w-40" />
                <div className="h-20 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : groupedBySchedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 shadow-inner">
              <ShoppingBag size={32} className="text-rose-300" />
            </div>
            <h3 className="font-extrabold text-slate-700 text-lg mb-1">
              {q || statusFilter ? "Pre Order Tidak Ditemukan" : "Belum Ada Pre Order"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              {q || statusFilter
                ? "Coba ubah filter pencarian."
                : "Buat Pre Order baru untuk mencatat titipan konsumen."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedBySchedule.map((group, idx) => (
              <div
                key={group.schedule?.id || idx}
                className="bg-slate-100/40 border border-slate-200/50 rounded-3xl p-5 sm:p-6 space-y-4"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                      <Plane className="w-4 h-4 text-rose-500" />
                      <span>{group.label}</span>
                    </h3>
                    {group.date && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 font-sans">
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-xl text-xs font-black shadow-3xs select-none">
                          <Calendar size={12} className="text-blue-600 shrink-0" />
                          <span>Berangkat: {formatDate(group.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-xl text-xs font-bold shadow-3xs select-none">
                          <User2 size={12} className="text-slate-400 shrink-0" />
                          <span>
                            Jastiper: <span className="text-slate-800 font-black">{group.jastiper}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {group.schedule && (
                    <div className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs select-none">
                      Total Berat Terisi:{" "}
                      <span className="text-slate-800 font-extrabold">
                        {group.schedule.beratTerpakai.toFixed(1)} Kg
                      </span>
                    </div>
                  )}
                </div>

                {/* Pre-Orders under this schedule */}
                {group.preOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200 select-none">
                    Belum ada pre-order di jadwal ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.preOrders.map((po) => (
                      <PreOrderCard
                        key={po.id}
                        po={po}
                        schedules={schedules}
                        selected={selectedIds.includes(po.id)}
                        onSelectToggle={() => handleSelectToggle(po.id)}
                        onEdit={() => {
                          setEditing(po);
                          setShowForm(true);
                        }}
                        onDelete={() => handleDelete(po)}
                        onConvert={() => setConvertTarget(po)}
                        onToggleItemCheck={(itemIdx) => handleToggleItemCheck(po, itemIdx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {statusFilter !== "Pending" && hasMoreSelesai && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMoreSelesai}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-bold shadow-xs hover:shadow-md transition-all"
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
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {showForm && (
        <PreOrderFormModal
          initial={editing}
          schedules={schedules}
          customers={customers}
          preOrders={preOrders}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {convertTarget && (
        <ConvertPreOrderModal
          preOrder={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={(id) => {
            addToast(`Pre Order berhasil dikonversi ke Pesanan!`, "success");
            setConvertTarget(null);
          }}
        />
      )}

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 100, x: "-50%" }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-4 z-[90]"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Pilihan Pre Order</span>
              <span className="text-sm font-extrabold text-white">{selectedIds.length} Terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Batal
              </button>
              <Button
                onClick={handleShareMultipleWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl border-0 shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                Bagikan WA
              </Button>
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
    </div>
  );
}
