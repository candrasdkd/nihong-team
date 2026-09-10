import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  Package,
  PackageSearch,
  Plane,
  Plus,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Undo2,
  User,
} from "lucide-react";
import type { PreOrder } from "../types";
import { Button } from "../components/ui/Button";
import {
  listenPublicBookingProducts,
  savePublicBookingProducts,
} from "../services/bookingProductsFirebase";
import { productDrafts, productRevision } from "../utils/bookingProducts";
import { parseSafeDate } from "../utils/format";
import logo from "../assets/nihong.png";

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDepartureDate(dateRaw?: string | number | Date | null): string {
  if (!dateRaw) return "Menunggu Jadwal";

  if (typeof dateRaw === "string") {
    const trimmed = dateRaw.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const monthIdx = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
      }
    }
  }

  const dateObj = parseSafeDate(dateRaw);
  if (!dateObj) return String(dateRaw);

  return dateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SharedBookingProductsPage({ shareToken }: { shareToken: string }) {
  const [booking, setBooking] = useState<PreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    setBooking(null);

    return listenPublicBookingProducts(
      shareToken,
      (value) => {
        setBooking(value);
        setLoading(false);
      },
      () => {
        setError("Data belum bisa dimuat. Periksa koneksi internet lalu coba lagi.");
        setLoading(false);
      }
    );
  }, [shareToken, attempt]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/20 text-slate-800 antialiased selection:bg-brand-orange/20 selection:text-brand-orange">
      {/* Top Brand Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-xl shadow-xs ring-1 ring-slate-200/60">
              <img src={logo} alt="Nihong Jastip" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-brand-navyDark">
                  Nihong Jastip
                </span>
                <span className="hidden sm:inline-flex items-center rounded-md bg-brand-orange/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Kelola Daftar Titipan Booking Kamu
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-xs">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Tautan Resmi</span>
            <span className="sm:hidden">Resmi</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-10 text-center shadow-card sm:p-14"
            >
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-brand-orange/10 animate-ping" />
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-sm ring-2 ring-brand-orange/30">
                  <img src={logo} alt="Loading" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-brand-navyDark">
                <Loader2 size={16} className="animate-spin text-brand-orange" />
                <span>Memuat produk booking kamu...</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Menghubungkan data titipan secara aman
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              className="rounded-3xl border border-red-200 bg-white p-7 text-center shadow-card sm:p-10"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-lg font-black text-slate-800">Gagal Memuat Produk</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{error}</p>
              <div className="mt-6">
                <Button
                  onClick={() => setAttempt((value) => value + 1)}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw size={16} /> Coba Muat Ulang
                </Button>
              </div>
            </motion.div>
          ) : !booking ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-card sm:p-10"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
                <Lock size={26} />
              </div>
              <h1 className="text-xl font-black text-slate-800">Link Produk Tidak Aktif</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Tautan ini mungkin sudah dinonaktifkan atau digantikan dengan tautan baru oleh admin.
                Silakan hubungi tim Nihong Jastip untuk meminta tautan produk terbaru.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-input bg-brand-navy px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-navyLight sm:w-auto"
                >
                  <span>Hubungi Admin Nihong</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </motion.div>
          ) : (
            <ProductEditor
              key={`${shareToken}:${attempt}`}
              booking={booking}
              token={shareToken}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ProductEditor({ booking, token }: { booking: PreOrder; token: string }) {
  const [base, setBase] = useState(booking.items);
  const [drafts, setDrafts] = useState(() => productDrafts(booking.items));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const changed = productRevision(base) !== productRevision(booking.items);
  const readOnly = booking.status !== "Pending";
  const completed = booking.items.filter((item) => item.checked).length;
  const totalItems = booking.items.length;
  const progressPercent = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

  useEffect(() => {
    if (!editing) {
      setBase(booking.items);
      setDrafts(productDrafts(booking.items));
    }
  }, [booking.items, editing]);

  useEffect(() => {
    if (!editing) return;
    const preventLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [editing]);

  function update(index: number, value: string) {
    setEditing(true);
    setMessage("");
    setError("");
    setDrafts((current) =>
      current.map((item, i) => (i === index ? { ...item, namaBarang: value } : item))
    );
  }

  function handleDiscardChanges() {
    setDrafts(productDrafts(base));
    setEditing(false);
    setError("");
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await savePublicBookingProducts(token, productRevision(base), drafts);
      setEditing(false);
      setMessage("Perubahan produk berhasil disimpan dan dapat langsung dilihat oleh tim jastiper.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HERO CARD: PRE-ORDER BRAND BANNER */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navyDark via-brand-navy to-[#113863] p-6 text-white shadow-xl sm:p-8"
      >
        {/* Subtle Ambient Decorative Glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-300 backdrop-blur-xs">
              <Sparkles size={13} className="text-brand-orange" />
              <span>Jastip Pre-Order</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold shadow-xs ${
                booking.status === "Pending"
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  booking.status === "Pending" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span>{booking.status === "Pending" ? "Sedang Diproses" : "Selesai"}</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Produk Booking Kamu
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              Halo, <span className="font-extrabold text-white">{booking.namaPelanggan}</span>! 👋
            </p>
          </div>

          {/* Schedule / Trip Info Badges */}
          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-slate-100 backdrop-blur-xs ring-1 ring-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                <Plane size={18} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                  Rute Handcarry
                </span>
                <span className="block truncate text-xs sm:text-sm font-extrabold text-white">
                  {booking.rute || "Jepang → Indonesia"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-slate-100 backdrop-blur-xs ring-1 ring-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                  Tanggal Berangkat
                </span>
                <span className="block text-xs sm:text-sm font-black text-white">
                  {formatDepartureDate(booking.tanggalBerangkat)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Shopping Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-brand-orange" />
                <span>Progres Belanja Titipan</span>
              </span>
              <span>
                {completed} dari {totalItems} produk selesai ({progressPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-brand-orange to-amber-400 shadow-xs"
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* GUIDANCE & INSTRUCTION CARD */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl border p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
          readOnly
            ? "border-slate-200 bg-slate-100/80 text-slate-700"
            : "border-brand-orange/20 bg-gradient-to-r from-orange-50/70 via-white to-amber-50/50 text-slate-700"
        }`}
      >
        <div className="flex items-start gap-3">
          {readOnly ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
              <Lock size={16} />
            </div>
          ) : (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">
              <Sparkles size={16} />
            </div>
          )}
          <div className="space-y-1">
            <p className="font-extrabold text-slate-900">
              {readOnly ? "Booking Sudah Selesai" : "Panduan Titipan Produk"}
            </p>
            <p className="text-slate-600">
              {readOnly
                ? "Booking ini sudah berstatus Selesai. Daftar produk di bawah ini sudah final dan hanya dapat dilihat. Silakan hubungi admin jika ada pertanyaan lebih lanjut."
                : "Kamu dapat mengecek, mengedit, atau menambah produk titipan kamu di bawah. Barang dengan status hijau (Selesai Dibelanjakan) sudah dibeli oleh jastiper di Jepang dan terkunci. Tekan 'Simpan Perubahan' di bawah setelah selesai mengedit."}
            </p>
          </div>
        </div>
      </motion.section>

      {/* CONFLICT DETECTED ALERT */}
      {changed && editing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 shadow-sm text-xs sm:text-sm text-amber-900"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-2.5">
              <p className="font-bold leading-relaxed">
                Admin atau perangkat lain telah memperbarui data produk booking ini. Muat data
                terbaru untuk melanjutkan agar tidak menimpa data yang telah diperbarui.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setBase(booking.items);
                  setDrafts(productDrafts(booking.items));
                  setEditing(false);
                  setError("");
                }}
                className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                <RefreshCw size={14} />
                <span>Muat Data Terbaru</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* FORM: LIST OF PRODUCTS */}
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-orange" />
            <h2 className="text-base font-extrabold text-brand-navyDark sm:text-lg">
              Daftar Barang Titipan
            </h2>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-extrabold text-slate-700">
              {drafts.length}
            </span>
          </div>
          {editing && (
            <span className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Perubahan belum disimpan
            </span>
          )}
        </div>

        {drafts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <PackageSearch size={26} />
            </div>
            <h3 className="text-base font-black text-slate-800">Belum Ada Produk Titipan</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
              Daftar produk masih kosong. Tambahkan barang titipan impian kamu sekarang.
            </p>
            {!readOnly && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrafts([{ originalIndex: null, namaBarang: "" }]);
                    setEditing(true);
                    setMessage("");
                  }}
                >
                  <Plus size={15} /> Tambah Produk Pertama
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {drafts.map((item, index) => {
              const originalItem =
                item.originalIndex !== null ? base[item.originalIndex] : undefined;
              const checked = Boolean(originalItem?.checked);
              const locked = readOnly || checked;

              return (
                <motion.div
                  key={item.originalIndex !== null ? `orig-${item.originalIndex}` : `draft-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative overflow-hidden rounded-2xl border transition-all ${
                    locked
                      ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 shadow-xs"
                      : "border-slate-200 bg-white shadow-card hover:border-slate-300 focus-within:border-brand-navy focus-within:ring-2 focus-within:ring-brand-navy/10"
                  }`}
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Item Card Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-navy/5 text-xs font-black text-brand-navy">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700">
                          Barang {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {checked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/70 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Selesai Dibelanjakan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            <Clock size={12} className="text-amber-600" />
                            <span>Menunggu Belanja</span>
                          </span>
                        )}

                        {!locked && (
                          <button
                            type="button"
                            aria-label={`Hapus barang ${index + 1}`}
                            onClick={() => {
                              setDrafts((current) => current.filter((_, i) => i !== index));
                              setEditing(true);
                              setMessage("");
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Body */}
                    {locked ? (
                      <div className="space-y-2">
                        <p className="text-base font-black text-slate-900 break-words leading-snug">
                          {item.namaBarang}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {originalItem?.kategori && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                              Kategori: {originalItem.kategori}
                            </span>
                          )}
                          {originalItem?.catatan && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                              Catatan: {originalItem.catatan}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <Lock size={12} />
                            Terkunci & siap dibawa
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="sr-only" htmlFor={`item-${index}`}>
                          Nama barang titipan {index + 1}
                        </label>
                        <div className="relative">
                          <input
                            id={`item-${index}`}
                            type="text"
                            required
                            maxLength={200}
                            placeholder="Contoh: Sepatu Onitsuka Tiger Mexico 66 sz 42 / Snack Tokyo Banana..."
                            value={item.namaBarang}
                            onChange={(e) => update(index, e.target.value)}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 pr-14 text-sm font-medium text-slate-900 transition-all focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400">
                            {item.namaBarang.length}/200
                          </span>
                        </div>

                        {/* Extra metadata badges if existed originally */}
                        {(originalItem?.kategori || originalItem?.catatan) && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500">
                            {originalItem?.kategori && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                Kategori: {originalItem.kategori}
                              </span>
                            )}
                            {originalItem?.catatan && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                Catatan: {originalItem.catatan}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ADD PRODUCT BUTTON */}
        {!readOnly && (
          <button
            type="button"
            disabled={saving || drafts.length >= 100}
            onClick={() => {
              setDrafts((current) => [...current, { originalIndex: null, namaBarang: "" }]);
              setEditing(true);
              setMessage("");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 text-xs sm:text-sm font-black text-slate-700 shadow-2xs transition-all hover:border-brand-orange hover:bg-orange-50/30 hover:text-brand-orange active:scale-[0.99] disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.5} className="text-brand-orange" />
            <span>Tambah Barang Titipan Baru</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({drafts.length}/100)
            </span>
          </button>
        )}

        {/* ERROR / SUCCESS ALERTS */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm font-bold text-red-700 shadow-xs"
          >
            <AlertCircle size={17} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs"
          >
            <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
            <span>{message}</span>
          </motion.div>
        )}

        {/* STICKY BOTTOM ACTION DOCK */}
        {!readOnly && (
          <div className="sticky bottom-4 z-30 pt-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs">
                {editing ? (
                  <>
                    <span className="flex h-2.5 w-2.5 rounded-full bg-brand-orange ring-4 ring-orange-100 animate-pulse" />
                    <span className="font-extrabold text-slate-800">
                      Ada perubahan belum tersimpan
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                    <span className="font-semibold text-slate-500">
                      Semua data produk tersimpan
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={handleDiscardChanges}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    <Undo2 size={14} />
                    <span>Batal</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  disabled={!editing || changed}
                  className="flex-1 sm:flex-none h-11 px-6 text-xs sm:text-sm shadow-md"
                >
                  <Save size={15} />
                  <span>Simpan Perubahan</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
