// src/components/PaymentTrackerModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Send,
  ChevronDown,
} from "lucide-react";
import { ExtendedOrder } from "../types";
import { formatCurrency } from "../utils/format";
import { compute, toInputDate } from "../utils/helpers";
import { updateOrderPayment } from "../services/ordersFirebase";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import { OrderPaymentSummary } from "./OrderPaymentSummary";
import { getPaymentSummary } from "../utils/payment";

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
  }, [order, isOpen]);

  // Saved records stay stable while the active form previews its own changes.
  const saved = getPaymentSummary(order || {}, total);
  const remainingBalance = saved.remaining;
  const settlementTarget = Math.max(0, total - saved.dp);
  const draft = getPaymentSummary(activeTab === "dp"
    ? { dpNominal, pelunasanNominal: saved.settlement }
    : { dpNominal: saved.dp, pelunasanNominal }, total);

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
    const remainingAfterDp = Math.max(0, total - saved.dp);

    const dpText = `Halo Kak ${name}, salam dari Tim *Nihong Jastip*! 🙏🇯🇵\n\nKami mengonfirmasi bahwa pembayaran *DP* untuk pesanan *#${no}* telah kami terima dengan rincian sbb:\n\n📦 *Barang:* ${order.namaBarang || "-"}\n📊 *Total Tagihan:* ${formatCurrency(total, currency)}\n💰 *DP Diterima:* *${formatCurrency(saved.dp, currency)}* (${order.dpMetode || "Metode belum dicatat"})\n⏳ *Sisa Pelunasan:* ${formatCurrency(remainingAfterDp, currency)}\n\nBarang titipan Kakak sedang dalam proses belanja handcarry oleh tim kami di Jepang. Kami akan update kembali saat barang tiba di Indonesia ya. Terima kasih banyak! ✨`;

    const pelunasanText = `Halo Kak ${name}, kabar gembira dari Tim *Nihong Jastip*! 📦🎉\n\nBarang titipan Kakak (*#${no}*) telah *tiba di Indonesia* dan siap dipacking untuk pengiriman lokal.\n\n📊 *Rincian Tagihan Pelunasan:*\n• Total Pesanan: ${formatCurrency(total, currency)}\n• DP yang Masuk: ${formatCurrency(saved.dp, currency)}\n• *Sisa Pelunasan: ${formatCurrency(remainingBalance, currency)}*\n\nMohon konfirmasi transfer ke rekening Nihong Team agar paket Kakak dapat langsung kami proses kirim hari ini beserta nomor resinya. Terima kasih! 🙏✨`;

    const lunasText = `Halo Kak ${name}, terima kasih banyak dari Tim *Nihong Jastip*! 🌟\n\nPembayaran untuk pesanan *#${no}* telah *LUNAS SEPENUHNYA* (${formatCurrency(total, currency)}).\n\nPaket sedang kami siapkan untuk pengiriman ke alamat Kakak. Nomor resi pengiriman akan segera kami informasikan begitu paket di-pickup ekspedisi. Terima kasih atas kepercayaannya! 🚀📦`;

    return { dp: dpText, pelunasan: pelunasanText, lunas: lunasText };
  }, [order, total, currency, saved.dp, remainingBalance]);

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
    if (!Number.isFinite(dpNominal) || dpNominal <= 0) {
      showToast?.("Nominal DP harus lebih dari 0", "warning");
      return;
    }
    setLoading(true);
    try {
      const nextStatus = getPaymentSummary({ dpNominal, pelunasanNominal: saved.settlement }, total).status;
      const isFullyPaid = nextStatus === "Selesai";

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
    const amountToPay = pelunasanNominal;
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      showToast?.("Nominal pelunasan tidak boleh 0", "warning");
      return;
    }

    setLoading(true);
    try {
      const nextStatus = getPaymentSummary({ dpNominal: saved.dp, pelunasanNominal: amountToPay }, total).status;
      await updateOrderPayment(order.id, {
        status: nextStatus,
        pelunasanNominal: amountToPay,
        pelunasanTanggal,
        pelunasanMetode,
        pelunasanCatatan,
      });

      showToast?.(
        nextStatus === "Selesai" ? "Pelunasan berhasil dicatat!" : "Pembayaran dicatat. Masih ada sisa tagihan.",
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
  const handleCopyWa = async () => {
    try {
      await navigator.clipboard.writeText(waTemplates[selectedWaTemplate]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast?.("Pesan WhatsApp disalin", "info");
    } catch {
      showToast?.("Gagal menyalin pesan. Silakan coba lagi.", "error");
    }
  };

  // Open WA
  const handleOpenWa = () => {
    const text = waTemplates[selectedWaTemplate];
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isDp = activeTab === "dp";
  const amount = isDp ? dpNominal : pelunasanNominal;
  const existingAmount = isDp ? saved.dp : saved.settlement;
  const methods = Array.from(new Set([...PAYMENT_METHODS, dpMetode, pelunasanMetode]));
  const closeModal = () => { if (!loading) onClose(); };

  return (
    <Modal
      title="Catat pembayaran"
      onClose={closeModal}
      size="4xl"
      contentClassName="!p-0"
      footer={activeTab !== "whatsapp" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">Perubahan dicatat setelah disimpan.</p>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button variant="ghost" onClick={closeModal} disabled={loading}>Batal</Button>
            <Button
              variant={isDp ? "secondary" : "success"}
              onClick={isDp ? handleSaveDp : handleSavePelunasan}
              disabled={!Number.isFinite(amount) || amount <= 0}
              isLoading={loading}
              className="flex-1 sm:flex-none"
            >
              {!loading && <Check size={16} />}
              {isDp ? "Simpan DP" : "Simpan pembayaran"}
            </Button>
          </div>
        </div>
      ) : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-5 py-3 sm:px-6">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">#{order.no || order.id}</span>
        <p className="min-w-0 break-words text-sm font-semibold text-slate-800">{order.namaPelanggan}</p>
        <span className="text-xs text-slate-500">{calc.kg} kg</span>
      </div>
      <details className="group border-b border-slate-100 bg-slate-50 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">{order.status === "Selesai" && saved.remaining > 0 ? "Total tagihan" : "Sisa tagihan"}</span>
            <span className="mt-0.5 block break-words text-xl font-bold text-brand-navy tabular-nums">{formatCurrency(order.status === "Selesai" && saved.remaining > 0 ? total : saved.remaining, currency)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-navy">
            Rincian<ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="px-4 pb-4"><OrderPaymentSummary order={order} total={total} currency={currency} /></div>
      </details>
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="hidden bg-slate-50/80 p-6 md:block md:border-r md:border-slate-200">
          <OrderPaymentSummary order={order} total={total} currency={currency} />
        </aside>
        <div className="min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Jenis pencatatan">
            {([
              { id: "dp", label: "Uang muka", icon: CreditCard },
              { id: "pelunasan", label: "Pelunasan", icon: CheckCircle2 },
              { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTab === id}
                disabled={loading}
                onClick={() => setActiveTab(id)}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy disabled:opacity-50 ${activeTab === id ? "bg-white text-brand-navy shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon size={16} className="hidden shrink-0 sm:block" />{label}
              </button>
            ))}
          </div>

          {activeTab !== "whatsapp" ? (
            <fieldset disabled={loading} className="min-w-0 space-y-5">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{isDp ? (existingAmount > 0 ? "Perbarui uang muka" : "Catat uang muka") : (existingAmount > 0 ? "Perbarui pelunasan" : "Catat pelunasan")}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {existingAmount > 0 ? "Nominal ini menggantikan catatan sebelumnya." : "Masukkan pembayaran yang sudah diterima."}
                </p>
              </div>

              {isDp ? (
                <div className="grid grid-cols-3 gap-2" aria-label="Pilihan nominal DP">
                  {[30, 50, 100].map((percentage) => {
                    const value = Math.round(total * percentage / 100);
                    const selected = dpNominal > 0 && dpNominal === value;
                    return (
                      <button key={percentage} type="button" onClick={() => handleQuickDp(percentage)} aria-pressed={selected}
                        className={`min-w-0 rounded-xl border px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${selected ? "border-brand-navy bg-brand-mist text-brand-navy" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                        <span className="block text-center text-sm font-bold sm:text-left">{percentage === 100 ? "100%" : `DP ${percentage}%`}</span>
                        <span className="mt-1 hidden break-words text-xs tabular-nums sm:block">{formatCurrency(value, currency)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Total pelunasan setelah DP</p>
                    <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{formatCurrency(settlementTarget, currency)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPelunasanNominal(settlementTarget)} disabled={settlementTarget <= 0}>Isi nominal</Button>
                </div>
              )}

              <Input
                label={`${isDp ? "Nominal DP" : "Nominal pelunasan"} (${currency})`}
                type="number" min="0" step="any" inputMode="decimal" required
                value={amount || ""}
                onChange={(event) => (isDp ? setDpNominal : setPelunasanNominal)(Number(event.target.value) || 0)}
                placeholder="0"
                className="!py-3 !text-2xl font-bold tabular-nums"
                helperText={formatCurrency(amount, currency)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Tanggal pembayaran" type="date" value={isDp ? dpTanggal : pelunasanTanggal}
                  onChange={(event) => (isDp ? setDpTanggal : setPelunasanTanggal)(event.target.value)} className="min-w-0 !text-base sm:!text-sm" />
                <Select label="Metode pembayaran" value={isDp ? dpMetode : pelunasanMetode}
                  onChange={(event) => (isDp ? setDpMetode : setPelunasanMetode)(event.target.value)} className="!text-base sm:!text-sm">
                  {methods.map((method) => <option key={method} value={method}>{method}</option>)}
                </Select>
              </div>
              <label className="block">
                <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold text-slate-700">
                  Catatan pembayaran <span className="text-xs font-normal text-slate-400">Opsional</span>
                </span>
                <textarea rows={3} value={isDp ? dpCatatan : pelunasanCatatan}
                  onChange={(event) => (isDp ? setDpCatatan : setPelunasanCatatan)(event.target.value)}
                  placeholder="Nama pengirim, nomor referensi, atau keterangan transfer…"
                  className="block w-full resize-y rounded-input border border-surface-border bg-white px-3.5 py-3 text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20 sm:text-sm" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-4" aria-live="polite">
                <span className="text-sm text-slate-500">Sisa setelah disimpan</span>
                <span className={`text-base font-bold tabular-nums ${draft.remaining === 0 ? "text-emerald-700" : "text-slate-900"}`}>{formatCurrency(draft.remaining, currency)}</span>
                {draft.paid > total && <p className="w-full text-xs text-amber-700">Nominal tercatat melebihi tagihan sebesar {formatCurrency(draft.paid - total, currency)}.</p>}
              </div>
            </fieldset>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Pesan pembayaran</h4>
                <p className="mt-1 text-sm text-slate-500">Rincian pesan mengikuti pembayaran yang tersimpan.</p>
              </div>
              <Select label="Jenis pesan" value={selectedWaTemplate} onChange={(event) => { setSelectedWaTemplate(event.target.value as typeof selectedWaTemplate); setCopied(false); }}>
                <option value="dp">Konfirmasi DP diterima</option>
                <option value="pelunasan">Tagihan pelunasan</option>
                <option value="lunas">Konfirmasi lunas</option>
              </Select>
              <textarea aria-label="Pratinjau pesan WhatsApp" readOnly rows={12} value={waTemplates[selectedWaTemplate]}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20" />
              <p className="break-words text-xs text-slate-500">Tujuan: {cleanPhone ? `+${cleanPhone}` : "Pilih penerima di WhatsApp"}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleCopyWa} className="flex-1">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Tersalin" : "Salin pesan"}</Button>
                <Button variant="success" onClick={handleOpenWa} className="flex-1"><Send size={16} />Buka WhatsApp</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
