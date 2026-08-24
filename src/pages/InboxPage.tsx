// src/pages/InboxPage.tsx
import React from "react";
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
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useNihongStoreInbox } from "../hooks/useNihongStoreInbox";
import { NihongStoreOrderCard } from "../components/NihongStore/NihongStoreOrderCard";
import { AssignScheduleModal } from "../components/NihongStore/AssignScheduleModal";
import { ManageOrderItemsModal } from "../components/NihongStore/ManageOrderItemsModal";
import { UpdateOrderStatusModal } from "../components/NihongStore/UpdateOrderStatusModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";

export function InboxPage() {
  const { showToast } = useOutletContext<{
    showToast: (
      msg: string,
      type: "success" | "error" | "info" | "warning"
    ) => void;
  }>();

  const {
    orders,
    filteredOrders,
    schedules,
    customers,
    loading,
    statusFilter,
    setStatusFilter,
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
    confirmModal,
    setConfirmModal,
    handleReject,
    handleDelete,
    handleWhatsAppChat,
  } = useNihongStoreInbox(showToast);

  const STATUS_TABS = [
    { id: "inbox", label: "Menunggu Jadwal", count: counts.inbox, color: "text-amber-600" },
    { id: "assigned", label: "Terjadwal", count: counts.assigned, color: "text-emerald-600" },
    { id: "rejected", label: "Dibatalkan", count: counts.rejected, color: "text-slate-500" },
    { id: "", label: "Semua", count: counts.total, color: "text-slate-700" },
  ];

  return (
    <div className="min-h-screen bg-surface-base pb-32 font-sans text-slate-800">
      <div className="page-container space-y-6">
        {/* Top Header */}
        <HeroPageHeader
          variant="gradient"
          badgeIcon={Inbox}
          badgeLabel="NihongStore Integration"
          title="Inbox Pesanan NihongStore"
          mobileSubtitle="Kelola pesanan masuk, ketersediaan stok fisik, dan jadwal handcarry."
          description="Kelola pesanan otomatis dari NihongStore, ubah status tahapan, atur ketersediaan stok fisik, dan tetapkan ke Jadwal Keberangkatan Handcarry."
        />

        {/* Status Counters & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
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

          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama pemesan, no order, produk…"
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-sm"
            />
          </div>
        </div>

        {/* Select All / Batch Control Bar for Inbox Tab */}
        {statusFilter === "inbox" && filteredOrders.length > 0 && (
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
              {q
                ? "Pesanan Tidak Ditemukan"
                : statusFilter === "inbox"
                ? "Tidak Ada Pesanan Menunggu Jadwal"
                : "Belum Ada Pesanan NihongStore"}
            </h3>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              {q
                ? "Coba kata kunci pencarian yang lain."
                : statusFilter === "inbox"
                ? "Semua pesanan NihongStore sudah dijadwalkan atau belum ada checkout baru dari web toko."
                : "Pesanan yang masuk dari website NihongStore akan otomatis tampil di sini secara real-time."}
            </p>
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
                onWhatsAppChat={handleWhatsAppChat}
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

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-[76px] sm:bottom-6 inset-x-3 sm:inset-x-4 max-w-lg mx-auto z-40 bg-brand-navyDark text-white px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center text-xs font-black text-white shrink-0">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold truncate">
                Pesanan NihongStore terpilih
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <Button
                type="button"
                onClick={handleOpenAssignBatch}
                className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md shadow-brand-orange/30 flex items-center gap-1.5"
              >
                <Plane size={14} />
                <span>Assign ke Jadwal</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Schedule Modal */}
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

      {/* Manage Order Items & Stock Modal */}
      {manageItemsModalOpen && (
        <ManageOrderItemsModal
          isOpen={manageItemsModalOpen}
          order={managingOrder}
          onClose={() => setManageItemsModalOpen(false)}
          onSave={handleSaveManagedItems}
        />
      )}

      {/* Update Order Status Modal */}
      {updateStatusModalOpen && (
        <UpdateOrderStatusModal
          isOpen={updateStatusModalOpen}
          order={statusTargetOrder}
          onClose={() => setUpdateStatusModalOpen(false)}
          onSave={handleSaveCustomStatus}
        />
      )}

      {/* Confirm Modal */}
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
