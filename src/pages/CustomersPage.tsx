import { useEffect, useMemo, useState } from "react";
import { DocumentData, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { UserPlus, Pencil, Trash2, Search, Frown, MapPin } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ConfirmModal } from "../components/ConfirmModal";

import { db } from "../lib/firebase";
import { Customer } from "../types";
import { openWhatsApp } from "../utils/helpers";
import { FAB_COLOR_CLASS } from "../utils/constants";
import {
  addCustomer,
  updateCustomer,
  deleteCustomer,
  migrateCustomersAndOrdersToUppercase,
} from "../services/customersFirebase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CustomerFormModal } from "../components/CustomerFormModal";

// ─── Konstanta ───────────────────────────────────────────────
const COL = "customer";

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
        <td className="px-6 py-4 w-[60px] align-middle">
          <div className="rounded-xl bg-slate-200/85 h-10 w-10 shrink-0" />
        </td>
        <td className="px-6 py-4 align-middle">
          <div className="h-4 bg-slate-200/85 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-200/60 rounded w-48" />
        </td>
        <td className="px-6 py-4 align-middle">
          <div className="h-6 bg-slate-200/70 rounded-lg w-28" />
        </td>
        <td className="px-6 py-4 text-right align-middle">
          <div className="flex items-center justify-end gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-200/75" />
            <div className="w-9 h-9 rounded-xl bg-slate-200/75" />
            <div className="w-9 h-9 rounded-xl bg-slate-200/75" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const MobileListSkeleton = () => (
  <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-xs animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-200/85 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-3.5 bg-slate-200/85 rounded w-1/3" />
            <div className="h-2.5 bg-slate-200/60 rounded w-2/3" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-200/75" />
          <div className="w-8 h-8 rounded-full bg-slate-200/75" />
          <div className="w-8 h-8 rounded-full bg-slate-200/75" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Halaman Utama ────────────────────────────────────────────
export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
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

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c?.nama ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (c?.alamat ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (c?.telpon ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [customers, q],
  );

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
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
      {/* Header (Sticky) */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 static sm:sticky sm:top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 bg-clip-text text-transparent tracking-tight">
                Database Pelanggan
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 hidden sm:block">
                Manajemen data jastip & kontak whatsapp
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleMigrate}
                disabled={migrating}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-95 transition-all px-3 sm:px-4 rounded-xl h-10 font-bold text-xs gap-1.5 flex items-center justify-center"
              >
                {migrating ? "Memproses..." : "Migrasi Kapital"}
              </Button>
              <Button
                onClick={openAddForm}
                className="hidden sm:flex bg-slate-950 hover:bg-slate-850 text-white shadow-lg shadow-slate-950/10 hover:shadow-slate-950/15 active:scale-95 transition-all px-4 rounded-xl h-10 font-bold text-xs gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pelanggan</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-8">
        
        {/* CRM Metric Dashboard Section */}
        <div className="hidden sm:grid grid-cols-3 gap-4">
          {/* Card 1: Total Pelanggan */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 shadow-lg shadow-slate-950/10 border border-slate-900 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="w-32 h-32" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pelanggan</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {loading ? (
                <span className="inline-block h-8 w-16 bg-slate-800 rounded animate-pulse" />
              ) : (
                metrics.total
              )}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Terdaftar di database Firestore</p>
          </div>

          {/* Card 2: WhatsApp Aktif */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-300 text-emerald-600">
              <IconWhatsApp className="w-32 h-32" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Aktif</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight text-slate-900">
              {loading ? (
                <span className="inline-block h-8 w-16 bg-slate-200/85 rounded animate-pulse" />
              ) : (
                metrics.wa
              )}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Kontak siap dihubungi cepat
            </p>
          </div>

          {/* Card 3: Profil Lengkap */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-300 text-indigo-600">
              <MapPin className="w-32 h-32" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil Lengkap</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight text-slate-900">
              {loading ? (
                <span className="inline-block h-8 w-16 bg-slate-200/85 rounded animate-pulse" />
              ) : (
                metrics.complete
              )}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Memiliki Telepon & Alamat terisi</p>
          </div>
        </div>

        {/* Search Panel with Glassmorphism & Glow */}
        <div className="bg-white/70 backdrop-blur-md shadow-xs border border-slate-200/80 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500/80 transition-all duration-300 !mt-0 sm:!mt-6">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pelanggan, alamat, atau nomor WhatsApp..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder:text-slate-400 text-slate-800 text-sm font-medium"
            />
          </div>
        </div>

        {/* Tabel Desktop */}
        <div className="bg-white shadow-xl shadow-slate-200/20 border border-slate-200/60 rounded-2xl overflow-hidden hidden sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500 text-left">
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] w-[60px]" />
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Nama & Alamat</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">No. Telepon / WhatsApp</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <TableSkeleton />}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Frown className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-base font-bold text-slate-700">Tidak ada pelanggan ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau tambah pelanggan baru.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((c) => (
                    <tr key={c.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                      <td className="px-6 py-4 w-[60px] align-middle">
                        <Avatar name={c.nama} />
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-slate-900 text-sm tracking-tight">{c.nama}</div>
                        <div className="text-slate-500 text-xs mt-1 truncate max-w-[320px] font-medium" title={c.alamat}>
                          {c.alamat || <span className="italic text-slate-400">Alamat belum diisi</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {c.telpon ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold shadow-2xs">
                            {c.telpon}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Tanpa No. HP</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
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

        {/* List Mobile Sederhana */}
        <div className="sm:hidden">
          {loading && <MobileListSkeleton />}

          {!loading && filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 px-4 text-center bg-white rounded-2xl border border-slate-200/60 shadow-xs">
              <Frown className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-slate-700 font-bold text-sm">Tidak ada pelanggan ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau tambah baru.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3.5 flex items-center justify-between gap-3 active:bg-slate-50/60 transition-all"
                >
                  {/* Kiri: Avatar & Info Ringkas */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={c.nama} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate leading-tight">
                        {c.nama}
                      </h3>
                      {/* Baris Meta Tunggal (No. HP • Alamat) */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-semibold truncate leading-none">
                        {c.telpon ? (
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">{c.telpon}</span>
                        ) : (
                          <span className="italic text-slate-400 text-[10px] shrink-0">Tanpa No. HP</span>
                        )}
                        
                        {(c.telpon || c.alamat) && (
                          <span className="text-slate-300 font-black select-none text-[9px] shrink-0">•</span>
                        )}
                        
                        {c.alamat ? (
                          <span className="truncate text-slate-400 text-[10px] font-medium">{c.alamat}</span>
                        ) : (
                          <span className="italic text-slate-400 text-[10px] font-medium">Alamat belum diisi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kanan: Quick Actions Symmetrical & Circular */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openWhatsApp(c.telpon, makeDefaultWaMsg(c.nama))}
                      disabled={!c.telpon}
                      className="w-8 h-8 rounded-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-30 disabled:bg-transparent disabled:text-slate-350 transition-all active:scale-90"
                      title="WhatsApp"
                    >
                      <IconWhatsApp className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditForm(c)}
                      className="w-8 h-8 rounded-full text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-90"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(c.id)}
                      className="w-8 h-8 rounded-full text-red-500 bg-red-50/50 hover:bg-red-100 transition-all active:scale-90"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
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
            try {
              if (editing?.id) {
                await updateCustomer(editing.id, {
                  nama: val.nama,
                  alamat: val.alamat,
                  telpon: val.telpon,
                });
              } else {
                await addCustomer({
                  nama: val.nama,
                  alamat: val.alamat,
                  telpon: val.telpon,
                });
              }
              setShowForm(false);
            } catch (err: any) {
              alert("Gagal menyimpan: " + (err?.message || err));
            }
          }}
        />
      )}

      {/* FAB Mobile */}
      <button
        onClick={openAddForm}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
        aria-label="Tambah Pelanggan"
      >
        <UserPlus className="w-6 h-6" />
      </button>

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

