import React from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Jastiper } from "../../types";

interface JastiperCardProps {
  jastiper: Jastiper;
  idx: number;
  onEdit: () => void;
  onDelete: () => void;
}

function Avatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colorGradients = [
    "from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-100",
    "from-rose-500 via-orange-500 to-yellow-500 shadow-rose-100",
    "from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-100",
    "from-blue-500 via-sky-500 to-indigo-600 shadow-blue-100",
    "from-fuchsia-500 via-purple-600 to-violet-700 shadow-fuchsia-100",
  ];
  const charCode = name.charCodeAt(0) || 0;
  const gradientIdx = charCode % colorGradients.length;

  return (
    <div
      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorGradients[gradientIdx]} flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg border border-white/20 select-none`}
    >
      {initial}
    </div>
  );
}

export function JastiperCard({ jastiper, idx, onEdit, onDelete }: JastiperCardProps) {
  const waNumber = jastiper.noTelpon
    ? jastiper.noTelpon.replace(/\D/g, "").replace(/^0/, "62")
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="bg-white rounded-3xl p-6 border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(109,40,217,0.06)] hover:border-violet-200/80 transition-all duration-300 group flex flex-col justify-between"
    >
      {/* Top section: Avatar, Info, Actions */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={jastiper.nama} />
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-base truncate tracking-tight uppercase leading-tight">
                {jastiper.nama}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-100">
                  <ShieldCheck size={10} className="stroke-[2.5]" /> Partner
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">• Active</span>
              </div>
            </div>
          </div>

          {/* Actions with premium glassmorphism hover effect */}
          <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-250">
            <button
              onClick={onEdit}
              className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100/50 transition-all"
              title="Edit"
            >
              <Pencil size={14} className="stroke-[2.5]" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/50 transition-all"
              title="Hapus"
            >
              <Trash2 size={14} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-px bg-slate-100/80 my-4" />

        {/* Detailed Address & Contact info with custom interactive elements */}
        <div className="space-y-3">
          {jastiper.noTelpon ? (
            <div className="flex items-center gap-3 group/item">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Phone size={13} className="text-emerald-500 stroke-[2.5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">WhatsApp</span>
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-700 text-xs mt-1 hover:text-emerald-600 hover:underline transition-colors truncate"
                >
                  {jastiper.noTelpon}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <Phone size={13} className="text-slate-300 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">WhatsApp</span>
                <span className="font-semibold text-slate-400 text-xs mt-1 italic">Tidak ada nomor HP</span>
              </div>
            </div>
          )}

          {jastiper.alamat ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={13} className="text-rose-400 stroke-[2.5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Alamat Depot</span>
                <span className="font-bold text-slate-600 text-xs mt-1 leading-relaxed line-clamp-2">
                  {jastiper.alamat}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <MapPin size={13} className="text-slate-300 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Alamat Depot</span>
                <span className="font-semibold text-slate-400 text-xs mt-1 italic">Alamat belum diisi</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
