import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/settingsContext";
import { Customer, ExtendedOrder } from "../types";
import { formatCurrency } from "../utils/format";
import { FlagID, FlagJP } from "../components/ui/Flags";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { OrderFormModal } from "../components/OrderFormModal";
import { InvoiceModal } from "../components/InvoiceModal";
import { useOrders } from "../hooks/useOrders";
import {
  compute,
  endOfMonth,
  formatAndAddYear,
  startOfMonth,
  toInputDate,
  openWhatsApp,
} from "../utils/helpers";
import { ORDER_STATUSES, FAB_COLOR_CLASS } from "../utils/constants";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Maximize2, ChevronLeft, ChevronRight, MessageCircle,
  Plus, FileText, ChevronDown, Search, Box, Trash2, Pencil,
  AlertCircle, CheckCircle2, Download, Scale, ShoppingBag, 
  DollarSign, TrendingUp, Wallet, ClipboardList, HelpCircle,
  ArrowUpDown
} from "lucide-react";
import { exportOrdersToExcel } from "../utils/exportExcel";
import { ConfirmModal } from "../components/ConfirmModal";

// ===== IMAGE PREVIEW MODAL =====
function ImagePreview({
  src,
  onClose,
  phone,
  customerName,
}: {
  src: string | string[] | null;
  onClose: () => void;
  phone?: string;
  customerName?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src]);

  // Close on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!src) return null;
  const images = Array.isArray(src) ? src : [src];
  if (images.length === 0) return null;

  const currentSrc = images[index];

  const handleShareWA = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validate & clean phone number
    const cleanPhone = phone ? phone.replace(/\D/g, "").replace(/^0/, "62") : "";
    const isValidPhone = cleanPhone.length >= 9;

    if (phone && !isValidPhone) {
      alert(`Nomor telepon "${phone}" tidak valid. Pastikan nomor HP customer sudah benar di data pelanggan.`);
      return;
    }

    // Build friendly message
    const firstName = customerName?.split(" ")[0] || "Kak";
    let text = `Halo ${firstName} 👋\n\n`;

    if (images.length > 1) {
      text += `Berikut foto produk pesanan kamu dari *Nihong Jastip* 📦\n\n`;
      images.forEach((url, i) => {
        text += `Foto ${i + 1}: ${url}\n`;
      });
    } else {
      text += `Berikut foto produk pesanan kamu dari *Nihong Jastip* 📦\n\n${currentSrc}\n`;
    }

    text += `\nTerima kasih sudah order ya! Kalau ada pertanyaan, feel free tanya kami 😊🙏`;

    const wa = isValidPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(wa, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {/* Overlay backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
      />

      {/* Content wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[101] flex flex-col items-center justify-center p-4 sm:p-6 pointer-events-none"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="pointer-events-auto absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/10 hover:bg-white/20 text-white p-2 sm:p-2.5 rounded-full transition-colors z-20 backdrop-blur-sm"
        >
          <X size={18} />
        </button>

        {/* Image */}
        <img
          src={currentSrc}
          alt="Preview"
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto max-w-full max-h-[75vh] sm:max-h-[80vh] w-auto h-auto object-contain rounded-xl sm:rounded-2xl shadow-2xl"
        />

        {/* Navigation */}
        {images.length > 1 && (
          <div className="pointer-events-auto flex items-center gap-4 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}
              className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-all backdrop-blur-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-white/80 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              {index + 1} / {images.length}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}
              className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-all backdrop-blur-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 mt-4">
          <button
            onClick={handleShareWA}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-colors shadow-lg"
          >
            <MessageCircle size={16} />
            {images.length > 1 ? `Kirim ${images.length} Foto ke ${customerName?.split(" ")[0] || "Customer"}` : `Kirim ke ${customerName?.split(" ")[0] || "Customer"}`}
          </button>
          {phone && (
            <span className="text-white/40 text-[10px]">
              {phone}
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


// ===== UI SUB-COMPONENTS =====

function StatusPill({ status }: { status: string }) {
  const isUnpaid = status === "Belum Membayar";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
        isUnpaid
          ? "bg-amber-50/70 text-amber-700 border-amber-200/50"
          : "bg-emerald-50/70 text-emerald-700 border-emerald-200/50"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isUnpaid ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
          </>
        ) : (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </>
        )}
      </span>
      {isUnpaid ? "Belum Bayar" : "Selesai"}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colors = [
    "from-blue-500 to-indigo-600 text-white shadow-blue-200/50",
    "from-indigo-500 to-purple-600 text-white shadow-indigo-200/50",
    "from-purple-500 to-pink-600 text-white shadow-purple-200/50",
    "from-violet-500 to-fuchsia-600 text-white shadow-violet-200/50",
  ];
  const colorIndex = name ? name.length % colors.length : 0;
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold bg-gradient-to-br ${colors[colorIndex]} shadow-sm shrink-0 border border-white/20`}
    >
      {initial}
    </div>
  );
}

// ===== TOAST COMPONENT =====
type ToastType = { message: string; type: "success" | "error"; id: number };

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastType[];
  removeToast: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-right-10 duration-300
            ${toast.type === "error" ? "bg-white border-red-200 text-red-700" : "bg-slate-900 text-white border-slate-800"}
          `}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className={`ml-4 p-1 rounded-full hover:bg-black/10 transition-colors`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ===== INLINE STAT CARD COMPONENT =====
interface MiniStatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  colorClass: string;
  index: number;
}

function MiniStatCard({ label, value, sub, icon: Icon, colorClass, index }: MiniStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-50 group-hover:bg-indigo-500/20 transition-all duration-350" />
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
          {label}
        </span>
        <span className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight block">
          {value}
        </span>
        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
          {sub}
        </span>
      </div>
      <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300`}>
        <Icon size={16} className="text-inherit" />
      </div>
    </motion.div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export function OrdersPage({
  customers,
  formTrigger = 0,
  onFormTriggerConsumed,
}: {
  customers: Customer[];
  formTrigger?: number;
  onFormTriggerConsumed?: () => void;
}) {
  const { unitPrice } = useSettings();
  const {
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    orders,
    limitValue,
    setLimitValue,
    renderLimit,
    setRenderLimit,
    loading,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    editing,
    setEditing,
    showForm,
    setShowForm,
    selectedIds,
    setSelectedIds,
    isPreviewOpen,
    setIsPreviewOpen,
    previewSrc,
    setPreviewSrc,
    previewPhone,
    setPreviewPhone,
    previewCustomerName,
    setPreviewCustomerName,
    selectedOrderDetail,
    setSelectedOrderDetail,
    confirmModal,
    setConfirmModal,
    showInvoice,
    setShowInvoice,
    expandedRows,
    setExpandedRows,
    toasts,
    setToasts,
    selectedOrders,
    sortedOrders,
    displayedOrders,
    metrics,
    openPreview,
    showToast,
    removeToast,
    handleDelete,
    handleInvoiceClick,
    handleSubmitOrder,
  } = useOrders({ customers, unitPrice });

  // Auto-open create form when triggered by SpeedDialFAB
  useEffect(() => {
    if (formTrigger > 0) {
      setEditing(null);
      setShowForm(true);
      onFormTriggerConsumed?.();
    }
  }, [formTrigger, onFormTriggerConsumed]);

  const handleShareAdminRekap = () => {
    const unpaidList = sortedOrders.filter((o) => o.status === "Belum Membayar");
    if (unpaidList.length === 0) {
      alert("Tidak ada pesanan belum bayar untuk direkap.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let message = `*REKAP JASTIP BELUM BAYAR* 📦\nTanggal: ${todayStr}\n\n`;
    let totalUnpaidAmount = 0;

    unpaidList.forEach((o, i) => {
      const d = compute(o, unitPrice);
      totalUnpaidAmount += d.totalPembayaran;
      const formattedPrice = formatCurrency(d.totalPembayaran, d.currency);
      message += `${i + 1}. *${o.namaPelanggan}* (${formatAndAddYear(o.tanggal)}) - ${formattedPrice} (${o.namaBarang})\n`;
    });

    message += `\n*Total Belum Bayar:* ${formatCurrency(totalUnpaidAmount, "IDR")}`;

    // Copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
      showToast("Rekap disalin ke clipboard!", "success");
    }).catch(() => {
      showToast("Gagal menyalin rekap", "error");
    });

    // Open WhatsApp Web/App (without specific phone)
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900 relative">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-8 shadow-xl border border-white/5"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-400/25 px-3 py-1 rounded-full text-xs font-bold text-blue-400 mb-3 backdrop-blur-sm">
                <Box size={12} />
                <span>Modul Manajemen Administrasi</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                Manajemen Pesanan 📦
              </h2>
              <p className="text-slate-400 mt-2 text-xs sm:text-sm max-w-xl leading-relaxed">
                Pantau pesanan pelanggan, verifikasi status pembayaran, hitung berat muatan kargo, dan cetak invoice jastip secara otomatis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 font-bold px-5 py-2.5 rounded-xl transition-all border border-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
              >
                <Plus className="w-4 h-4 mr-2 stroke-[3]" /> Buat Pesanan
              </Button>
              <Button
                variant="outline"
                onClick={() => exportOrdersToExcel(sortedOrders, unitPrice)}
                className="border-white/15 hover:bg-white/10 text-white font-bold bg-white/5 px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
              >
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Mini Stats Grid Terpadu ── */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 !mt-0 sm:!mt-6">
          <MiniStatCard
            label="Total Pesanan"
            value={metrics.totalOrders}
            sub="Pesanan terfilter"
            icon={ShoppingBag}
            colorClass="text-blue-600 bg-blue-50/70 border border-blue-100/50"
            index={0}
          />
          <MiniStatCard
            label="Total Berat"
            value={`${metrics.totalKg} Kg`}
            sub="Total kargo terisi"
            icon={Scale}
            colorClass="text-purple-600 bg-purple-50/70 border border-purple-100/50"
            index={1}
          />
          <MiniStatCard
            label="Belum Lunas"
            value={metrics.unpaidCount}
            sub={`${metrics.unpaidPercent}% dari total`}
            icon={AlertCircle}
            colorClass="text-amber-600 bg-amber-50/70 border border-amber-100/50"
            index={2}
          />
          <MiniStatCard
            label="Selesai"
            value={metrics.paidCount}
            sub={`${metrics.paidPercent}% lunas total`}
            icon={CheckCircle2}
            colorClass="text-emerald-600 bg-emerald-50/70 border border-emerald-100/50"
            index={3}
          />
        </div>

        {/* ── Toolbar & Filters ── */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 shadow-sm space-y-4 !mt-0 sm:!mt-6">
          
          {/* Main Search & Status Filters */}
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 stroke-[2.5]" />
              <Input
                placeholder="Cari pelanggan, nomor order, barang..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border-0 bg-slate-50 focus:bg-white ring-1 ring-slate-200/60 focus:ring-2 focus:ring-blue-500 focus:shadow-md focus:shadow-blue-50 rounded-xl transition-all font-semibold text-xs sm:text-sm text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Status modern tab melayang */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/20 max-w-full overflow-x-auto shrink-0">
              <button
                onClick={() => setStatusFilter("")}
                className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${statusFilter === "" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Semua
              </button>
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${statusFilter === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {s === "Belum Membayar" ? "Belum Bayar" : "Selesai"}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Sort row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100/50">
            {/* Filter Tanggal */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/40">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg border-0 !text-[11px] sm:!text-xs font-bold text-slate-600 bg-white shadow-xs focus:ring-2 focus:ring-blue-500 outline-none text-center"
                title="Dari Tanggal"
              />
              <span className="text-slate-400 text-[10px] font-extrabold px-1">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg border-0 !text-[11px] sm:!text-xs font-bold text-slate-600 bg-white shadow-xs focus:ring-2 focus:ring-blue-500 outline-none text-center"
                title="Sampai Tanggal"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/40">
              <ArrowUpDown size={13} className="text-slate-400 stroke-[2.5] ml-1.5" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order as "asc" | "desc");
                }}
                className="flex-1 bg-transparent border-0 !text-[11px] sm:!text-xs font-bold text-slate-600 outline-none cursor-pointer focus:ring-0 py-1"
              >
                <option value="tanggal-desc">Terbaru (Tanggal ↓)</option>
                <option value="tanggal-asc">Terlama (Tanggal ↑)</option>
                <option value="keuntungan-desc">Profit Terbesar (Profit ↓)</option>
                <option value="keuntungan-asc">Profit Terkecil (Profit ↑)</option>
                <option value="namaPelanggan-asc">Nama Pelanggan (A-Z)</option>
                <option value="namaPelanggan-desc">Nama Pelanggan (Z-A)</option>
                <option value="totalPembayaran-desc">Tagihan Terbesar</option>
                <option value="totalPembayaran-asc">Tagihan Terkecil</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Desktop Table View ── */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-extrabold">
                <tr>
                  <th className="px-6 py-4 w-4">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={
                        sortedOrders.length > 0 &&
                        selectedIds.length === sortedOrders.length
                      }
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked ? sortedOrders.map((o) => o.id || "") : [],
                        )
                      }
                    />
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none group"
                    onClick={() => {
                      if (sortBy === "namaPelanggan") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("namaPelanggan");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Pelanggan</span>
                      <ArrowUpDown size={11} className={`transition-opacity duration-200 ${sortBy === "namaPelanggan" ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-50"}`} />
                    </div>
                  </th>
                  <th className="px-6 py-4">Detail Barang</th>
                  <th className="px-6 py-4">Status</th>
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:text-slate-700 select-none group"
                    onClick={() => {
                      if (sortBy === "totalPembayaran") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("totalPembayaran");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Tagihan</span>
                      <ArrowUpDown size={11} className={`transition-opacity duration-200 ${sortBy === "totalPembayaran" ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-50"}`} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:text-slate-700 select-none group"
                    onClick={() => {
                      if (sortBy === "keuntungan") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("keuntungan");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Profit</span>
                      <ArrowUpDown size={11} className={`transition-opacity duration-200 ${sortBy === "keuntungan" ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-50"}`} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Foto</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-slate-50 p-4 rounded-2xl mb-3 border border-slate-100">
                          <Box className="w-8 h-8 opacity-40 text-slate-500" />
                        </div>
                        <p className="font-bold text-slate-500 text-sm">Tidak ada pesanan ditemukan.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan filter pencarian atau tanggal Anda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((o) => (
                    <ExpandableRow
                      key={o.id || ""}
                      order={o}
                      unitPrice={unitPrice}
                      isExpanded={expandedRows.has(o.id || "")}
                      isSelected={selectedIds.includes(o.id || "")}
                      onToggleExpand={() =>
                        setExpandedRows((prev) => {
                          const n = new Set(prev);
                          const id = o.id || "";
                          n.has(id) ? n.delete(id) : n.add(id);
                          return n;
                        })
                      }
                      onToggleSelect={() =>
                        setSelectedIds((prev) => {
                          const id = o.id || "";
                          return prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id];
                        })
                      }
                      onEdit={() => {
                        setEditing(o);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDelete(o.id || "")}
                      onPreview={(src: string | string[]) => {
                        const cust = customers.find(c => c.nama === o.namaPelanggan);
                        openPreview(src, cust?.telpon, o.namaPelanggan);
                      }}
                      onShowDetail={() => setSelectedOrderDetail(o)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Mobile Card View ── */}
        <div className="sm:hidden space-y-4">
          {displayedOrders.map((o) => (
            <MobileCard
              key={o.id || ""}
              order={o}
              unitPrice={unitPrice}
              isSelected={selectedIds.includes(o.id || "")}
              onToggleSelect={() =>
                setSelectedIds((prev) => {
                  const id = o.id || "";
                  return prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id];
                })
              }
              onEdit={() => {
                setEditing(o);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(o.id || "")}
              onPreview={(src: string | string[]) => {
                const cust = customers.find(c => c.nama === o.namaPelanggan);
                openPreview(src, cust?.telpon, o.namaPelanggan);
              }}
              onShowDetail={() => setSelectedOrderDetail(o)}
            />
          ))}
          {displayedOrders.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-block bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3">
                <Box className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm font-semibold">Tidak ada pesanan.</p>
            </div>
          )}
        </div>

        {/* Fallback "Muat Lebih Banyak" Button */}
        {((q.trim() !== "" || sortBy !== "tanggal") ? renderLimit < sortedOrders.length : orders.length >= limitValue) && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => {
                const isSearching = q.trim() !== "";
                const isSortingNonDate = sortBy !== "tanggal";
                if (isSearching || isSortingNonDate) {
                  setRenderLimit((prev) => prev + 50);
                } else {
                  setLimitValue((prev) => prev + 50);
                }
              }}
              disabled={loading}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                  <span>Memuat...</span>
                </>
              ) : (
                <span>Muat Lebih Banyak</span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <OrderFormModal
          customers={customers}
          initial={editing || undefined}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitOrder}
          existing={orders}
          unitPrice={unitPrice}
        />
      )}

      {isPreviewOpen && (
        <ImagePreview
          src={previewSrc}
          phone={previewPhone}
          customerName={previewCustomerName}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewSrc(null);
            setPreviewPhone(undefined);
            setPreviewCustomerName(undefined);
          }}
        />
      )}

      {showInvoice.show && showInvoice.order && (
        <InvoiceModal
          order={showInvoice.order}
          orders={orders}
          itemIds={showInvoice.itemIds}
          customer={customers.find(
            (c) => c.nama === showInvoice.order!.namaPelanggan,
          )}
          onClose={() => setShowInvoice({ show: false })}
          unitPrice={unitPrice}
        />
      )}

      {selectedOrderDetail && (
        <OrderDetailModal
          order={selectedOrderDetail}
          unitPrice={unitPrice}
          customers={customers}
          onClose={() => setSelectedOrderDetail(null)}
          onEdit={() => {
            setEditing(selectedOrderDetail);
            setShowForm(true);
            setSelectedOrderDetail(null);
          }}
          onDelete={() => {
            const id = selectedOrderDetail.id || "";
            setSelectedOrderDetail(null);
            handleDelete(id);
          }}
          onInvoice={() => {
            setShowInvoice({
              show: true,
              order: selectedOrderDetail,
              itemIds: [selectedOrderDetail.id || ""],
            });
            setSelectedOrderDetail(null);
          }}
          onPreview={(src: string | string[]) => {
            const cust = customers.find(c => c.nama === selectedOrderDetail.namaPelanggan);
            openPreview(src, cust?.telpon, selectedOrderDetail.namaPelanggan);
          }}
        />
      )}

      {/* ── Global Floating Action Bar for Selections (Desktop & Mobile) ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-[90vw] flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-6 text-white min-w-[320px] sm:min-w-[480px] w-full sm:w-auto"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-500/20 shrink-0">
                  {selectedIds.length}
                </div>
                <span className="text-xs font-bold text-slate-300">Pesanan terpilih</span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleInvoiceClick}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
                >
                  <FileText size={13} />
                  <span>Buat Invoice</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile FAB (Create Order) */}
      <button
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Floating Share Rekap Admin Button */}
      <AnimatePresence>
        {statusFilter === "Belum Membayar" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={handleShareAdminRekap}
            className="fixed right-6 z-40 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-emerald-500/50 cursor-pointer bottom-36 sm:bottom-6"
            title="Share Rekap Admin ke WA"
          >
            <MessageCircle className="w-6 h-6 stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            type={confirmModal.type}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== ROW COMPONENTS =====

function ExpandableRow({
  order,
  unitPrice,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  onPreview,
  onShowDetail,
}: any) {
  const d = compute(order, unitPrice);

  return (
    <>
      <tr
        onClick={onShowDetail}
        className={`group transition-all duration-200 border-l-4 cursor-pointer ${
          isSelected 
            ? "bg-blue-50/30 border-l-blue-500" 
            : "hover:bg-slate-50 border-l-transparent"
        }`}
      >
        <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </td>
        
        {/* Kolom Pelanggan */}
        <td className="px-6 py-4 align-middle">
          <div className="flex items-center gap-3">
            <Avatar name={order.namaPelanggan || ""} />
            <div>
              <div className="font-extrabold text-slate-800 text-xs sm:text-sm">
                {order.namaPelanggan}
              </div>
              <div className="text-[9px] text-slate-400 font-extrabold font-mono mt-0.5 uppercase tracking-wider">
                #{order.no}
              </div>
            </div>
          </div>
        </td>
        
        {/* Kolom Detail Barang */}
        <td className="px-6 py-4 align-middle">
          <div
            className="text-slate-700 font-bold text-xs sm:text-sm line-clamp-1 max-w-[250px]"
            title={order.namaBarang}
          >
            {order.namaBarang}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-2">
            <span>{formatAndAddYear(order.tanggal)}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-extrabold text-slate-500">{d.kg} Kg</span>
          </div>
        </td>
        
        {/* Status */}
        <td className="px-6 py-4 align-middle">
          <StatusPill status={String(order.status)} />
        </td>
        
        {/* Tagihan */}
        <td className="px-6 py-4 align-middle text-right font-black text-slate-800 text-xs sm:text-sm">
          <div className="flex items-center justify-end gap-1.5">
            {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
            <span>{formatCurrency(d.totalPembayaran, d.currency)}</span>
          </div>
        </td>
        
        {/* Profit */}
        <td className="px-6 py-4 align-middle text-right font-black text-emerald-600 text-xs sm:text-sm">
          <div className="flex items-center justify-end gap-1.5">
            {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
            <span>{formatCurrency(d.totalKeuntungan, d.currency)}</span>
          </div>
        </td>
        
        {/* Foto Thumbnail */}
        <td className="px-6 py-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
          {order.imageUrl && (!Array.isArray(order.imageUrl) || order.imageUrl.length > 0) ? (
            <button
              onClick={() => onPreview(order.imageUrl!)}
              className="relative group/img w-9 h-9 rounded-xl overflow-hidden border border-slate-200/80 inline-flex items-center justify-center align-middle shadow-sm bg-slate-50 hover:border-blue-500/50 transition-colors"
            >
              <img
                src={Array.isArray(order.imageUrl) ? order.imageUrl[0] : order.imageUrl}
                className="w-full h-full object-cover group-hover/img:scale-115 transition-transform duration-350"
                alt=""
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Maximize2 size={10} className="text-white stroke-[2.5]" />
                {Array.isArray(order.imageUrl) && order.imageUrl.length > 1 && (
                  <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[7px] px-1 rounded-tl-md font-extrabold leading-none py-0.5">
                    +{order.imageUrl.length - 1}
                  </span>
                )}
              </div>
            </button>
          ) : (
            <span className="text-xs font-extrabold text-slate-300">-</span>
          )}
        </td>
        
        {/* Aksi */}
        <td className="px-6 py-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center items-center gap-1 transition-all duration-200">
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Edit"
            >
              <Pencil size={14} className="stroke-[2.5]" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Hapus"
            >
              <Trash2 size={14} className="stroke-[2.5]" />
            </button>
            <button
              onClick={onToggleExpand}
              className={`p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200 ${
                isExpanded ? "rotate-180 text-slate-700 bg-slate-100" : ""
              }`}
              title="Detail Manifest"
            >
              <ChevronDown size={14} className="stroke-[2.5]" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Details – SaaS Order Manifest Block */}
      {isExpanded && (
        <tr className="bg-slate-50/50 shadow-inner" onClick={(e) => e.stopPropagation()}>
          <td colSpan={8} className="px-6 py-4">
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 pl-6 pr-2 border-l-2 border-slate-200 ml-4"
            >
              {/* Kolom Logistik & Rute (3 Kolom) */}
              <div className="md:col-span-3 space-y-3.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <Scale size={11} className="text-slate-400 shrink-0" />
                  <span>Logistik & Rute</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Rute Pengiriman</span>
                    <span className="text-xs font-bold text-slate-700">{order.pengiriman || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Kargo Terisi</span>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md inline-block mt-0.5">{d.kg} Kg (Ceil)</span>
                  </div>
                </div>
              </div>

              {/* Kolom Struktur Biaya (6 Kolom) */}
              <div className="md:col-span-6 space-y-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <DollarSign size={11} className="text-slate-400 shrink-0" />
                  <span>Rincian Struktur Biaya</span>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-white/70 backdrop-blur-sm border border-slate-100 p-3 rounded-xl shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Base Jastip</span>
                    <span className="text-xs font-bold text-slate-600">
                      {formatCurrency(d.baseJastip, d.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Markup Jastip</span>
                    <span className="text-xs font-extrabold text-emerald-600">
                      +{formatCurrency(d.jastipMarkup, d.currency)}
                    </span>
                  </div>
                  <div className="border-t border-slate-100/70 pt-2 col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Base Ongkir</span>
                      <span className="text-xs font-bold text-slate-600">
                        {formatCurrency(d.baseOngkir, d.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Markup Ongkir</span>
                      <span className="text-xs font-extrabold text-emerald-600">
                        +{formatCurrency(d.ongkirMarkup, d.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolom Catatan Admin (3 Kolom) */}
              <div className="md:col-span-3 space-y-3.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <ClipboardList size={11} className="text-slate-400 shrink-0" />
                  <span>Catatan Khusus</span>
                </div>
                <div className="bg-yellow-50/50 border border-yellow-100/60 p-3.5 rounded-xl text-[11px] font-semibold text-amber-800 leading-relaxed italic shadow-xs">
                  "{order.catatan || "Tidak ada catatan khusus untuk pesanan ini."}"
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}

function MobileCard({
  order,
  unitPrice,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onPreview,
  onShowDetail,
}: any) {
  const d = compute(order, unitPrice);
  const hasImg = order.imageUrl && (!Array.isArray(order.imageUrl) || order.imageUrl.length > 0);
  
  return (
    <div
      onClick={onShowDetail}
      className={`bg-white rounded-xl p-3 border shadow-xs transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
        isSelected ? "border-blue-500 ring-2 ring-blue-500/5 bg-blue-50/10" : "border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="rounded w-4 h-4 border-slate-300 text-blue-600 cursor-pointer shrink-0 focus:ring-blue-500"
        />

        {/* Thumbnail Image */}
        {hasImg ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(order.imageUrl!); }}
            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200/60 shrink-0 relative bg-slate-50"
          >
            <img
              src={Array.isArray(order.imageUrl) ? order.imageUrl[0] : order.imageUrl}
              className="w-full h-full object-cover"
              alt=""
            />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/40">
            <Box size={14} />
          </div>
        )}

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="font-extrabold text-slate-800 text-xs truncate block">
            {order.namaPelanggan}
          </span>
          
          <div className="text-[10px] text-slate-500 font-medium truncate">
            {order.namaBarang}
          </div>

          <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
            <span className="text-blue-600 font-extrabold">{d.kg} Kg</span>
            <span>&bull;</span>
            <span>{formatAndAddYear(order.tanggal)}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Status, Price, Profit, and Actions */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
        <StatusPill status={order.status} />

        <div className="my-1 text-right">
          <div className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
            {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
            <span>{formatCurrency(d.totalPembayaran, d.currency)}</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
            <span>Profit:</span>
            <span>{formatCurrency(d.totalKeuntungan, d.currency)}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Pencil size={12} className="stroke-[2.5]" />
          </button>
          <button
            onClick={onDelete}
            className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors"
            title="Hapus"
          >
            <Trash2 size={12} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== ORDER DETAIL MODAL =====

interface OrderDetailModalProps {
  order: ExtendedOrder;
  unitPrice: number;
  customers: Customer[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
  onPreview: (src: string | string[]) => void;
}

function OrderDetailModal({
  order,
  unitPrice,
  customers,
  onClose,
  onEdit,
  onDelete,
  onInvoice,
  onPreview,
}: OrderDetailModalProps) {
  const d = compute(order, unitPrice);
  const cust = customers.find((c) => c.nama === order.namaPelanggan);
  const phone = cust?.telpon;

  // Listen to ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleWhatsAppChat = () => {
    const firstName = order.namaPelanggan.split(" ")[0] || "Kak";
    const formattedPrice = formatCurrency(d.totalPembayaran, d.currency);
    const statusStr = order.status === "Belum Membayar" ? "belum lunas" : "lunas";
    const message = `Halo ${firstName} 👋\n\nKami ingin mengonfirmasi pesanan kamu dari *Nihong Jastip*:\n\n` +
      `📦 *Nomor Order:* #${order.no}\n` +
      `🛍️ *Barang:* ${order.namaBarang}\n` +
      `⚖️ *Berat:* ${d.kg} Kg\n` +
      `📍 *Rute:* ${order.pengiriman || "-"}\n` +
      `💳 *Total Tagihan:* ${formattedPrice} (${statusStr.toUpperCase()})\n\n` +
      `Terima kasih banyak ya! Jika ada pertanyaan, hubungi kami saja 😊🙏`;
    openWhatsApp(phone, message);
  };

  const hasImg = order.imageUrl && (!Array.isArray(order.imageUrl) || order.imageUrl.length > 0);
  const images = hasImg 
    ? (Array.isArray(order.imageUrl) 
        ? order.imageUrl.filter((x): x is string => !!x) 
        : [order.imageUrl].filter((x): x is string => !!x)) 
    : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh]"
        >
          {/* Top accent border */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          {/* Modal Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <Avatar name={order.namaPelanggan || ""} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 leading-none">
                    {order.namaPelanggan}
                  </h3>
                  <StatusPill status={order.status || "Belum Membayar"} />
                </div>
                <div className="text-[10px] text-slate-400 font-extrabold font-mono mt-1.5 uppercase tracking-wider">
                  Order ID: #{order.no}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-850">
            {/* 1. General Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                  Rute Pengiriman
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs sm:text-sm">
                  <TrendingUp size={14} className="text-slate-500 shrink-0" />
                  <span>{order.pengiriman || "-"}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                  Berat Kargo
                </span>
                <div className="flex items-center gap-1.5 font-extrabold text-blue-600 text-xs sm:text-sm">
                  <Scale size={14} className="text-blue-500 shrink-0" />
                  <span>{d.kg} Kg (Ceil)</span>
                </div>
              </div>
            </div>

            {/* 2. Nama Barang & Tanggal */}
            <div className="bg-slate-50/50 border border-slate-100/70 p-4 rounded-2xl space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                Nama / Detail Barang
              </span>
              <div className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                {order.namaBarang}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                Tanggal Pemesanan: {formatAndAddYear(order.tanggal)}
              </div>
            </div>

            {/* 3. Financial Summary Grid */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Struktur Keuangan & Profit
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Billing Card */}
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest mb-0.5">
                      Total Tagihan Pelanggan
                    </span>
                    <span className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
                      {formatCurrency(d.totalPembayaran, d.currency)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                    <Wallet size={18} />
                  </div>
                </div>

                {/* Profit Card */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/10 border border-emerald-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-emerald-600 font-bold block uppercase tracking-widest mb-0.5">
                      Keuntungan Bersih (Profit)
                    </span>
                    <span className="text-lg font-black text-emerald-600 tracking-tight flex items-center gap-1.5">
                      {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
                      {formatCurrency(d.totalKeuntungan, d.currency)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>

              {/* Breakdown Detail */}
              <div className="bg-slate-50/30 border border-slate-100 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Base Jastip</span>
                    <span className="font-bold text-slate-700">
                      {formatCurrency(d.baseJastip, d.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Markup Jastip</span>
                    <span className="font-bold text-emerald-600 flex items-center">
                      +{formatCurrency(d.jastipMarkup, d.currency)}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100" />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Base Ongkir ({d.kg} Kg x {formatCurrency(unitPrice)})</span>
                    <span className="font-bold text-slate-700">
                      {formatCurrency(d.baseOngkir, d.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Markup Ongkir</span>
                    <span className="font-bold text-emerald-600 flex items-center">
                      +{formatCurrency(d.ongkirMarkup, d.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Notes Section */}
            {order.catatan && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Catatan Khusus
                </h4>
                <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-2xl text-xs font-semibold text-amber-800 leading-relaxed italic">
                  "{order.catatan}"
                </div>
              </div>
            )}

            {/* 5. Attachments Gallery */}
            {images.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Foto Lampiran Produk ({images.length})
                </h4>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => onPreview(img)}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 hover:border-indigo-500/50 transition-colors shadow-sm group"
                    >
                      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 size={12} className="text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
            {/* Delete button (danger action) */}
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200 active:scale-95"
              title="Hapus Pesanan"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Hapus</span>
            </button>

            {/* Main Action cluster */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
              {phone && (
                <button
                  onClick={handleWhatsAppChat}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 active:scale-95"
                >
                  <MessageCircle size={14} />
                  <span>Kirim WA</span>
                </button>
              )}
              
              <button
                onClick={onInvoice}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <FileText size={14} />
                <span>Invoice</span>
              </button>

              <button
                onClick={onEdit}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 active:scale-95"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
