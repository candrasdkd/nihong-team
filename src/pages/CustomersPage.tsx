import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DocumentData, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  CheckCircle2,
  Frown,
  MapPin,
  Pencil,
  Phone,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ConfirmModal } from "../components/ConfirmModal";

import { db } from "../lib/firebase";
import { Customer } from "../types";
import { openWhatsApp } from "../utils/helpers";
import { formatPhoneDisplay } from "../utils/phone";
import {
  addCustomer,
  updateCustomer,
  deleteCustomer,
  migrateCustomersAndOrdersToUppercase,
} from "../services/customersFirebase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";
import { CustomerFormModal } from "../components/CustomerFormModal";

// ─── Konstanta ───────────────────────────────────────────────
const COL = "customer";

type CustomerFilter = "all" | "wa" | "complete";

// WhatsApp brand icon (tidak tersedia di lucide-react)
const IconWhatsApp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47.03.15 5.36.18 11.95a11.87 11.87 0 0 0 1.7 6.17L0 24l5.99-1.85a11.93 11.93 0 0 0 6.07 1.66h.01c6.59-.04 11.91-5.37 11.93-11.96a11.9 11.9 0 0 0-3.48-8.37Zm-8.46 18.3a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.56 1.1 1.12-3.47-.23-.36a9.9 9.9 0 1 1 8.08 4.33ZM17.2 14.3c-.3-.16-1.78-.88-2.05-.98-.27-.1-.47-.16-.66.16-.2.32-.77.98-.95 1.18-.18.2-.35.23-.65.08-.3-.16-1.27-.47-2.43-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.32-.02-.49.13-.64.13-.12.3-.32.45-.48.15-.16.2-.27.3-.45.1-.18.05-.34-.02-.48-.08-.16-.66-1.6-.9-2.2-.24-.58-.48-.5-.66-.51h-.56c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3 0 1.36.99 2.67 1.12 2.85.14.18 1.96 2.98 4.75 4.18.66.28 1.18.45 1.58.58.66.21 1.27.18 1.75.11.53-.08 1.78-.73 2.04-1.44.25-.7.25-1.3.18-1.44-.08-.13-.27-.2-.57-.36Z" />
  </svg>
);

// ─── Sub-komponen ─────────────────────────────────────────────
const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";
  const charCode = initial.charCodeAt(0) || 0;
  const gradients = [
    "from-indigo-500 to-purple-600 shadow-indigo-100",
    "from-blue-500 to-indigo-600 shadow-blue-100",
    "from-emerald-500 to-teal-600 shadow-emerald-100",
    "from-violet-500 to-fuchsia-600 shadow-violet-100",
    "from-amber-500 to-orange-600 shadow-amber-100",
    "from-rose-500 to-pink-600 shadow-rose-100",
  ];
  const gradient = gradients[charCode % gradients.length];
  const sizeClasses = size === "sm" ? "w-9 h-9 rounded-lg text-sm" : "w-10 h-10 rounded-xl text-base";
  return (
    <div className={`${sizeClasses} bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20 select-none`}>
      {initial}
    </div>
  );
};

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-100">
        <td className="px-5 py-4 align-middle">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-200/85" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-slate-200/85" />
              <div className="h-3 w-20 rounded bg-slate-200/60" />
            </div>
          </div>
        </td>
        <td className="px-5 py-4 align-middle">
          <div className="h-7 w-32 rounded-lg bg-slate-200/70" />
        </td>
        <td className="px-5 py-4 align-middle">
          <div className="h-4 w-56 rounded bg-slate-200/60" />
        </td>
        <td className="px-5 py-4 align-middle">
          <div className="h-7 w-28 rounded-full bg-slate-200/70" />
        </td>
        <td className="px-5 py-4 text-right align-middle">
          <div className="flex items-center justify-end gap-1.5">
            <div className="h-9 w-9 rounded-xl bg-slate-200/75" />
            <div className="h-9 w-9 rounded-xl bg-slate-200/75" />
            <div className="h-9 w-9 rounded-xl bg-slate-200/75" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const MobileListSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-200/85" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-slate-200/85" />
            <div className="h-3 w-1/3 rounded bg-slate-200/60" />
          </div>
        </div>
        <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3">
          <div className="h-3 w-2/3 rounded bg-slate-200/70" />
          <div className="h-3 w-full rounded bg-slate-200/60" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-9 flex-1 rounded-xl bg-slate-200/75" />
          <div className="h-9 flex-1 rounded-xl bg-slate-200/75" />
          <div className="h-9 w-9 rounded-xl bg-slate-200/75" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Halaman Utama ────────────────────────────────────────────
export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [profileFilter, setProfileFilter] = useState<CustomerFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  async function handleMigrate() {
    setConfirmModal({
      isOpen: true,
      title: "Migrasi Huruf Kapital",
      message: "Apakah Anda yakin ingin mengubah semua data nama pelanggan lama dan pesanan lama menjadi HURUF KAPITAL (UPPERCASE)? Tindakan ini akan memakan waktu beberapa saat dan tidak dapat dibatalkan.",
      confirmText: "Ya, Migrasi",
      type: "warning",
      onConfirm: async () => {
        setMigrating(true);
        try {
          await migrateCustomersAndOrdersToUppercase();
          alert("Migrasi berhasil! Seluruh data nama pelanggan dan pesanan telah diubah menjadi huruf kapital.");
        } catch (err: any) {
          alert("Gagal melakukan migrasi: " + (err?.message || err));
        } finally {
          setMigrating(false);
        }
      },
    });
  }

  useEffect(() => {
    const qy = query(collection(db, COL), orderBy("nama"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as DocumentData),
        })) as Customer[];
        setCustomers(rows);
        setLoading(false);
      },
      (err) => {
        console.error("listen customer error:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return customers.filter((c) => {
      const matchesSearch =
        !keyword ||
        (c?.nama ?? "").toLowerCase().includes(keyword) ||
        (c?.alamat ?? "").toLowerCase().includes(keyword) ||
        (c?.telpon ?? "").toLowerCase().includes(keyword);
      const hasPhone = Boolean(c.telpon?.trim());
      const hasAddress = Boolean(c.alamat?.trim());
      const matchesProfile =
        profileFilter === "all" ||
        (profileFilter === "wa" && hasPhone) ||
        (profileFilter === "complete" && hasPhone && hasAddress);

      return matchesSearch && matchesProfile;
    });
  }, [customers, profileFilter, q]);

  // Sync search query to URL
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      q ? next.set("q", q) : next.delete("q");
      return next;
    }, { replace: true });
  }, [q, setSearchParams]);

  // CRM Analytics Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const wa = customers.filter((c) => !!c.telpon?.trim()).length;
    const complete = customers.filter((c) => !!c.telpon?.trim() && !!c.alamat?.trim()).length;
    return { total, wa, complete };
  }, [customers]);

  async function handleDelete(id?: string) {
    if (!id) return;
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pelanggan",
      message: "Apakah Anda yakin ingin menghapus pelanggan ini secara permanen dari database?",
      confirmText: "Hapus",
      type: "danger",
      onConfirm: async () => {
        try {
          await deleteCustomer(id);
        } catch (err: any) {
          alert("Gagal menghapus: " + (err?.message || err));
        }
      },
    });
  }

  function openEditForm(c: Customer) {
    setEditing(c);
    setShowForm(true);
  }

  function openAddForm() {
    setEditing(null);
    setShowForm(true);
  }

  const makeDefaultWaMsg = (nama?: string) =>
    `Halo ${nama || ""}, saya ingin konfirmasi pesanan.`;

  return (
    <div className="min-h-screen bg-surface-base pb-24 font-sans text-slate-800">
      <div className="page-container space-y-5 sm:space-y-6">
        <HeroPageHeader
          badgeIcon={UsersRound}
          badgeLabel="Database Kontak"
          title="Pelanggan"
          description="Kelola identitas, nomor WhatsApp, dan alamat pelanggan dalam satu tempat yang rapi."
          mobileSubtitle="Cari kontak, lengkapi profil, dan hubungi pelanggan lebih cepat."
          action={
            <>
              <Button
                onClick={handleMigrate}
                disabled={migrating}
                variant="secondary"
                className="border-white/15 bg-white/10 text-white hover:bg-white/15"
              >
                <Sparkles className="h-4 w-4" />
                {migrating ? "Memproses..." : "Rapikan Kapital"}
              </Button>
              <Button onClick={openAddForm}>
                <UserPlus className="h-4 w-4" />
                <span>Tambah Pelanggan</span>
              </Button>
            </>
          }
        />

        {/* CRM Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <Card className="relative col-span-2 overflow-hidden !p-4 sm:!p-5 lg:col-span-1">
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-brand-mist/70 to-transparent" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
                  Total Pelanggan
                </p>
                <p className="mt-1.5 text-3xl font-black tracking-tight text-brand-navyDark sm:text-4xl">
                  {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-200" /> : metrics.total}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Kontak tersimpan di database</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg shadow-brand-navy/20 sm:h-14 sm:w-14">
                <UsersRound className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden !p-4 sm:!p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-10 sm:w-10">
                <IconWhatsApp className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                Siap chat
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-200" /> : metrics.wa}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Punya WhatsApp</p>
          </Card>

          <Card className="relative overflow-hidden !p-4 sm:!p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-10 sm:w-10">
                <CheckCircle2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-blue-700">
                Lengkap
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-200" /> : metrics.complete}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Profil Lengkap</p>
          </Card>
        </div>

        {/* Search Panel */}
        <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="group relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-navy" />
              <input
                type="search"
                placeholder="Cari nama, nomor WhatsApp, atau alamat..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-11 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-brand-navy/40 focus:bg-white focus:ring-4 focus:ring-brand-navy/10"
                aria-label="Cari pelanggan"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <Button onClick={openAddForm} className="h-10 flex-1">
                <UserPlus className="h-4 w-4" />
                Tambah Pelanggan
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleMigrate}
                disabled={migrating}
                className="h-10 w-10 shrink-0 rounded-xl"
                title="Rapikan huruf kapital"
                aria-label="Rapikan huruf kapital"
              >
                <Sparkles className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 custom-scrollbar sm:px-4">
            {([
              { value: "all", label: "Semua", count: metrics.total },
              { value: "wa", label: "Ada WhatsApp", count: metrics.wa },
              { value: "complete", label: "Profil Lengkap", count: metrics.complete },
            ] as const).map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setProfileFilter(filter.value)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
                  profileFilter === filter.value
                    ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {filter.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${
                  profileFilter === filter.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 text-xs font-semibold text-slate-400 sm:block">
              Menampilkan {filtered.length} pelanggan
            </span>
          </div>
        </section>

        {/* Tabel Desktop */}
        <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-sm">
              <thead className="border-b border-surface-border bg-slate-50">
                <tr className="text-slate-500 text-left">
                  <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Pelanggan</th>
                  <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">WhatsApp</th>
                  <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Alamat</th>
                  <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Kelengkapan</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-[0.12em]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loading && <TableSkeleton />}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Frown className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-base font-bold text-slate-700">Tidak ada pelanggan ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1">Ubah kata kunci, pilih filter lain, atau tambah pelanggan baru.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((c) => (
                    <tr key={c.id} className="group transition-colors duration-200 hover:bg-slate-50/70">
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.nama} />
                          <div className="min-w-0">
                            <div className="max-w-[240px] truncate text-sm font-extrabold tracking-tight text-slate-900" title={c.nama}>
                              {c.nama}
                            </div>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pelanggan</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        {c.telpon ? (
                          <div className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 font-mono text-xs font-bold text-emerald-800">
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                            {formatPhoneDisplay(c.telpon)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs font-semibold italic text-slate-400">
                            <Phone className="h-3.5 w-3.5" /> Tanpa nomor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex max-w-[300px] items-start gap-2 text-xs font-medium leading-relaxed text-slate-600" title={c.alamat}>
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">
                            {c.alamat || <span className="italic text-slate-400">Alamat belum diisi</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        {c.telpon?.trim() && c.alamat?.trim() ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Lengkap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                            Perlu dilengkapi
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openWhatsApp(c.telpon, makeDefaultWaMsg(c.nama))}
                            disabled={!c.telpon}
                            className="w-9 h-9 rounded-xl text-emerald-600 bg-emerald-50/50 hover:bg-emerald-500 hover:text-white border border-emerald-100/50 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:bg-transparent disabled:border-transparent disabled:text-slate-300 disabled:shadow-none"
                            title="Chat WhatsApp"
                          >
                            <IconWhatsApp className="w-4.5 h-4.5" />
                          </Button>

                          <div className="h-5 w-px bg-slate-100 mx-0.5" />

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditForm(c)}
                            className="w-9 h-9 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all duration-200 active:scale-95"
                            title="Edit Data"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(c.id)}
                            className="w-9 h-9 rounded-xl text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-200 active:scale-95"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* List Mobile */}
        <div className="lg:hidden">
          {loading && <MobileListSkeleton />}

          {!loading && filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 px-4 text-center bg-surface-card rounded-card border border-surface-border shadow-card">
              <Frown className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-slate-700 font-bold text-sm">Tidak ada pelanggan ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Ubah pencarian atau pilih filter pelanggan lain.</p>
              <Button onClick={openAddForm} variant="secondary" className="mt-4">
                <UserPlus className="h-4 w-4" /> Tambah Pelanggan
              </Button>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((c) => (
                <article
                  key={c.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={c.nama} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold tracking-tight text-slate-900" title={c.nama}>
                          {c.nama}
                        </h3>
                        <div className="mt-1.5">
                          {c.telpon?.trim() && c.alamat?.trim() ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Profil lengkap
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                              Perlu dilengkapi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50/80 p-3">
                      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600">
                        <Phone className={`h-3.5 w-3.5 shrink-0 ${c.telpon ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className={`truncate font-mono ${c.telpon ? "text-slate-700" : "italic text-slate-400"}`}>
                          {c.telpon ? formatPhoneDisplay(c.telpon) : "Nomor belum diisi"}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-start gap-2 text-xs font-medium leading-relaxed text-slate-500">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className={`line-clamp-2 ${c.alamat ? "" : "italic text-slate-400"}`}>
                          {c.alamat || "Alamat belum diisi"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/40 p-3">
                    <Button
                      onClick={() => openWhatsApp(c.telpon, makeDefaultWaMsg(c.nama))}
                      disabled={!c.telpon}
                      variant={c.telpon ? "success" : "outline"}
                      className="h-9 min-w-0 flex-1 rounded-xl px-2 text-xs disabled:!border-slate-200 disabled:!bg-slate-100 disabled:!text-slate-500 disabled:!opacity-100"
                      aria-label={`Hubungi ${c.nama} melalui WhatsApp`}
                    >
                      <IconWhatsApp className="h-3.5 w-3.5" />
                      <span className="truncate">{c.telpon ? "WhatsApp" : "Tanpa nomor"}</span>
                    </Button>

                    <Button
                      onClick={() => openEditForm(c)}
                      variant="secondary"
                      className="h-9 min-w-0 flex-1 rounded-xl px-2 text-xs"
                      aria-label={`Edit data ${c.nama}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="truncate">Edit</span>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(c.id)}
                      className="h-9 w-9 shrink-0 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      title="Hapus pelanggan"
                      aria-label={`Hapus ${c.nama}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <CustomerFormModal
          initial={editing || undefined}
          onClose={() => setShowForm(false)}
          onSubmit={async (val: Customer) => {
            const cleanName = val.nama.trim().toUpperCase();
            const isDuplicate = customers.some(
              (c) => c.nama.toUpperCase().trim() === cleanName && c.id !== editing?.id
            );
            if (isDuplicate) {
              throw new Error(`Pelanggan "${cleanName}" sudah terdaftar.`);
            }

            if (editing?.id) {
              await updateCustomer(editing.id, {
                nama: cleanName,
                alamat: val.alamat,
                telpon: val.telpon,
              });
            } else {
              await addCustomer({
                nama: cleanName,
                alamat: val.alamat,
                telpon: val.telpon,
              });
            }
            setShowForm(false);
          }}
        />
      )}

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
