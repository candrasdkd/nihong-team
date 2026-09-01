// src/components/NihongStore/NihongStoreOrderDetailModal.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Package,
  Calendar,
  User,
  Phone,
  MapPin,
  Weight,
  MessageCircle,
  Plane,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Tag,
  ExternalLink,
  ClipboardList,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NihongStoreOrder } from "../../types";
import { formatDate, formatDateTime, formatIDR } from "../../utils/format";
import { generateShoppingListText } from "../../utils/nihongStoreExport";
import { Button } from "../ui/Button";

interface NihongStoreOrderDetailModalProps {
  isOpen: boolean;
  order: NihongStoreOrder | null;
  onClose: () => void;
  onOpenUpdateStatus: (order: NihongStoreOrder) => void;
  onOpenManageItems: (order: NihongStoreOrder) => void;
  onOpenAssign: (order: NihongStoreOrder) => void;
  onOpenWhatsApp: (order: NihongStoreOrder) => void;
  onShowToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function NihongStoreOrderDetailModal({
  isOpen,
  order,
  onClose,
  onOpenUpdateStatus,
  onOpenManageItems,
  onOpenAssign,
  onOpenWhatsApp,
  onShowToast,
}: NihongStoreOrderDetailModalProps) {
  const navigate = useNavigate();
  const [copiedNo, setCopiedNo] = useState(false);
  const [copiedList, setCopiedList] = useState(false);

  if (!isOpen || !order) return null;

  const isInbox = order.status === "inbox";
  const isAssigned = order.status === "assigned";
  const isRejected = order.status === "rejected";

  const totalItemCount = order.items.reduce((sum, it) => sum + (it.jumlah || 1), 0);
  const availableItems = order.items.filter((it) => it.status !== "Stok habis");
  const oosItems = order.items.filter((it) => it.status === "Stok habis");

  const handleCopyOrderNo = () => {
    navigator.clipboard.writeText(order.no);
    setCopiedNo(true);
    setTimeout(() => setCopiedNo(false), 2000);
  };

  const handleCopyShoppingList = () => {
    const text = generateShoppingListText([order]);
    navigator.clipboard.writeText(text);
    setCopiedList(true);
    onShowToast?.("Format daftar belanja jastiper berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedList(false), 2000);
  };

  const handleNavigateToPreOrders = () => {
    onClose();
    if (order.assignedScheduleId) {
      navigate(`/preorders?scheduleId=${order.assignedScheduleId}&q=${encodeURIComponent(order.namaPelanggan)}`);
    } else {
      navigate("/preorders");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* ── 1. Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-navyDark text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyOrderNo}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black font-mono transition-all group"
                  title="Klik untuk salin no order"
                >
                  <span>{order.no}</span>
                  {copiedNo ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} className="text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>

                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full select-none ${
                  isRejected
                    ? "bg-rose-100 text-rose-800"
                    : isAssigned
                    ? "bg-purple-100 text-purple-800"
                    : "bg-amber-100 text-amber-900"
                }`}>
                  {order.displayStatus || (isAssigned ? "Terjadwal" : isRejected ? "Dibatalkan" : "Menunggu Jadwal")}
                </span>

                {order.paymentStatus && (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {order.paymentStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Checkout pada {order.createdAt ? formatDateTime(order.createdAt) : "Baru saja"}
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

        {/* ── 2. Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
          {/* Customer & Address Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} />
                Informasi Pemesan
              </span>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 leading-snug">
                    {order.namaPelanggan}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {order.noTelponPelanggan || "Tidak ada no telepon"}
                  </p>
                </div>
                {order.noTelponPelanggan && (
                  <Button
                    type="button"
                    onClick={() => onOpenWhatsApp(order)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 shrink-0"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} />
                Alamat Pengiriman Lokal
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {order.alamatPelanggan || "Alamat pengiriman belum diisi oleh konsumen."}
              </p>
            </div>
          </div>

          {/* Assigned Schedule Link Banner */}
          {isAssigned && order.assignedScheduleRoute && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-950">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Plane size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">
                    Terjadwal di: {order.assignedScheduleRoute}
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium">
                    Keberangkatan: {order.assignedScheduleDate || "Sesuai Jadwal"}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleNavigateToPreOrders}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Buka di Pre-Order</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          )}

          {/* Summary Stat Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Titipan</span>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {order.items.length} item ({totalItemCount} pcs)
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimasi Berat</span>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {order.totalKg ? `${order.totalKg} Kg` : "0.5 Kg"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimasi Nilai IDR</span>
              <p className="text-sm font-black text-brand-orange mt-0.5 truncate">
                {order.totalEstimasiHargaIdr ? formatIDR(order.totalEstimasiHargaIdr) : "—"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Kondisi Stok</span>
              <p className={`text-xs font-black mt-1 ${oosItems.length > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {oosItems.length > 0 ? `${oosItems.length} Item Habis` : "Semua Ready"}
              </p>
            </div>
          </div>

          {/* ── 3. Product Items Detail List ── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-slate-400" />
                Rincian Barang Titipan ({order.items.length})
              </span>
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="text-xs font-bold text-slate-600 hover:text-brand-orange flex items-center gap-1 transition-colors"
              >
                {copiedList ? <Check size={13} className="text-emerald-600" /> : <ClipboardList size={13} />}
                <span>{copiedList ? "Tersalin!" : "Salin List Belanja"}</span>
              </button>
            </div>

            <div className="space-y-2">
              {order.items.map((it, idx) => {
                const isOos = it.status === "Stok habis";
                return (
                  <div
                    key={idx}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      isOos
                        ? "bg-slate-50/70 border-slate-200 opacity-75"
                        : "bg-white border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.namaBarang}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Package size={18} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-xs font-black leading-snug ${isOos ? "text-slate-500 line-through" : "text-slate-800"}`}>
                              {it.namaBarang}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium mt-0.5">
                              {it.kodeBarang && (
                                <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold text-slate-700">
                                  {it.kodeBarang}
                                </span>
                              )}
                              {it.warna && <span className="bg-slate-50 border border-slate-200/60 px-1.5 rounded">Warna: {it.warna}</span>}
                              {it.ukuran && <span className="bg-slate-50 border border-slate-200/60 px-1.5 rounded">Size: {it.ukuran}</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                              x{it.jumlah || 1}
                            </span>
                            {it.hargaIdr ? (
                              <p className="text-[11px] font-bold text-slate-600 mt-1">
                                {formatIDR(it.hargaIdr * (it.jumlah || 1))}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {it.catatan && (
                          <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/50 italic">
                            Catatan: {it.catatan}
                          </p>
                        )}

                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            <ExternalLink size={10} />
                            <span>Buka Link Produk Asli</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. Visual Timeline Tracking History ── */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" />
              Riwayat Linimasa Pesanan (Real-Time Timeline)
            </span>

            {(!order.timeline || order.timeline.length === 0) ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Belum ada catatan linimasa tersimpan untuk pesanan ini.
              </div>
            ) : (
              <div className="relative pl-5 sm:pl-6 space-y-4 before:absolute before:left-2 sm:before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {order.timeline.map((entry, tIdx) => {
                  const isLatest = tIdx === order.timeline!.length - 1;
                  return (
                    <div key={tIdx} className="relative group">
                      <div className={`absolute -left-5 sm:-left-6 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                        isLatest ? "border-brand-orange ring-4 ring-orange-100" : "border-slate-300"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? "bg-brand-orange" : "bg-slate-400"}`} />
                      </div>

                      <div className="bg-slate-50/80 group-hover:bg-slate-50 border border-slate-200/80 p-3 rounded-2xl transition-all space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-xs font-black ${isLatest ? "text-brand-orange" : "text-slate-800"}`}>
                            {entry.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {entry.at ? formatDateTime(entry.at) : "-"}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Sticky Action Footer ── */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold px-4 py-2.5 rounded-xl order-last sm:order-first"
          >
            Tutup
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenManageItems(order);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Layers size={13} className="text-amber-500" />
              <span>Kelola Stok</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpdateStatus(order);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={13} className="text-blue-600" />
              <span>Ubah Status</span>
            </button>

            {isInbox && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAssign(order);
                }}
                className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-brand-orange/20 flex items-center gap-1.5"
              >
                <Plane size={14} />
                <span>Assign Jadwal</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsApp(order);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
