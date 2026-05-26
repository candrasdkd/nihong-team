import React from "react";
import { motion } from "framer-motion";
import { Plane, User, Pencil, Trash2, Clock, Weight, Coins } from "lucide-react";
import { DepartureSchedule } from "../../types";
import { FlagID, FlagJP } from "../ui/Flags";
import { formatIDR } from "../../utils/format";
import { StatusBadge } from "./StatusBadge";

interface ScheduleCardProps {
  schedule: DepartureSchedule;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScheduleCard({ schedule, onEdit, onDelete }: ScheduleCardProps) {
  const formatDate = (d: string) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  const percentage = Math.min(100, Math.round(((schedule.beratTerpakai || 0) / (schedule.slotBeratKg || 1)) * 100));

  // Choose progress bar color based on weight usage percentage
  const progressBarColor =
    percentage >= 90
      ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
      : percentage >= 75
        ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
        : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(59,130,246,0.2)]";

  const isIDtoJP = schedule.rute === "Indonesia → Jepang";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200/80 transition-all duration-300 overflow-hidden flex flex-col justify-between"
    >
      {/* Top Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />

      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Header: Route Visual & Status Badge */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Route visual map */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl shadow-sm shrink-0">
                {isIDtoJP ? (
                  <>
                    <FlagID size="sm" />
                    <div className="flex flex-col items-center px-0.5">
                      <Plane size={9} className="text-blue-500 animate-pulse" />
                      <span className="text-slate-300 text-[8px] font-black -mt-0.5">➔</span>
                    </div>
                    <FlagJP size="sm" />
                  </>
                ) : (
                  <>
                    <FlagJP size="sm" />
                    <div className="flex flex-col items-center px-0.5">
                      <Plane size={9} className="text-blue-500 animate-pulse rotate-180" />
                      <span className="text-slate-300 text-[8px] font-black -mt-0.5">➔</span>
                    </div>
                    <FlagID size="sm" />
                  </>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Rute</span>
                <span className="font-extrabold text-slate-800 text-xs tracking-tight">{schedule.rute}</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              <StatusBadge status={schedule.status} />
            </div>
          </div>

          {/* Jastiper avatar row */}
          <div className="flex items-center justify-between bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600 font-extrabold text-xs shadow-inner shrink-0">
                {schedule.namaJastiper ? schedule.namaJastiper.charAt(0).toUpperCase() : <User size={12} />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Jastiper</span>
                <span className="text-xs font-extrabold text-slate-700 truncate">{schedule.namaJastiper}</span>
              </div>
            </div>

            {/* Quick Actions (clean buttons with hover micro-animations) */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all duration-200"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-rose-100 transition-all duration-200"
                title="Hapus"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Boarding-pass Style Timeline for Dates */}
        <div className="relative flex items-center justify-between gap-2 py-2 px-1 bg-slate-50/30 rounded-2xl border border-slate-50/50">
          {/* Left: Last Drop */}
          <div className="flex-1 flex flex-col items-start pl-2">
            <span className="text-[8px] font-extrabold text-amber-600 uppercase tracking-widest flex items-center gap-1">
              <Clock size={9} />
              Last Drop
            </span>
            <span className="text-sm font-black text-slate-800 mt-1 leading-none">
              {formatDate(schedule.tanggalLastDrop).split(" ")[0]}
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
              {formatDate(schedule.tanggalLastDrop).split(" ").slice(1).join(" ")}
            </span>
          </div>

          {/* Connected plane timeline line */}
          <div className="flex-1 flex items-center justify-center relative px-1 select-none">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-slate-200" />
            <div className="relative z-10 w-6 h-6 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center">
              <Plane size={10} className="text-slate-400 transform rotate-45" />
            </div>
          </div>

          {/* Right: Departure */}
          <div className="flex-1 flex flex-col items-end text-right pr-2">
            <span className="text-[8px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1 justify-end">
              <Plane size={9} className="rotate-45" />
              Berangkat
            </span>
            <span className="text-sm font-black text-slate-800 mt-1 leading-none">
              {formatDate(schedule.tanggalBerangkat).split(" ")[0]}
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
              {formatDate(schedule.tanggalBerangkat).split(" ").slice(1).join(" ")}
            </span>
          </div>
        </div>

        {/* Capacity / Weight Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Weight size={12} className="text-slate-400 shrink-0" />
              Kapasitas Terisi
            </span>
            <span className="font-extrabold text-slate-800">
              {schedule.beratTerpakai} / {schedule.slotBeratKg} Kg{" "}
              <span className="text-slate-400 font-semibold">({percentage}%)</span>
            </span>
          </div>

          {/* Animated Progress track */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
            />
          </div>

          {/* Fee Jastip Info */}
          <div className="flex items-center justify-between text-[11px] font-bold pt-0.5">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Coins size={12} className="text-slate-400 shrink-0" />
              Fee Jastip
            </span>
            <span className="font-extrabold text-slate-800">
              {schedule.hargaFeeJastiper ? formatIDR(schedule.hargaFeeJastiper) : "Rp 0"}{" "}
              <span className="text-slate-400 font-semibold">/ Kg</span>
            </span>
          </div>
        </div>

        {/* Note Bubble at the bottom */}
        {schedule.catatan && (
          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed flex gap-1 items-start">
              <span className="shrink-0 text-slate-400">📝</span>
              <span className="italic line-clamp-2">{schedule.catatan}</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
