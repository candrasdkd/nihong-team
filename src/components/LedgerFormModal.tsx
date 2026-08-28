// src/components/LedgerFormModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import type { LedgerEntry, LedgerUpsert } from "../services/ledgerFirebase";
import { RupiahInput } from "./ui/RupiahInput";
import { calculateProfitFromOrders } from "../services/ordersReport";
import { formatIDR } from "../utils/format";
import {
  Calendar,
  Tag,
  Coins,
  CreditCard,
  FileText,
  Calculator,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Bookmark
} from "lucide-react";

function formatReadableDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LedgerFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: LedgerEntry;
  onClose: () => void;
  onSubmit: (val: LedgerUpsert, opts?: { trackAsCapital?: boolean }) => Promise<void> | void;
}) {
  const [tanggal, setTanggal] = useState<string>(
    initial?.tanggal || new Date().toISOString().slice(0, 10)
  );
  const [tipe, setTipe] = useState<"Masuk" | "Keluar">(
    initial?.tipe || "Masuk",
  );
  const [kategori, setKategori] = useState<string>(initial?.kategori || "");
  const [keterangan, setKeterangan] = useState<string>(
    initial?.keterangan || "",
  );
  const [metode, setMetode] = useState<string>(
    initial ? (initial.metode || "") : "Transfer"
  );
  const [jumlah, setJumlah] = useState<number>(initial?.jumlah || 0);
  const [catatan, setCatatan] = useState<string>(initial?.catatan || "");
  const [submitting, setSubmitting] = useState(false);
  const [trackAsCapital, setTrackAsCapital] = useState(false);

  // Keuntungan calculator
  const [profitCalcFrom, setProfitCalcFrom] = useState("");
  const [profitCalcTo, setProfitCalcTo] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const isMonthlyProfitCategory =
    tipe === "Masuk" && kategori === "Keuntungan Bulanan";

  const panelRef = useRef<HTMLDivElement>(null);
  const isSmall =
    typeof window !== "undefined" ? window.innerWidth < 768 : true;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!panelRef.current) return;
      const target = e.target as Node;
      if (!panelRef.current.contains(target)) onClose();
    }
    if (!isSmall) {
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }
  }, [onClose, isSmall]);

  async function handleCalculateProfit() {
    if (!profitCalcFrom || !profitCalcTo) {
      alert("Silakan pilih rentang tanggal kalkulasi terlebih dahulu.");
      return;
    }
    setIsCalculating(true);
    try {
      const profit = await calculateProfitFromOrders(
        profitCalcFrom,
        profitCalcTo,
      );

      setJumlah(profit);

      const formattedFrom = formatReadableDate(profitCalcFrom);
      const formattedTo = formatReadableDate(profitCalcTo);
      setKeterangan(`Laba bersih periode ${formattedFrom} - ${formattedTo}`);

      alert(`Keuntungan berhasil dihitung: ${formatIDR(profit)}`);
    } catch (error) {
      console.error("Gagal menghitung keuntungan:", error);
      alert(
        "Terjadi kesalahan saat menghitung keuntungan. Periksa konsol untuk detail.",
      );
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSubmit() {
    if (!tanggal) {
      alert("Tanggal wajib diisi");
      return;
    }
    if (isMonthlyProfitCategory && !keterangan) {
      alert(
        "Keterangan wajib diisi. Silakan hitung keuntungan terlebih dahulu.",
      );
      return;
    }
    if (jumlah === 0 || isNaN(Number(jumlah))) {
      alert(
        "Jumlah tidak valid atau nol. Jika ini adalah keuntungan bulanan, pastikan Anda sudah menghitungnya.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const val: LedgerUpsert = {
        tanggal,
        tipe,
        kategori: kategori || null,
        keterangan: keterangan || null,
        metode: tipe === "Masuk" ? null : (metode || null),
        jumlah: Number(jumlah),
        catatan: catatan || null,
        createdAt: initial?.createdAt ?? Date.now(),
      };
      await onSubmit(val, { trackAsCapital });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const isMasuk = tipe === "Masuk";
  const themeBg = isMasuk ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-rose-50 dark:bg-rose-950/20";
  const themeText = isMasuk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const themeBorderFocus = isMasuk ? "focus:!border-emerald-500 focus:!ring-emerald-500/20" : "focus:!border-rose-500 focus:!ring-rose-500/20";
  const themePrimaryButton = isMasuk
    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/10"
    : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-600/10";

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 bg-slate-900/40 ${isSmall ? "" : "backdrop-blur-sm"}`}
      />

      {/* Modal Container */}
      <motion.div
        ref={panelRef}
        initial={isSmall ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={isSmall ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isSmall ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
        transition={
          isSmall
            ? { type: "tween", ease: "easeOut", duration: 0.25 }
            : { type: "spring", stiffness: 350, damping: 28 }
        }
        className={`relative w-full md:w-[560px] max-w-full rounded-t-2xl md:rounded-2xl bg-white shadow-2xl h-[88vh] md:h-auto max-h-[88vh] flex flex-col overflow-hidden border-t-4 ${isMasuk ? "border-t-emerald-500" : "border-t-rose-500"
          } transition-colors duration-300`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl transition-all duration-300 ${themeBg} ${themeText}`}>
                {tipe === "Masuk" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  {initial ? "Edit Transaksi" : "Tambah Transaksi Baru"}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  {tipe === "Masuk" ? "Catat pemasukan kas/pendapatan baru" : "Catat pengeluaran kas/biaya baru"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">

          {/* KARTU UTAMA: Tipe Transaksi & Nominal */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isMasuk
              ? "bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border-emerald-500/10 focus-within:border-emerald-500/20"
              : "bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-transparent border-rose-500/10 focus-within:border-rose-500/20"
            }`}>
            {/* Segmented Control for Tipe */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Tipe Transaksi
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl relative">
                <button
                  type="button"
                  onClick={() => {
                    setTipe("Masuk");
                    setKategori("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg z-10 transition-all flex items-center justify-center gap-1.5 ${tipe === "Masuk" ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <TrendingUp size={13} />
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipe("Keluar");
                    setKategori("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg z-10 transition-all flex items-center justify-center gap-1.5 ${tipe === "Keluar" ? "text-rose-700" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <TrendingDown size={13} />
                  Pengeluaran
                </button>
                {/* Sliding Background */}
                <motion.div
                  className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm"
                  style={{
                    width: "calc(50% - 6px)",
                  }}
                  animate={{
                    x: tipe === "Masuk" ? 0 : "100%",
                  }}
                  transition={isSmall ? { type: "tween", duration: 0.15 } : { type: "spring", stiffness: 350, damping: 25 }}
                />
              </div>
            </div>

            {/* Wallet-Style Amount Input */}
            <div className={`p-4 rounded-xl border transition-all duration-300 mt-4 flex flex-col items-center justify-center ${isMasuk
                ? "bg-emerald-500/5 border-emerald-500/10 focus-within:border-emerald-500/40 focus-within:ring-4 focus-within:ring-emerald-500/5"
                : "bg-rose-500/5 border-rose-500/10 focus-within:border-rose-500/40 focus-within:ring-4 focus-within:ring-rose-500/5"
              }`}>
              <span className={`text-[10px] font-extrabold tracking-widest uppercase mb-1 ${isMasuk ? "text-emerald-600/80" : "text-rose-600/80"}`}>
                Nominal Transaksi
              </span>
              <div className="w-full relative flex items-center justify-center">
                <RupiahInput
                  label=""
                  value={jumlah}
                  onChange={setJumlah}
                  disabled={isMonthlyProfitCategory}
                  className={`w-full text-center text-3xl sm:text-4xl font-extrabold tracking-tight focus:!ring-0 focus:!border-0 !border-0 !bg-transparent !shadow-none py-1 font-mono transition-all ${isMasuk
                      ? "text-emerald-600 placeholder:text-emerald-300/50"
                      : "text-rose-600 placeholder:text-rose-300/50"
                    } ${isMonthlyProfitCategory ? "cursor-not-allowed opacity-85" : ""}`}
                />
              </div>
            </div>
          </div>

          {/* Profit Calculator Section */}
          <AnimatePresence>
            {isMonthlyProfitCategory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="p-4 border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Calculator size={15} className="text-amber-600 animate-pulse" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">Kalkulator Keuntungan Otomatis</span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Keuntungan Bersih
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">Dari Tanggal</span>
                      <input
                        type="date"
                        value={profitCalcFrom}
                        onChange={(e) => setProfitCalcFrom(e.target.value)}
                        style={{ WebkitAppearance: "none", appearance: "none" }}
                        className="w-full bg-white border border-amber-200/70 text-slate-800 rounded-xl px-3 h-10 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[40px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">Sampai Tanggal</span>
                      <input
                        type="date"
                        value={profitCalcTo}
                        onChange={(e) => setProfitCalcTo(e.target.value)}
                        style={{ WebkitAppearance: "none", appearance: "none" }}
                        className="w-full bg-white border border-amber-200/70 text-slate-800 rounded-xl px-3 h-10 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[40px]"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCalculateProfit}
                    disabled={isCalculating}
                    variant="outline"
                    className="w-full bg-white hover:bg-amber-50 text-amber-800 border-amber-300 hover:border-amber-400 rounded-xl h-10 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghitung Laba Bersih...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                        <span>Hitung Keuntungan Bersih</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KARTU DETAIL: Tanggal & Kategori & Metode Pembayaran */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className={`p-1 rounded-md ${isMasuk ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                <Calendar size={14} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Detail Transaksi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                  className={`w-full h-11 min-h-[44px] bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${isMasuk ? "focus:ring-emerald-500/20" : "focus:ring-rose-500/20"}`}
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Kategori
                </label>
                <Select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className={`w-full h-11 bg-white border-slate-200 rounded-xl transition-all ${themeBorderFocus}`}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {tipe === "Masuk" && (
                    <option value="Keuntungan Bulanan">Keuntungan Bulanan</option>
                  )}
                  {tipe === "Keluar" && (
                    <>
                      <option value="Belanja">Belanja</option>
                      <option value="Operasional">Operasional</option>
                      <option value="Tiket Pesawat">Tiket Pesawat</option>
                      <option value="Refund">Refund</option>
                      <option value="Lainnya">Lainnya</option>
                    </>
                  )}
                </Select>
              </div>
            </div>

            {/* Metode Pembayaran (Only for Keluar) */}
            <AnimatePresence initial={false}>
              {tipe === "Keluar" && (
                <motion.div
                  initial={isSmall ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                  animate={isSmall ? { opacity: 1 } : { opacity: 1, height: "auto", marginTop: 16 }}
                  exit={isSmall ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
                  transition={isSmall ? { duration: 0.15 } : undefined}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Metode Pembayaran
                    </label>
                    <Select
                      value={metode}
                      onChange={(e) => setMetode(e.target.value)}
                      className={`w-full h-11 bg-white border-slate-200 rounded-xl transition-all ${themeBorderFocus}`}
                    >
                      <option value="">-- Pilih Metode Pembayaran --</option>
                      <option value="Cash">Cash</option>
                      <option value="Transfer">Transfer</option>
                      <option value="E-Wallet">E-Wallet</option>
                    </Select>
                  </div>
                  {/* Baru: Checkbox Modal Tracker */}
                  <div className="mt-3.5 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trackAsCapital}
                        onChange={(e) => setTrackAsCapital(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 h-4 w-4 cursor-pointer"
                      />
                      <span>Catat sebagai Modal Belanja (perlu ditrack pengembaliannya)</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* KARTU NARASI: Keterangan & Catatan */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className={`p-1 rounded-md ${isMasuk ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                <FileText size={14} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Informasi Pendukung
              </span>
            </div>

            {/* Keterangan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Keterangan / Deskripsi
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={isMonthlyProfitCategory ? "Akan diisi otomatis oleh kalkulator" : "Tulis deskripsi transaksi..."}
                disabled={isMonthlyProfitCategory}
                rows={3}
                className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-all ${isMasuk ? "focus:ring-emerald-500/20" : "focus:ring-rose-500/20"} ${isMonthlyProfitCategory ? "cursor-not-allowed opacity-75 bg-slate-50" : ""}`}
              />
              {isMonthlyProfitCategory && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                  <AlertCircle size={10} className="text-amber-500 shrink-0 animate-pulse" />
                  <span>Keterangan diisi otomatis oleh kalkulator keuntungan.</span>
                </p>
              )}
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Catatan Tambahan
              </label>
              <Input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Opsional (Catatan khusus...)"
                className={`w-full h-11 bg-white border-slate-200 focus:bg-white rounded-xl transition-all ${themeBorderFocus}`}
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-100 px-5 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-semibold px-4 h-11 rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={`text-white font-bold px-6 h-11 rounded-xl text-xs shadow-lg transition-all duration-300 flex items-center gap-2 ${themePrimaryButton}`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span>{initial ? "Simpan Perubahan" : (tipe === "Masuk" ? "Simpan Pemasukan" : "Simpan Pengeluaran")}</span>
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
