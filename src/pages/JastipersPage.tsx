import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useJastipers } from "../hooks/useJastipers";
import { JastiperFormModal } from "../components/Jastiper/JastiperFormModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";
import { toWaNumber } from "../utils/helpers";
import { formatPhoneDisplay } from "../utils/phone";

function normalizeLocationUrl(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function JastipersPage() {
  const { showToast } = useOutletContext<{
    showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  }>();
  const {
    jastipers,
    loading,
    loadingMore,
    loadError,
    retry,
    hasMore,
    resultCount,
    loadedCount,
    isSearching,
    metrics,
    metricsLoading,
    metricsError,
    q,
    setQ,
    profileFilter,
    setProfileFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    loadMore,
    handleSubmit,
    handleDelete,
  } = useJastipers(showToast);

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
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-brand-mist/70 to-transparent" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
                  Total Jastiper
                </p>
                <p className="mt-1.5 text-3xl font-black tracking-tight text-brand-navyDark sm:text-4xl">
                  {metricsLoading ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-200" /> : metricsError ? "—" : metrics.total}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Partner yang siap dipilih di jadwal</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg shadow-brand-navy/20 sm:h-14 sm:w-14">
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
              {metricsLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-200" /> : metricsError ? "—" : metrics.contact}
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
              {metricsLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-slate-200" /> : metricsError ? "—" : metrics.complete}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Profil Lengkap</p>
          </Card>
        </div>

        <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="group relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-navy" />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari nama, nomor WhatsApp, atau alamat depot..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-11 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-brand-navy/40 focus:bg-white focus:ring-4 focus:ring-brand-navy/10"
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
                    ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {filter.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${
                  profileFilter === filter.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {metricsLoading ? "…" : metricsError ? "—" : filter.count}
                </span>
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 text-xs font-semibold text-slate-400 sm:block">
              Menampilkan {loadedCount} dari {resultCount ?? "—"} jastiper
            </span>
          </div>
        </section>

        {isSearching && (
          <p className="text-xs font-medium text-slate-500">
            Pencarian nama, nomor, atau alamat memindai semua jastiper dalam filter profil yang dipilih.
          </p>
        )}

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button variant="secondary" onClick={retry} className="min-h-[44px] border-rose-200 bg-white text-rose-700">
              Coba lagi
            </Button>
          </div>
        )}

        {loading ? (
          <>
            <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card lg:block">
              <div className="animate-pulse divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center gap-5 px-5 py-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-200" />
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="h-8 w-36 rounded-lg bg-slate-100" />
                    <div className="h-4 flex-1 rounded bg-slate-100" />
                    <div className="h-7 w-24 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 animate-pulse lg:hidden">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-36 rounded bg-slate-200" />
                      <div className="h-3 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-4 h-4 rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </>
        ) : loadError ? null : jastipers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-surface-border bg-white px-5 py-20 text-center shadow-card">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-mist bg-brand-mist/60">
              {q || profileFilter !== "all" ? (
                <AlertCircle className="h-7 w-7 text-slate-400" />
              ) : (
                <UserRound className="h-7 w-7 text-slate-400" />
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
          <>
            <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="border-b border-surface-border bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Jastiper</th>
                      <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">WhatsApp</th>
                      <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Alamat / Lokasi</th>
                      <th className="px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em]">Kelengkapan</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-[0.12em]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {jastipers.map((jastiper) => {
                      const phone = jastiper.noTelpon?.trim() || "";
                      const address = jastiper.alamat?.trim() || "";
                      const isComplete = Boolean(phone && address);
                      const waNumber = toWaNumber(phone);
                      const locationUrl = normalizeLocationUrl(jastiper.shareLocationUrl);

                      return (
                        <tr key={jastiper.id} className="group transition-colors hover:bg-slate-50/70">
                          <td className="px-5 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mist text-sm font-extrabold text-brand-navy">
                                {jastiper.nama?.trim().charAt(0).toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0">
                                <div className="max-w-[240px] truncate text-sm font-extrabold tracking-tight text-slate-900" title={jastiper.nama}>
                                  {jastiper.nama}
                                </div>
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Partner jastip</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {waNumber ? (
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 font-mono text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                              >
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                {formatPhoneDisplay(phone)}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-xs font-semibold italic text-slate-400">
                                <Phone className="h-3.5 w-3.5" /> Tanpa nomor
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <div className="flex max-w-[320px] items-start gap-2 text-xs font-medium leading-relaxed text-slate-600" title={address}>
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="line-clamp-2">{address || <span className="italic text-slate-400">Alamat belum diisi</span>}</span>
                            </div>
                            {locationUrl && (
                              <a
                                href={locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-5 mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand-navy hover:underline"
                              >
                                <MapPinned className="h-3 w-3" /> Buka lokasi <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {isComplete ? (
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
                              <Button size="icon" variant="ghost" onClick={() => { setEditing(jastiper); setShowForm(true); }} aria-label={`Edit ${jastiper.nama}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(jastiper)} aria-label={`Hapus ${jastiper.nama}`} className="text-rose-500 hover:bg-rose-50 hover:text-rose-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {jastipers.map((jastiper) => {
                const phone = jastiper.noTelpon?.trim() || "";
                const address = jastiper.alamat?.trim() || "";
                const isComplete = Boolean(phone && address);
                const waNumber = toWaNumber(phone);
                const locationUrl = normalizeLocationUrl(jastiper.shareLocationUrl);

                return (
                  <article key={jastiper.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mist text-sm font-extrabold text-brand-navy">
                        {jastiper.nama?.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-extrabold text-slate-900">{jastiper.nama}</h3>
                          <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${isComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {isComplete ? "Lengkap" : "Perlu dilengkapi"}
                          </span>
                        </div>
                        <div className="mt-2 space-y-2 text-xs text-slate-600">
                          {waNumber ? (
                            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                              <Phone className="h-3.5 w-3.5" /> {formatPhoneDisplay(phone)}
                            </a>
                          ) : (
                            <p className="inline-flex items-center gap-2 italic text-slate-400"><Phone className="h-3.5 w-3.5" /> Tanpa nomor</p>
                          )}
                          <p className="flex items-start gap-2 leading-relaxed">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{address || <span className="italic text-slate-400">Alamat belum diisi</span>}</span>
                          </p>
                          {locationUrl && (
                            <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-navy">
                              <MapPinned className="h-3.5 w-3.5" /> Buka lokasi <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <Button variant="outline" onClick={() => { setEditing(jastiper); setShowForm(true); }} className="flex-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(jastiper)} className="text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" /> Hapus
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {hasMore && !loading && !loadError && (
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-xs font-medium text-slate-400">
              Menampilkan {loadedCount} dari {resultCount ?? "—"} jastiper
            </p>
            <Button
              variant="outline"
              onClick={loadMore}
              isLoading={loadingMore}
              className="min-w-44 border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              Muat 15 Lagi
            </Button>
          </div>
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
