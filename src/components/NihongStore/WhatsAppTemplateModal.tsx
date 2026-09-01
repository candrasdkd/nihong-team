// src/components/NihongStore/WhatsAppTemplateModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  CreditCard,
  AlertTriangle,
  Plane,
  PackageCheck,
  Edit3,
  User,
} from "lucide-react";
import { NihongStoreOrder } from "../../types";
import { formatIDR, formatDate } from "../../utils/format";
import { Button } from "../ui/Button";

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  order: NihongStoreOrder | null;
  onClose: () => void;
}

type TemplateType = "dp_50" | "stok_habis" | "jadwal_handcarry" | "pelunasan" | "kustom";

export function WhatsAppTemplateModal({
  isOpen,
  order,
  onClose,
}: WhatsAppTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("dp_50");
  const [messageText, setMessageText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Normalisasi nomor telepon
  const cleanPhone = useMemo(() => {
    if (!order?.noTelponPelanggan) return "";
    let p = order.noTelponPelanggan.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    if (!p.startsWith("62")) p = "62" + p;
    return p;
  }, [order?.noTelponPelanggan]);

  // Generate templates based on order data
  const templates = useMemo(() => {
    if (!order) return { dp_50: "", stok_habis: "", jadwal_handcarry: "", pelunasan: "", kustom: "" };

    const customerName = order.namaPelanggan;
    const orderNo = order.no || order.id;
    const items = order.items || [];
    const availableItems = items.filter((it) => it.status !== "Stok habis");
    const oosItems = items.filter((it) => it.status === "Stok habis");

    const itemsSummary = availableItems
      .map((it, i) => {
        const variants = [it.kodeBarang, it.warna, it.ukuran].filter(Boolean).join(", ");
        return `${i + 1}. ${it.namaBarang} (x${it.jumlah || 1})${variants ? ` [${variants}]` : ""}`;
      })
      .join("\n");

    const oosSummary = oosItems
      .map((it, i) => `• ${it.namaBarang} (x${it.jumlah || 1})`)
      .join("\n");

    const totalEst = order.totalEstimasiHargaIdr || 0;
    const dpNominal = Math.round(totalEst * 0.5);
    const sisaPelunasan = totalEst - dpNominal;

    const rute = order.assignedScheduleRoute || "Tokyo - Jakarta";
    const tglBerangkat = order.assignedScheduleDate || "Sesuai Jadwal";

    // 1. Template DP 50%
    const dp50Text = `Halo Kak ${customerName}, salam dari Tim *Nihong Jastip*! 🙏🇯🇵\n\nTerima kasih telah memesan melalui NihongStore dengan nomor pesanan *${orderNo}*.\n\nBerikut rincian barang titipan Kakak:\n${itemsSummary}\n\n📊 *Total Estimasi:* ${formatIDR(totalEst)}\n💰 *DP 50% untuk Booking Belanja:* *${formatIDR(dpNominal)}*\n\nMohon konfirmasi jika sudah melakukan transfer DP agar pesanan Kakak dapat langsung dimasukkan ke dalam daftar belanja jastiper kami di Jepang ya. Terima kasih! ✨`;

    // 2. Template Stok Habis
    const stokHabisText = `Halo Kak ${customerName}, salam dari Tim *Nihong Jastip*! 🙏\n\nTerkait pesanan Kakak (*${orderNo}*), kami ingin menginformasikan bahwa setelah tim kami mengecek gerai di Jepang, produk berikut saat ini *sedang kosong/habis*:\n\n${oosSummary}\n\nApakah Kakak ingin:\n1. Mengganti dengan varian warna/ukuran/model alternatif?\n2. Tetap memproses barang yang tersedia saja dan melakukan penyesuaian nominal?\n\nMohon kabari kami ya Kak. Terima kasih! 😊`;

    // 3. Template Jadwal Handcarry
    const jadwalText = `Halo Kak ${customerName}, kabar baik dari Tim *Nihong Jastip*! ✈️🇯🇵\n\nPesanan Kakak (*${orderNo}*) telah berhasil didaftarkan ke Jadwal Keberangkatan Handcarry:\n\n🛫 *Rute:* ${rute}\n📅 *Jadwal Keberangkatan:* ${tglBerangkat}\n\nBarang titipan Kakak akan dibelanjakan langsung di Jepang sesuai jadwal di atas. Kami akan memberikan update kembali saat barang tiba di Indonesia. Terima kasih atas kepercayaannya! ✨`;

    // 4. Template Pelunasan & Kirim Lokal
    const pelunasanText = `Halo Kak ${customerName}, kabar gembira dari Tim *Nihong Jastip*! 📦🎉\n\nBarang titipan Kakak (*${orderNo}*) telah *tiba di Indonesia* dan telah lolos pemeriksaan Quality Control kami dengan baik.\n\n📊 *Rincian Pelunasan:*\n• Sisa Pelunasan: *${formatIDR(sisaPelunasan)}*\n• Alamat Tujuan: ${order.alamatPelanggan || "(Mohon konfirmasi alamat lengkap & no HP)"}\n\nSetelah pelunasan terkonfirmasi, paket akan segera kami kirimkan melalui ekspedisi kurir lokal beserta nomor resinya. Terima kasih banyak Kak! 🙏✨`;

    // 5. Template Kustom Default
    const kustomText = `Halo Kak ${customerName}, kami dari Tim Nihong Jastip terkait pesanan NihongStore *${orderNo}*:\n\n${itemsSummary}\n\nAda yang bisa kami bantu? Terima kasih!`;

    return {
      dp_50: dp50Text,
      stok_habis: stokHabisText,
      jadwal_handcarry: jadwalText,
      pelunasan: pelunasanText,
      kustom: kustomText,
    };
  }, [order]);

  // Update text when template or order changes
  useEffect(() => {
    if (templates[selectedTemplate]) {
      setMessageText(templates[selectedTemplate]);
    }
  }, [selectedTemplate, templates]);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = () => {
    if (!cleanPhone) {
      alert("Nomor telepon tidak valid");
      return;
    }
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const TEMPLATE_OPTIONS: Array<{
    id: TemplateType;
    label: string;
    icon: any;
    desc: string;
    badge?: string;
  }> = [
    {
      id: "dp_50",
      label: "Tagihan DP 50% & Booking",
      icon: CreditCard,
      desc: "Rincian barang, total estimasi IDR, dan nominal DP 50%",
    },
    {
      id: "stok_habis",
      label: "Pemberitahuan Stok Habis",
      icon: AlertTriangle,
      desc: "Daftar barang kosong & penawaran alternatif barang",
      badge: order.items.some((it) => it.status === "Stok habis") ? "Ada OOS" : undefined,
    },
    {
      id: "jadwal_handcarry",
      label: "Info Jadwal Handcarry",
      icon: Plane,
      desc: "Konfirmasi rute dan tanggal penerbangan handcarry",
    },
    {
      id: "pelunasan",
      label: "Barang Tiba & Pelunasan",
      icon: PackageCheck,
      desc: "Info barang mendarat di Indo & sisa pelunasan ongkir",
    },
    {
      id: "kustom",
      label: "Pesan Kustom Bebas",
      icon: Edit3,
      desc: "Format teks ringkas yang bebas diedit secara leluasa",
    },
  ];

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
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
        className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">
                Kirim Pesan WhatsApp Konsumen
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
                <span className="font-bold text-slate-700">{order.namaPelanggan}</span>
                <span>•</span>
                <span className="font-mono text-emerald-700 font-bold">{order.noTelponPelanggan || "Tanpa No HP"}</span>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
          {/* Template Selector Pills */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Pilih Template Pesan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs text-emerald-950 font-bold"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 mt-0.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold leading-snug truncate">
                          {tpl.label}
                        </span>
                        {tpl.badge && (
                          <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-md shrink-0">
                            {tpl.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {tpl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea Preview / Edit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Isi Pesan WhatsApp (Bisa diedit sebelum dikirim)
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

            <div className="relative">
              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full text-xs font-sans text-slate-800 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner resize-y leading-relaxed font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>* Format tebal (*tebal*) dan miring (_miring_) didukung di WhatsApp.</span>
              <span>{messageText.length} karakter</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Tersalin ke Clipboard" : "Salin Pesan"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold px-4 py-2.5 rounded-xl"
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={handleSendWA}
              disabled={!cleanPhone}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>Buka di WhatsApp</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
