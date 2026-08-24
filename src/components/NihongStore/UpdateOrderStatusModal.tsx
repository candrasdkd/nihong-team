// src/components/NihongStore/UpdateOrderStatusModal.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  RefreshCw,
  CheckCircle2,
  Plane,
  ShoppingBag,
  Clock,
  PackageCheck,
  XCircle,
  CreditCard,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { NihongStoreOrder, NihongStoreOrderStatus } from "../../types";
import { Button } from "../ui/Button";

interface UpdateOrderStatusModalProps {
  isOpen: boolean;
  order: NihongStoreOrder | null;
  onClose: () => void;
  onSave: (
    orderId: string,
    displayStatus: string,
    paymentStatus: string,
    statusCategory: NihongStoreOrderStatus,
    note: string
  ) => Promise<void>;
}

const PRESET_STATUSES = [
  {
    id: "Menunggu Cek Stok",
    label: "1. Menunggu Cek Stok",
    category: "inbox" as NihongStoreOrderStatus,
    paymentStatus: "Menunggu verifikasi",
    icon: Clock,
    color: "border-amber-200 bg-amber-50/60 text-amber-800",
    desc: "Admin sedang memeriksa ketersediaan barang fisik di gerai Jepang.",
  },
  {
    id: "Menunggu DP 50%",
    label: "2. Menunggu DP 50%",
    category: "inbox" as NihongStoreOrderStatus,
    paymentStatus: "Menunggu DP",
    icon: CreditCard,
    color: "border-amber-300 bg-amber-100/50 text-amber-900",
    desc: "Barang ready, menunggu transfer DP 50% dari konsumen.",
  },
  {
    id: "Diproses di Jepang",
    label: "3. Diproses di Jepang (Belanja)",
    category: "assigned" as NihongStoreOrderStatus,
    paymentStatus: "DP Terverifikasi",
    icon: ShoppingBag,
    color: "border-blue-200 bg-blue-50/60 text-blue-800",
    desc: "DP diterima, pesanan dalam antrean belanja jastiper di Tokyo.",
  },
  {
    id: "Dijadwalkan Handcarry",
    label: "4. Dijadwalkan Handcarry",
    category: "assigned" as NihongStoreOrderStatus,
    paymentStatus: "DP Terverifikasi",
    icon: Plane,
    color: "border-purple-200 bg-purple-50/60 text-purple-800",
    desc: "Barang sudah siap dan masuk ke jadwal penerbangan handcarry.",
  },
  {
    id: "Tiba di Indonesia",
    label: "5. Tiba di Indonesia (QC & Pelunasan)",
    category: "assigned" as NihongStoreOrderStatus,
    paymentStatus: "Menunggu Pelunasan",
    icon: PackageCheck,
    color: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    desc: "Barang sudah mendarat di Indonesia & lolos QC, menunggu pelunasan.",
  },
  {
    id: "Selesai",
    label: "6. Selesai & Dikirim ke Alamat",
    category: "assigned" as NihongStoreOrderStatus,
    paymentStatus: "Lunas",
    icon: CheckCircle2,
    color: "border-emerald-300 bg-emerald-100/70 text-emerald-900",
    desc: "Pelunasan 100% selesai dan barang dikirim via kurir lokal.",
  },
  {
    id: "Dibatalkan",
    label: "7. Dibatalkan / Ditolak",
    category: "rejected" as NihongStoreOrderStatus,
    paymentStatus: "Dibatalkan",
    icon: XCircle,
    color: "border-rose-200 bg-rose-50/60 text-rose-800",
    desc: "Pesanan dibatalkan atau ditolak.",
  },
];

export function UpdateOrderStatusModal({
  isOpen,
  order,
  onClose,
  onSave,
}: UpdateOrderStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("Menunggu Cek Stok");
  const [customNote, setCustomNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.displayStatus || "Menunggu Cek Stok");
      setCustomNote("");
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const currentPreset = PRESET_STATUSES.find((p) => p.id === selectedStatus) || PRESET_STATUSES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const statusCategory: NihongStoreOrderStatus = currentPreset.category;
      const paymentStatus = currentPreset.paymentStatus;
      const noteToSave = customNote.trim() || currentPreset.desc;

      await onSave(
        order.id,
        selectedStatus,
        paymentStatus,
        statusCategory,
        noteToSave
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memperbarui status pesanan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 ring-1 ring-blue-200 shrink-0">
              <RefreshCw size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">
                Ubah Status & Progres Pesanan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                Pesanan <span className="font-bold text-slate-700">{order.no}</span> · {order.namaPelanggan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Preset Status Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Pilih Tahapan Progres Pesanan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {PRESET_STATUSES.map((preset) => {
                  const isSelected = selectedStatus === preset.id;
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedStatus(preset.id)}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? `${preset.color} ring-2 ring-brand-navyDark/20 shadow-sm font-bold`
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <Icon size={16} className="shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {preset.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automated Payment Status Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <CreditCard size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500">
                    Status Pembayaran Otomatis
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{currentPreset.paymentStatus}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shrink-0">
                <Sparkles size={12} className="text-brand-orange" />
                <span>Otomatis</span>
              </div>
            </div>

            {/* Custom Note for Timeline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Catatan Linimasa (Dilihat Konsumen)
                </label>
                <span className="text-[11px] text-slate-400">Opsional</span>
              </div>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={`Contoh: ${currentPreset.desc}`}
                className="w-full text-xs font-medium text-slate-800 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-sm resize-none"
              />
              <p className="text-[10px] text-slate-400">
                Catatan ini akan langsung tampil secara real-time pada linimasa pelacakan pesanan di website konsumen.
              </p>
            </div>
          </div>

          {/* Sticky Footer Buttons */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex-1 sm:flex-initial text-center"
            >
              Batal
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-navyDark hover:bg-slate-900 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Menyimpan…" : "Simpan Status Baru"}</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
