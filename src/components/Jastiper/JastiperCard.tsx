import { motion } from "framer-motion";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Jastiper } from "../../types";
import { toWaNumber } from "../../utils/helpers";
import { formatPhoneDisplay } from "../../utils/phone";

interface JastiperCardProps {
  jastiper: Jastiper;
  onEdit: () => void;
  onDelete: () => void;
}

function Avatar({ name }: { name: string }) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  const gradients = [
    "from-indigo-500 to-violet-600 shadow-indigo-100",
    "from-rose-500 to-orange-500 shadow-rose-100",
    "from-emerald-500 to-teal-600 shadow-emerald-100",
    "from-blue-500 to-indigo-600 shadow-blue-100",
    "from-fuchsia-500 to-purple-600 shadow-fuchsia-100",
  ];
  const gradient = gradients[(initial.charCodeAt(0) || 0) % gradients.length];

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br text-lg font-black text-white shadow-lg sm:h-14 sm:w-14 sm:text-xl ${gradient}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function JastiperCard({ jastiper, onEdit, onDelete }: JastiperCardProps) {
  const hasPhone = Boolean(jastiper.noTelpon?.trim());
  const hasAddress = Boolean(jastiper.alamat?.trim());
  const isComplete = hasPhone && hasAddress;
  const waNumber = toWaNumber(jastiper.noTelpon);
  const rawLocationUrl = jastiper.shareLocationUrl?.trim() ?? "";
  const locationUrl = rawLocationUrl && !/^https?:\/\//i.test(rawLocationUrl)
    ? `https://${rawLocationUrl}`
    : rawLocationUrl;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_16px_38px_rgba(76,29,149,0.08)]"
    >
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar name={jastiper.nama} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-black uppercase tracking-tight text-slate-900 sm:text-base" title={jastiper.nama}>
              {jastiper.nama}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-violet-700">
                <ShieldCheck className="h-3 w-3" /> Partner Jastip
              </span>
              {isComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Lengkap
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                  Perlu dilengkapi
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl bg-slate-50/80 p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              hasPhone
                ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                : "border-slate-200 bg-white text-slate-400"
            }`}>
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">WhatsApp</p>
              {hasPhone ? (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate font-mono text-xs font-extrabold text-slate-700 transition-colors hover:text-emerald-700"
                >
                  {formatPhoneDisplay(jastiper.noTelpon)}
                </a>
              ) : (
                <p className="mt-0.5 truncate text-xs font-semibold italic text-slate-400">Nomor belum diisi</p>
              )}
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              hasAddress
                ? "border-rose-100 bg-rose-50 text-rose-500"
                : "border-slate-200 bg-white text-slate-400"
            }`}>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Alamat Depot</p>
              <p className={`mt-0.5 line-clamp-2 min-h-[32px] text-xs font-semibold leading-relaxed ${
                hasAddress ? "text-slate-600" : "italic text-slate-400"
              }`} title={jastiper.alamat}>
                {jastiper.alamat || "Alamat belum diisi"}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              locationUrl
                ? "border-violet-100 bg-violet-50 text-violet-600"
                : "border-slate-200 bg-white text-slate-400"
            }`}>
              <MapPinned className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Share Location</p>
              {locationUrl ? (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-700 transition-colors hover:text-violet-900 hover:underline"
                >
                  Buka Lokasi <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="mt-0.5 truncate text-xs font-semibold italic text-slate-400">Link belum diisi</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 p-3">
        {hasPhone ? (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98]"
            aria-label={`Hubungi ${jastiper.nama} melalui WhatsApp`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="truncate">WhatsApp</span>
          </a>
        ) : (
          <span className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-extrabold text-slate-500">
            <Phone className="h-3.5 w-3.5" /> Tanpa nomor
          </span>
        )}

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
          aria-label={`Edit ${jastiper.nama}`}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 active:scale-95"
          title="Hapus jastiper"
          aria-label={`Hapus ${jastiper.nama}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}
