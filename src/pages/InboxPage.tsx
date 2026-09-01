// src/pages/InboxPage.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Search,
  Plane,
  Package,
  CheckSquare,
  Square,
  ShoppingBag,
  ChevronDown,
  Filter,
  ArrowUpDown,
  ClipboardList,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useNihongStoreInbox, InboxSortOption } from "../hooks/useNihongStoreInbox";
import { NihongStoreOrderCard } from "../components/NihongStore/NihongStoreOrderCard";
import { AssignScheduleModal } from "../components/NihongStore/AssignScheduleModal";
import { ManageOrderItemsModal } from "../components/NihongStore/ManageOrderItemsModal";
import { UpdateOrderStatusModal } from "../components/NihongStore/UpdateOrderStatusModal";
import { WhatsAppTemplateModal } from "../components/NihongStore/WhatsAppTemplateModal";
import { NihongStoreOrderDetailModal } from "../components/NihongStore/NihongStoreOrderDetailModal";
import { ConnectStoreAuthModal } from "../components/NihongStore/ConnectStoreAuthModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";

const PAYMENT_FILTER_OPTIONS = [
  { id: "", label: "Semua Pembayaran" },
  { id: "Menunggu verifikasi", label: "Menunggu Verifikasi" },
  { id: "Menunggu DP", label: "Menunggu DP" },
  { id: "DP Terverifikasi", label: "DP Terverifikasi" },
  { id: "Menunggu Pelunasan", label: "Menunggu Pelunasan" },
  { id: "Lunas", label: "Lunas" },
  { id: "Dibatalkan", label: "Dibatalkan" },
];

const STOCK_FILTER_OPTIONS = [
  { id: "", label: "Semua Kondisi Stok" },
  { id: "oos", label: "⚠️ Ada Barang Habis" },
  { id: "ready", label: "✅ Semua Ready" },
];

const SORT_OPTIONS: Array<{ id: InboxSortOption; label: string }> = [
  { id: "newest", label: "Tanggal Terbaru" },
  { id: "oldest", label: "Tanggal Terlama" },
  { id: "price_desc", label: "Nilai Tertinggi (IDR)" },
  { id: "price_asc", label: "Nilai Terendah (IDR)" },
  { id: "weight_desc", label: "Berat Terbesar (Kg)" },
];

export function InboxPage() {
  const { showToast } = useOutletContext<{
    showToast: (
      msg: string,
      type: "success" | "error" | "info" | "warning"
    ) => void;
  }>();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    orders,
    filteredOrders,
    schedules,
    customers,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    stockFilter,
    setStockFilter,
    sortBy,
    setSortBy,
    clearAllFilters,
    q,
    setQ,
    limitCount,
    loadMore,
    hasMore,
    selectedIds,
    counts,
    handleSelectToggle,
    handleSelectAll,
    clearSelection,
    assignModalOpen,
    setAssignModalOpen,
    assignTargetOrders,
    handleOpenAssignSingle,
    handleOpenAssignBatch,
    handleAssignSubmit,
    manageItemsModalOpen,
    setManageItemsModalOpen,
    managingOrder,
    handleOpenManageItems,
    handleSaveManagedItems,
    updateStatusModalOpen,
    setUpdateStatusModalOpen,
    statusTargetOrder,
    handleOpenUpdateStatus,
    handleSaveCustomStatus,
    whatsAppModalOpen,
    setWhatsAppModalOpen,
    whatsAppTargetOrder,
    setWhatsAppTargetOrder,
    handleOpenWhatsApp,
    detailModalOpen,
    setDetailModalOpen,
    detailTargetOrder,
    setDetailTargetOrder,
    handleOpenOrderDetail,
    handleCopyBatchShoppingList,
    confirmModal,
    setConfirmModal,
    connectAuthModalOpen,
    setConnectAuthModalOpen,
    refreshOrders,
    handleReject,
    handleDelete,
  } = useNihongStoreInbox(showToast);

  const STATUS_TABS = [
    { id: "inbox", label: "Menunggu Jadwal", count: counts.inbox, color: "text-amber-600" },
    { id: "assigned", label: "Terjadwal", count: counts.assigned, color: "text-emerald-600" },
    { id: "rejected", label: "Dibatalkan", count: counts.rejected, color: "text-slate-500" },
    { id: "", label: "Semua", count: counts.total, color: "text-slate-700" },
  ];

  const hasActiveFilters = Boolean(
    paymentFilter || stockFilter || q || sortBy !== "newest" || (statusFilter !== "inbox" && statusFilter !== "")
  );

  return (
    <div className="min-h-screen bg-surface-base pb-32 font-sans text-slate-800">
      <div className="page-container space-y-5">
        {/* Top Header */}
        <HeroPageHeader
          variant="gradient"
          badgeIcon={Inbox}
          badgeLabel="NihongStore Integration"
          title="Inbox Pesanan NihongStore"
          mobileSubtitle="Kelola pesanan masuk, ketersediaan stok fisik, dan jadwal handcarry."
          description="Kelola pesanan otomatis dari NihongStore, ubah status tahapan, atur ketersediaan stok fisik, dan tetapkan ke Jadwal Keberangkatan Handcarry."
        />

        {/* Error Alert Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0 font-bold">
                ⚠️
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-amber-950 leading-relaxed">{error}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Klik tombol di samping untuk login ke sesi NihongStore secara langsung tanpa harus keluar dari aplikasi.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setConnectAuthModalOpen(true)}
              className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm shrink-0 justify-center"
            >
              Hubungkan Sesi NihongStore
            </Button>
          </motion.div>
        )}

        {/* ── Filter Bar & Search ── */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      clearSelection();
                    }}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                      active
                        ? "bg-brand-navyDark text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 lg:w-72">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari pemesan, no order, produk…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-sm"
                />
              </div>

              {/* Advanced Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm active:scale-95 shrink-0 ${
                  showAdvancedFilters || paymentFilter || stockFilter || sortBy !== "newest"
                    ? "bg-orange-50 border-brand-orange text-brand-orange ring-1 ring-brand-orange/20"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                title="Filter & Pengurutan Lanjutan"
              >
                <Filter size={14} />
                <span className="hidden sm:inline">Filter & Sort</span>
              </button>
            </div>
          </div>

          {/* Advanced Filter & Sorting Panel */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter size={13} className="text-brand-orange" />
                      Filter & Pengurutan Lanjutan
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-slate-500 hover:text-brand-orange font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={12} />
                        <span>Reset Semua Filter</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Payment Status Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Status Pembayaran
                      </label>
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      >
                        {PAYMENT_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stock Condition Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Kondisi Ketersediaan Stok
                      </label>
                      <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      >
                        {STOCK_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sorting Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Urutkan Berdasarkan
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as InboxSortOption)}
                        className="w-full text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Select All / Batch Control Bar */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 font-semibold">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-slate-700 hover:text-brand-orange transition-colors font-bold"
            >
              {selectedIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                <CheckSquare size={16} className="text-brand-orange" />
              ) : (
                <Square size={16} className="text-slate-400" />
              )}
              <span>
                {selectedIds.length === filteredOrders.length
                  ? "Batal Pilih Semua"
                  : "Pilih Semua Pesanan"}
              </span>
            </button>
            <span className="text-slate-400 text-[11px]">
              Menampilkan {filteredOrders.length} pesanan
            </span>
          </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-3xl p-5 border border-slate-100 shadow-sm h-48"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/60 rounded-3xl border border-dashed border-slate-200 p-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 text-brand-orange">
              <ShoppingBag size={28} />
            </div>
            <h3 className="font-extrabold text-slate-700 text-base mb-1">
              {q || paymentFilter || stockFilter
                ? "Pesanan Tidak Ditemukan"
                : statusFilter === "inbox"
                ? "Tidak Ada Pesanan Menunggu Jadwal"
                : "Belum Ada Pesanan NihongStore"}
            </h3>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              {q || paymentFilter || stockFilter
                ? "Coba ubah kata kunci atau atur ulang filter pencarian Anda."
                : statusFilter === "inbox"
                ? "Semua pesanan NihongStore sudah dijadwalkan atau belum ada checkout baru dari web toko."
                : "Pesanan yang masuk dari website NihongStore akan otomatis tampil di sini secara real-time."}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={clearAllFilters}
                className="mt-4 text-xs font-bold px-4 py-2 rounded-xl"
              >
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map((order) => (
              <NihongStoreOrderCard
                key={order.id}
                order={order}
                isSelected={selectedIds.includes(order.id)}
                onSelectToggle={handleSelectToggle}
                onAssign={handleOpenAssignSingle}
                onReject={handleReject}
                onDelete={handleDelete}
                onManageItems={handleOpenManageItems}
                onUpdateStatus={handleOpenUpdateStatus}
                onWhatsAppChat={handleOpenWhatsApp}
                onOpenDetail={handleOpenOrderDetail}
                onShowToast={(msg, type = "success") => showToast(msg, type)}
              />
            ))}
          </div>
        )}

        {/* Load More Button for Pagination Limit */}
        {!loading && hasMore && (
          <div className="flex justify-center pt-2 pb-6">
            <button
              type="button"
              onClick={loadMore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all active:scale-95"
            >
              <ChevronDown size={15} className="text-slate-400" />
              <span>Muat 50 Pesanan Lebih Lama</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold">
                +{limitCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Floating Batch Action Bar ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-[76px] sm:bottom-6 inset-x-3 sm:inset-x-4 max-w-xl mx-auto z-40 bg-brand-navyDark text-white px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center text-xs font-black text-white shrink-0">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold truncate">
                Pesanan Terpilih
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyBatchShoppingList}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1"
                title="Salin daftar belanja pesanan terpilih"
              >
                <ClipboardList size={13} className="text-brand-orange" />
                <span className="hidden sm:inline">Salin List Belanja</span>
              </button>

              <button
                onClick={clearSelection}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>

              <Button
                type="button"
                onClick={handleOpenAssignBatch}
                className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-3.5 sm:px-4 py-2 rounded-xl shadow-md shadow-brand-orange/30 flex items-center gap-1.5"
              >
                <Plane size={14} />
                <span>Assign Jadwal</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Assign Schedule Modal ── */}
      {assignModalOpen && (
        <AssignScheduleModal
          isOpen={assignModalOpen}
          orders={assignTargetOrders}
          schedules={schedules}
          customers={customers}
          onClose={() => setAssignModalOpen(false)}
          onConfirm={handleAssignSubmit}
        />
      )}

      {/* ── Manage Order Items & Stock Modal ── */}
      {manageItemsModalOpen && (
        <ManageOrderItemsModal
          isOpen={manageItemsModalOpen}
          order={managingOrder}
          onClose={() => setManageItemsModalOpen(false)}
          onSave={handleSaveManagedItems}
        />
      )}

      {/* ── Update Order Status Modal ── */}
      {updateStatusModalOpen && (
        <UpdateOrderStatusModal
          isOpen={updateStatusModalOpen}
          order={statusTargetOrder}
          onClose={() => setUpdateStatusModalOpen(false)}
          onSave={handleSaveCustomStatus}
        />
      )}

      {/* ── Dynamic WhatsApp Template Modal ── */}
      {whatsAppModalOpen && (
        <WhatsAppTemplateModal
          isOpen={whatsAppModalOpen}
          order={whatsAppTargetOrder}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setWhatsAppTargetOrder(null);
          }}
        />
      )}

      {/* ── Order Detail & Visual Timeline Modal ── */}
      {detailModalOpen && (
        <NihongStoreOrderDetailModal
          isOpen={detailModalOpen}
          order={detailTargetOrder}
          onClose={() => {
            setDetailModalOpen(false);
            setDetailTargetOrder(null);
          }}
          onOpenUpdateStatus={handleOpenUpdateStatus}
          onOpenManageItems={handleOpenManageItems}
          onOpenAssign={handleOpenAssignSingle}
          onOpenWhatsApp={handleOpenWhatsApp}
          onShowToast={(msg, type = "success") => showToast(msg, type)}
        />
      )}

      {/* ── Connect Store Auth Modal ── */}
      {connectAuthModalOpen && (
        <ConnectStoreAuthModal
          isOpen={connectAuthModalOpen}
          onClose={() => setConnectAuthModalOpen(false)}
          onSuccess={() => {
            refreshOrders();
            showToast("Sesi NihongStore berhasil terhubung!", "success");
          }}
        />
      )}

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
