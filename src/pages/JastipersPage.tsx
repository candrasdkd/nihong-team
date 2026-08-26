import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useJastipers } from "../hooks/useJastipers";
import { JastiperCard } from "../components/Jastiper/JastiperCard";
import { JastiperFormModal } from "../components/Jastiper/JastiperFormModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";

type ProfileFilter = "all" | "complete" | "needs";

export function JastipersPage() {
  const { showToast } = useOutletContext<{
    showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  }>();
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const {
    jastipers,
    loading,
    q,
    setQ,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    filtered,
    handleSubmit,
    handleDelete,
  } = useJastipers(showToast);

  const metrics = useMemo(() => {
    const contact = jastipers.filter((jastiper) => Boolean(jastiper.noTelpon?.trim())).length;
    const complete = jastipers.filter(
      (jastiper) => Boolean(jastiper.noTelpon?.trim()) && Boolean(jastiper.alamat?.trim()),
    ).length;
    return { total: jastipers.length, contact, complete };
  }, [jastipers]);

  const visibleJastipers = useMemo(
    () =>
      filtered.filter((jastiper) => {
        const isComplete = Boolean(jastiper.noTelpon?.trim()) && Boolean(jastiper.alamat?.trim());
        return (
          profileFilter === "all" ||
          (profileFilter === "complete" && isComplete) ||
          (profileFilter === "needs" && !isComplete)
        );
      }),
    [filtered, profileFilter],
  );

  const openAddForm = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-surface-base pb-24 font-sans text-slate-800">
      <div className="page-container space-y-5 sm:space-y-6">
        <HeroPageHeader
          badgeIcon={UserRound}
          badgeLabel="Partner Perjalanan"
          title="Jastiper"
          description="Kelola partner jastip, nomor WhatsApp, alamat depot, dan share location untuk digunakan pada jadwal keberangkatan."
          mobileSubtitle="Cari partner, periksa kelengkapan profil, dan hubungi jastiper lebih cepat."
          action={
            <Button onClick={openAddForm} variant="primary">
              <Plus className="h-4 w-4" /> Tambah Jastiper
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <Card className="relative col-span-2 overflow-hidden !p-4 sm:!p-5 lg:col-span-1">
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-violet-50 to-transparent" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
                  Total Jastiper
                </p>
                <p className="mt-1.5 text-3xl font-black tracking-tight text-brand-navyDark sm:text-4xl">
                  {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-200" /> : metrics.total}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Partner yang siap dipilih di jadwal</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20 sm:h-14 sm:w-14">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden !p-4 sm:!p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-10 sm:w-10">
                <Phone className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                Terhubung
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-200" /> : metrics.contact}
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

        <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="group relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-600" />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari nama, nomor WhatsApp, atau alamat depot..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-11 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                aria-label="Cari jastiper"
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

            <Button onClick={openAddForm} className="h-10 sm:hidden">
              <Plus className="h-4 w-4" /> Tambah Jastiper
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 custom-scrollbar sm:px-4">
            {([
              { value: "all", label: "Semua", count: metrics.total },
              { value: "complete", label: "Profil Lengkap", count: metrics.complete },
              { value: "needs", label: "Perlu Dilengkapi", count: metrics.total - metrics.complete },
            ] as const).map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setProfileFilter(filter.value)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
                  profileFilter === filter.value
                    ? "border-violet-600 bg-violet-600 text-white shadow-sm"
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
              Menampilkan {visibleJastipers.length} jastiper
            </span>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="h-5 w-24 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <div className="h-9 rounded-xl bg-slate-200/70" />
                    <div className="h-12 rounded-xl bg-slate-200/60" />
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-100 p-3">
                  <div className="h-10 flex-1 rounded-xl bg-slate-200" />
                  <div className="h-10 flex-1 rounded-xl bg-slate-200" />
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleJastipers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-surface-border bg-white px-5 py-20 text-center shadow-card">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-100 bg-violet-50 shadow-inner">
              {q || profileFilter !== "all" ? (
                <AlertCircle className="h-8 w-8 text-violet-300" />
              ) : (
                <UserRound className="h-8 w-8 text-violet-300" />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-slate-700">
              {q || profileFilter !== "all" ? "Jastiper Tidak Ditemukan" : "Belum Ada Jastiper"}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-400">
              {q || profileFilter !== "all"
                ? "Ubah kata kunci atau pilih filter profil yang lain."
                : "Tambahkan partner jastip pertama untuk mulai membuat jadwal keberangkatan."}
            </p>
            <Button onClick={openAddForm} variant="secondary" className="mt-5">
              <Plus className="h-4 w-4" /> Tambah Jastiper
            </Button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {visibleJastipers.map((jastiper) => (
                <JastiperCard
                  key={jastiper.id}
                  jastiper={jastiper}
                  onEdit={() => {
                    setEditing(jastiper);
                    setShowForm(true);
                  }}
                  onDelete={() => handleDelete(jastiper)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {showForm && (
        <JastiperFormModal
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText="Hapus"
            type="danger"
            onClose={() => setConfirmModal((current) => ({ ...current, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
