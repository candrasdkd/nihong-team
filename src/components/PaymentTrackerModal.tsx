// src/components/PaymentTrackerModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { ExtendedOrder, OrderStatus } from "../types";
import { formatCurrency } from "../utils/format";
import { compute, toInputDate } from "../utils/helpers";
import { updateOrderPayment } from "../services/ordersFirebase";
import { Button } from "./ui/Button";

interface PaymentTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ExtendedOrder | null;
  unitPrice: number;
  customerPhone?: string;
  onPaymentUpdated?: () => void;
  showToast?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

const PAYMENT_METHODS = [
  "Transfer BCA",
  "Transfer Mandiri",
  "Transfer BNI",
  "Transfer BRI",
  "Cash / Tunai",
  "Jenius",
  "Wise",
  "GoPay / OVO / Dana",
  "Lainnya",
];

export function PaymentTrackerModal({
  isOpen,
  onClose,
  order,
  unitPrice,
  customerPhone,
  onPaymentUpdated,
  showToast,
}: PaymentTrackerModalProps) {
  const [activeTab, setActiveTab] = useState<"dp" | "pelunasan" | "whatsapp">("dp");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Financial calculations
  const calc = useMemo(() => {
    if (!order) return { totalPembayaran: 0, currency: "IDR", kg: 0 };
    return compute(order, unitPrice);
  }, [order, unitPrice]);

  const total = calc.totalPembayaran;
  const currency = calc.currency;

  // DP form state
  const [dpNominal, setDpNominal] = useState<number>(0);
  const [dpTanggal, setDpTanggal] = useState<string>(toInputDate(new Date()));
  const [dpMetode, setDpMetode] = useState<string>("Transfer BCA");
  const [dpCatatan, setDpCatatan] = useState<string>("");

  // Pelunasan form state
  const [pelunasanNominal, setPelunasanNominal] = useState<number>(0);
  const [pelunasanTanggal, setPelunasanTanggal] = useState<string>(toInputDate(new Date()));
  const [pelunasanMetode, setPelunasanMetode] = useState<string>("Transfer BCA");
  const [pelunasanCatatan, setPelunasanCatatan] = useState<string>("");

  // Sync state with order data when modal opens
  useEffect(() => {
    if (order) {
      const existingDp = Number(order.dpNominal || 0);
      const existingPelunasan = Number(order.pelunasanNominal || 0);
      setDpNominal(existingDp);
      setDpTanggal(order.dpTanggal || toInputDate(new Date()));
      setDpMetode(order.dpMetode || "Transfer BCA");
      setDpCatatan(order.dpCatatan || "");

      setPelunasanNominal(existingPelunasan);
      setPelunasanTanggal(order.pelunasanTanggal || toInputDate(new Date()));
      setPelunasanMetode(order.pelunasanMetode || "Transfer BCA");
      setPelunasanCatatan(order.pelunasanCatatan || "");

      // Auto-select tab based on order status
      if (order.status === "DP Terbayar" || order.status === "Selesai") {
        setActiveTab("pelunasan");
      } else {
        setActiveTab("dp");
      }
    }
  }, [order]);

  // Current balance calculations
  const totalPaid = Number(dpNominal || 0) + Number(pelunasanNominal || 0);
  const remainingBalance = Math.max(0, total - totalPaid);
  const percentPaid = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0;

  // Phone normalization for WhatsApp
  const cleanPhone = useMemo(() => {
    const raw = customerPhone || (order as any)?.telponPelanggan || (order as any)?.noTelpon || "";
    if (!raw) return "";
    let p = raw.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    if (!p.startsWith("62")) p = "62" + p;
    return p;
  }, [customerPhone, order]);

  // WhatsApp template messages
  const waTemplates = useMemo(() => {
    if (!order) return { dp: "", pelunasan: "", lunas: "" };
    const name = order.namaPelanggan || "Kak";
    const no = order.no || order.id;
    const remainingAfterDp = Math.max(0, total - Number(dpNominal || 0));

    const dpText = `Halo Kak ${name}, salam dari Tim *Nihong Jastip*! 🙏🇯🇵\n\nKami mengonfirmasi bahwa pembayaran *DP* untuk pesanan *#${no}* telah kami terima dengan rincian sbb:\n\n📦 *Barang:* ${order.namaBarang || "-"}\n📊 *Total Tagihan:* ${formatCurrency(total, currency)}\n💰 *DP Diterima:* *${formatCurrency(dpNominal, currency)}* (${dpMetode})\n⏳ *Sisa Pelunasan:* ${formatCurrency(remainingAfterDp, currency)}\n\nBarang titipan Kakak sedang dalam proses belanja handcarry oleh tim kami di Jepang. Kami akan update kembali saat barang tiba di Indonesia ya. Terima kasih banyak! ✨`;

    const pelunasanText = `Halo Kak ${name}, kabar gembira dari Tim *Nihong Jastip*! 📦🎉\n\nBarang titipan Kakak (*#${no}*) telah *tiba di Indonesia* dan siap dipacking untuk pengiriman lokal.\n\n📊 *Rincian Tagihan Pelunasan:*\n• Total Pesanan: ${formatCurrency(total, currency)}\n• DP yang Masuk: ${formatCurrency(dpNominal, currency)}\n• *Sisa Pelunasan: ${formatCurrency(remainingBalance > 0 ? remainingBalance : remainingAfterDp, currency)}*\n\nMohon konfirmasi transfer ke rekening Nihong Team agar paket Kakak dapat langsung kami proses kirim hari ini beserta nomor resinya. Terima kasih! 🙏✨`;

    const lunasText = `Halo Kak ${name}, terima kasih banyak dari Tim *Nihong Jastip*! 🌟\n\nPembayaran untuk pesanan *#${no}* telah *LUNAS SEPENUHNYA* (${formatCurrency(total, currency)}).\n\nPaket sedang kami siapkan untuk pengiriman ke alamat Kakak. Nomor resi pengiriman akan segera kami informasikan begitu paket di-pickup ekspedisi. Terima kasih atas kepercayaannya! 🚀📦`;

    return { dp: dpText, pelunasan: pelunasanText, lunas: lunasText };
  }, [order, total, currency, dpNominal, dpMetode, remainingBalance]);

  const [selectedWaTemplate, setSelectedWaTemplate] = useState<"dp" | "pelunasan" | "lunas">("dp");

  if (!isOpen || !order) return null;

  // Preset quick DP handler
  const handleQuickDp = (percentage: number) => {
    const val = Math.round(total * (percentage / 100));
    setDpNominal(val);
  };

  // Submit DP handler
  const handleSaveDp = async () => {
    if (!order.id) return;
    if (dpNominal <= 0) {
      showToast?.("Nominal DP harus lebih dari 0", "warning");
      return;
    }
    setLoading(true);
    try {
      const isFullyPaid = dpNominal >= total;
      const nextStatus: OrderStatus = isFullyPaid ? "Selesai" : "DP Terbayar";

      await updateOrderPayment(order.id, {
        status: nextStatus,
        dpNominal,
        dpTanggal,
        dpMetode,
        dpCatatan,
      });

      showToast?.(
        isFullyPaid
          ? "Pembayaran lunas berhasil disimpan!"
          : `DP sebesar ${formatCurrency(dpNominal, currency)} berhasil dicatat!`,
        "success"
      );
      onPaymentUpdated?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast?.(err?.message || "Gagal menyimpan DP", "error");
    } finally {
      setLoading(false);
    }
  };

  // Submit Pelunasan handler
  const handleSavePelunasan = async () => {
    if (!order.id) return;
    const amountToPay = pelunasanNominal > 0 ? pelunasanNominal : remainingBalance;
    if (amountToPay <= 0) {
      showToast?.("Nominal pelunasan tidak boleh 0", "warning");
      return;
    }

    setLoading(true);
    try {
      await updateOrderPayment(order.id, {
        status: "Selesai",
        pelunasanNominal: amountToPay,
        pelunasanTanggal,
        pelunasanMetode,
        pelunasanCatatan,
      });

      showToast?.(
        "Pelunasan berhasil dicatat! Status pesanan kini Selesai.",
        "success"
      );
      onPaymentUpdated?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast?.(err?.message || "Gagal menyimpan pelunasan", "error");
    } finally {
      setLoading(false);
    }
  };

  // Copy WA text
  const handleCopyWa = () => {
    const text = waTemplates[selectedWaTemplate];
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast?.("Template pesan WhatsApp disalin ke clipboard", "info");
  };

  // Open WA
  const handleOpenWa = () => {
    const text = waTemplates[selectedWaTemplate];
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />

          {/* Modal Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <CreditCard size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                    Catat Pembayaran
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    #{order.no}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {order.namaPelanggan} • {calc.kg} Kg
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* 1. Payment Progress Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Total Tagihan
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white tracking-wider">
                  Status: {order.status || "Belum Membayar"}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                  {formatCurrency(total, currency)}
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-300">
                    Sisa: {formatCurrency(remainingBalance, currency)}
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                  <span>Terbayar: {formatCurrency(totalPaid, currency)} ({percentPaid}%)</span>
                  <span>{percentPaid >= 100 ? "✅ Lunas 100%" : `${100 - percentPaid}% Belum`}</span>
                </div>
              </div>

              {/* Micro breakdown badges */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-400">DP:</span>
                  <span className="font-bold text-amber-300">
                    {order.dpNominal ? formatCurrency(order.dpNominal, currency) : "Belum ada"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-400">Pelunasan:</span>
                  <span className="font-bold text-emerald-300">
                    {order.pelunasanNominal ? formatCurrency(order.pelunasanNominal, currency) : "Belum ada"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Mode Tabs */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab("dp")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "dp"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🟡 Catat DP</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pelunasan")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "pelunasan"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🟢 Pelunasan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("whatsapp")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "whatsapp"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* 3. Tab Content: CATAT DP */}
            {activeTab === "dp" && (
              <div className="space-y-4">
                {/* Quick Presets */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                    Preset Cepat DP
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDp(50)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all ${
                        dpNominal === Math.round(total * 0.5) && dpNominal > 0
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-200"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      DP 50% ({formatCurrency(Math.round(total * 0.5), currency)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDp(30)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all ${
                        dpNominal === Math.round(total * 0.3) && dpNominal > 0
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-200"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      DP 30% ({formatCurrency(Math.round(total * 0.3), currency)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpNominal(total)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all ${
                        dpNominal === total && dpNominal > 0
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-200"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Lunas 100%
                    </button>
                  </div>
                </div>

                {/* Input Nominal DP */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nominal DP ({currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      {currency === "JPY" ? "¥" : "Rp"}
                    </span>
                    <input
                      type="number"
                      value={dpNominal || ""}
                      onChange={(e) => setDpNominal(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Terbilang: {formatCurrency(dpNominal, currency)}
                  </p>
                </div>

                {/* Tanggal & Metode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tanggal Bayar
                    </label>
                    <input
                      type="date"
                      value={dpTanggal}
                      onChange={(e) => setDpTanggal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Metode Pembayaran
                    </label>
                    <select
                      value={dpMetode}
                      onChange={(e) => setDpMetode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Catatan DP */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catatan / Referensi Transfer (Opsional)
                  </label>
                  <input
                    type="text"
                    value={dpCatatan}
                    onChange={(e) => setDpCatatan(e.target.value)}
                    placeholder="Misal: Bukti TF dari Kak Ani / Rek BCA"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveDp}
                    disabled={loading || dpNominal <= 0}
                    className="flex-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-200"
                  >
                    <Check size={15} />
                    <span>{loading ? "Menyimpan..." : "Simpan DP & Set Status"}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* 4. Tab Content: CATAT PELUNASAN */}
            {activeTab === "pelunasan" && (
              <div className="space-y-4">
                {/* Sisa Alert */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider block">
                      Sisa Tagihan yang Harus Dilunasi
                    </span>
                    <span className="text-xl font-black text-emerald-700">
                      {formatCurrency(remainingBalance, currency)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPelunasanNominal(remainingBalance)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700 shadow-sm"
                  >
                    Isi Sisa Penuh
                  </button>
                </div>

                {/* Input Pelunasan */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nominal Pelunasan ({currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      {currency === "JPY" ? "¥" : "Rp"}
                    </span>
                    <input
                      type="number"
                      value={pelunasanNominal || ""}
                      onChange={(e) => setPelunasanNominal(Number(e.target.value) || 0)}
                      placeholder={String(remainingBalance)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Terbilang: {formatCurrency(pelunasanNominal, currency)}
                  </p>
                </div>

                {/* Tanggal & Metode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tanggal Pelunasan
                    </label>
                    <input
                      type="date"
                      value={pelunasanTanggal}
                      onChange={(e) => setPelunasanTanggal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Metode Pembayaran
                    </label>
                    <select
                      value={pelunasanMetode}
                      onChange={(e) => setPelunasanMetode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Catatan Pelunasan */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catatan Pelunasan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={pelunasanCatatan}
                    onChange={(e) => setPelunasanCatatan(e.target.value)}
                    placeholder="Misal: Pelunasan via transfer BCA sesudah QC barang"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleSavePelunasan}
                    disabled={loading || (pelunasanNominal <= 0 && remainingBalance <= 0)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <CheckCircle2 size={15} />
                    <span>{loading ? "Menyimpan..." : "Set Lunas (Selesai)"}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* 5. Tab Content: WHATSAPP TEMPLATES */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                {/* Template Switcher */}
                <div className="flex gap-2 border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWaTemplate("dp")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedWaTemplate === "dp"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    1. Bukti Terima DP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWaTemplate("pelunasan")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedWaTemplate === "pelunasan"
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    2. Tagihan Pelunasan (Barang Tiba)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWaTemplate("lunas")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedWaTemplate === "lunas"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    3. Konfirmasi Lunas
                  </button>
                </div>

                {/* Message preview */}
                <div className="relative">
                  <textarea
                    readOnly
                    rows={8}
                    value={waTemplates[selectedWaTemplate]}
                    className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-800 leading-relaxed resize-none focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between items-center">
                    <span>Tujuan: {cleanPhone ? `+${cleanPhone}` : "(Nomor HP belum diisi)"}</span>
                    <span>Format resmi WhatsApp Nihong Jastip</span>
                  </div>
                </div>

                {/* WA Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyWa}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copied ? "Tersalin!" : "Salin Pesan"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWa}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <Send size={14} />
                    <span>Buka WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
