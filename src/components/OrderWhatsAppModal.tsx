import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  CreditCard,
  PackageCheck,
  Truck,
  Edit3,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { Customer, ExtendedOrder } from "../types";
import { formatCurrency, formatIDR } from "../utils/format";
import { compute } from "../utils/helpers";
import { getPaymentSummary } from "../utils/payment";
import { normalizeWhatsAppPhone } from "../utils/whatsapp";
import { Button } from "./ui/Button";

interface OrderWhatsAppModalProps {
  isOpen: boolean;
  order: ExtendedOrder | null;
  customer?: Customer | null;
  unitPrice: number;
  onClose: () => void;
  onOpenFullTemplates?: (phone: string, name: string) => void;
}

type OrderTemplateType = "summary" | "dp" | "settlement" | "tracking" | "custom";

export function OrderWhatsAppModal({
  isOpen,
  order,
  customer,
  unitPrice,
  onClose,
  onOpenFullTemplates,
}: OrderWhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<OrderTemplateType>("summary");
  const [messageText, setMessageText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>("");

  // Sync phone when order or customer changes
  useEffect(() => {
    if (customer?.telpon) {
      setPhone(customer.telpon);
    } else {
      setPhone("");
    }
  }, [customer, order]);

  const cleanPhone = useMemo(() => normalizeWhatsAppPhone(phone), [phone]);

  const d = useMemo(() => {
    if (!order) return null;
    return compute(order, unitPrice);
  }, [order, unitPrice]);

  const payment = useMemo(() => {
    if (!order || !d) return null;
    return getPaymentSummary(order, d.totalPembayaran);
  }, [order, d]);

  // Generate templates for this order
  const templates = useMemo(() => {
    if (!order || !d) {
      return {
        summary: "",
        dp: "",
        settlement: "",
        tracking: "",
        custom: "",
      };
    }

    const customerName = order.namaPelanggan || customer?.nama || "Kak";
    const firstName = customerName.split(" ")[0] || "Kak";
    const orderNo = order.no || order.id || "-";
    const formattedTotal = formatCurrency(d.totalPembayaran, d.currency);
    const halfTotal = Math.round(d.totalPembayaran * 0.5);
    const dpNominal = order.dpNominal ?? halfTotal;
    const formattedDp = formatCurrency(dpNominal, d.currency);
    const sisa = Math.max(0, d.totalPembayaran - (order.dpNominal || 0));
    const formattedSisa = formatCurrency(sisa, d.currency);

    const statusStr =
      order.status === "Belum Membayar"
        ? "Belum Bayar"
        : order.status === "DP Terbayar"
        ? "DP Terbayar"
        : "Lunas";

    const address =
      customer?.alamatPengirimanIndonesia?.alamatPenerima ||
      customer?.alamat ||
      "";

    // 1. Rincian / Konfirmasi Order
    const summaryText = `Halo Kak ${firstName} 👋\n\nKami dari *Nihong Jastip* ingin mengonfirmasikan pesanan Kakak:\n\n` +
      `📦 *No. Order:* #${orderNo}\n` +
      `🛍️ *Barang:* ${order.namaBarang}\n` +
      `⚖️ *Berat:* ${d.kg} Kg\n` +
      `📍 *Pengiriman:* ${order.pengiriman || "-"}\n` +
      `💳 *Total Tagihan:* *${formattedTotal}* (${statusStr})\n\n` +
      `Jika ada yang ingin ditanyakan, silakan balas pesan ini ya Kak. Terima kasih! 😊🙏`;

    // 2. Tagihan DP 50%
    const dpText = `Halo Kak ${firstName}, salam dari Tim *Nihong Jastip*! 🙏🇯🇵\n\n` +
      `Berikut rincian tagihan pesanan #${orderNo}:\n` +
      `🛍️ *Barang:* ${order.namaBarang}\n` +
      `📊 *Total Estimasi:* ${formattedTotal}\n` +
      `💰 *DP 50% untuk Booking Belanja:* *${formattedDp}*\n\n` +
      `Pembayaran dapat ditransfer ke:\n` +
      `*BCA:* 0800826764\n` +
      `*MANDIRI:* 700012366782\n` +
      `a.n *DIN MIZWAR ULYA SYEKH KHODIR*\n\n` +
      `Mohon kirimkan bukti transfer jika sudah melakukan pembayaran agar pesanan Kakak langsung dijadwalkan belanja oleh tim di Jepang ya. Terima kasih! ✨`;

    // 3. Pelunasan Barang Tiba
    const settlementText = `Halo Kak ${firstName}, kabar gembira dari Tim *Nihong Jastip*! 📦🎉\n\n` +
      `Barang titipan Kakak (*#${orderNo}* - ${order.namaBarang}) telah *tiba di Indonesia* dalam kondisi baik dan aman.\n\n` +
      `📊 *Rincian Pelunasan:*\n` +
      `• Sisa Pelunasan: *${formattedSisa}*\n` +
      `• Alamat Penerima: ${address || "(Mohon konfirmasi alamat lengkap & nomor HP)"}\n\n` +
      `Setelah pelunasan terkonfirmasi, paket akan segera kami serahkan ke pihak ekspedisi kurir lokal. Terima kasih banyak Kak! 🙏✨`;

    // 4. Nomor Resi Pengiriman
    const trackingText = `Halo Kak ${firstName}! 🚚📦\n\n` +
      `Paket pesanan titipan Kakak (*#${orderNo}* - ${order.namaBarang}) sudah kami serahkan ke kurir ekspedisi pengiriman lokal.\n\n` +
      `📍 *Ekspedisi:* [JNE / J&T / SiCepat / Lion Parcel]\n` +
      `🔖 *Nomor Resi:* [Masukkan nomor resi]\n\n` +
      `Status pengiriman dapat dicek secara berkala di web atau aplikasi ekspedisi terkait. Terima kasih banyak sudah berbelanja titip di Nihong Jastip! 🥰🙏`;

    // 5. Kustom
    const customText = `Halo Kak ${firstName}, kami dari Tim *Nihong Jastip* terkait pesanan #${orderNo} (${order.namaBarang}):\n\n`;

    return {
      summary: summaryText,
      dp: dpText,
      settlement: settlementText,
      tracking: trackingText,
      custom: customText,
    };
  }, [order, customer, d]);

  // Update text whenever template selection changes
  useEffect(() => {
    if (templates[selectedTemplate]) {
      setMessageText(templates[selectedTemplate]);
    }
  }, [selectedTemplate, templates]);

  if (!isOpen || !order) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSendWA = () => {
    const recipientUrl = cleanPhone ? `/${cleanPhone}` : "/";
    const url = `https://wa.me${recipientUrl}?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const TEMPLATE_OPTIONS: Array<{
    id: OrderTemplateType;
    label: string;
    icon: any;
    desc: string;
  }> = [
    {
      id: "summary",
      label: "Konfirmasi & Rincian",
      icon: ClipboardList,
      desc: "Rincian barang, nomor order, berat, & total tagihan",
    },
    {
      id: "dp",
      label: "Tagihan DP 50%",
      icon: CreditCard,
      desc: "Nominal DP booking & nomor rekening bank",
    },
    {
      id: "settlement",
      label: "Barang Tiba & Pelunasan",
      icon: PackageCheck,
      desc: "Info barang mendarat di Indo & sisa tagihan",
    },
    {
      id: "tracking",
      label: "Resi Pengiriman",
      icon: Truck,
      desc: "Pemberitahuan nomor resi kurir lokal",
    },
    {
      id: "custom",
      label: "Pesan Kustom",
      icon: Edit3,
      desc: "Format teks ringkas yang bebas diedit",
    },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[92vh] sm:max-h-[88vh] flex flex-col"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">
                Template Chat WhatsApp Pesanan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
                <span className="font-bold text-slate-700">{order.namaPelanggan}</span>
                <span>•</span>
                <span className="font-mono text-emerald-700 font-bold">#{order.no}</span>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
          {/* Nomor Telepon Input */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Nomor WhatsApp Tujuan
            </label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {cleanPhone && (
                <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl">
                  ✓ Valid ({cleanPhone})
                </span>
              )}
            </div>
          </div>

          {/* Template Chips / Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              Pilih Jenis Pesan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs text-emerald-950 font-bold"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 mt-0.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold leading-tight truncate">
                        {tpl.label}
                      </span>
                      <span className="hidden sm:block text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Isi Pesan WhatsApp
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full text-sm font-sans text-slate-800 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner resize-y leading-relaxed font-mono"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>* Mendukung teks tebal (*tebal*) & miring (_miring_).</span>
              <span>{messageText.length} karakter</span>
            </div>
          </div>

          {/* Shortcut to Full Templates Page */}
          {onOpenFullTemplates && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullTemplates(cleanPhone, order.namaPelanggan);
                }}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Buka Template Chat Lengkap (Rekening, Ongkir Yamato, Alamat)</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="min-h-[44px] text-xs font-bold px-3.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Tersalin!" : "Salin"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] text-xs font-bold px-3.5 rounded-xl"
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={handleSendWA}
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 sm:px-5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              <Send size={14} />
              <span>Buka WhatsApp</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
