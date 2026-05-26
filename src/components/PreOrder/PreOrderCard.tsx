import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Pencil, Trash2, CheckCircle2, Weight, Package,
  Calendar, User2, MessageCircle, ArrowRight
} from "lucide-react";
import { PreOrder, PreOrderStatus, DepartureSchedule } from "../../types";
import { formatIDR, formatDate } from "../../utils/format";
import { FlagID, FlagJP } from "../ui/Flags";

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PreOrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  Pending:     { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50 ring-1 ring-amber-200",   dot: "bg-amber-500" },
  Selesai:     { label: "Selesai",    color: "text-emerald-700", bg: "bg-emerald-50 ring-1 ring-emerald-200",dot: "bg-emerald-500" },
};

function StatusBadge({ status }: { status: PreOrderStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function RouteDisplay({ rute, className = "" }: { rute: string; className?: string }) {
  const isIDtoJP = rute === "Indonesia → Jepang";
  const isJPtoID = rute === "Jepang → Indonesia";

  if (isIDtoJP) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
          <FlagID size="sm" />
          <span className="text-slate-400 text-[9px] font-bold">→</span>
          <FlagJP size="sm" />
        </div>
        <span className="font-bold text-slate-600 text-[10px]">{rute}</span>
      </div>
    );
  }
  if (isJPtoID) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
          <FlagJP size="sm" />
          <span className="text-slate-400 text-[9px] font-bold">→</span>
          <FlagID size="sm" />
        </div>
        <span className="font-bold text-slate-600 text-[10px]">{rute}</span>
      </div>
    );
  }

  return <span className="font-bold text-slate-600 text-[10px]">{rute}</span>;
}

export function PreOrderCard({
  po,
  schedules,
  selected,
  onSelectToggle,
  onEdit,
  onDelete,
  onConvert,
  onToggleItemCheck,
}: {
  po: PreOrder;
  schedules: DepartureSchedule[];
  selected: boolean;
  onSelectToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onToggleItemCheck: (itemIdx: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canConvert = po.status === "Pending";
  const isSelesai = po.status === "Selesai";

  const initials = po.namaPelanggan
    ? po.namaPelanggan
        .split(" ")
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join("")
    : "";

  const handleShareWhatsApp = () => {
    const sch = schedules.find((s) => s.id === po.idJadwal);
    const lastDropDate = sch?.tanggalLastDrop ? formatDate(sch.tanggalLastDrop) : "-";
    const departureDate = po.tanggalBerangkat ? formatDate(po.tanggalBerangkat) : "-";
    const feeJastiper = sch?.hargaFeeJastiper ? formatIDR(sch.hargaFeeJastiper) : "Rp 0";

    const itemsText = po.items
      .map((item) => `${item.checked ? "✅" : "⬜"} ${item.namaBarang}`)
      .join("\n");

    const message = `*Jastiper:* ${po.namaJastiper || "-"}
*Rute:* ${po.rute || "-"}
*Last Drop:* ${lastDropDate}
*Keberangkatan:* ${departureDate}
*Fee Jastip:* ${feeJastiper} / Kg
*Konsumen:* ${po.namaPelanggan}
*Total Berat:* ${po.totalKg.toFixed(1)} Kg

*Daftar Barang:*
${itemsText}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const showToggle = po.items.length > 3;
  const displayedItems = showToggle && !expanded ? po.items.slice(0, 3) : po.items;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        selected
          ? "border-rose-500 ring-2 ring-rose-500/20"
          : isSelesai
          ? "border-emerald-100 hover:border-emerald-200/80"
          : "border-slate-100 hover:border-rose-200/80"
      }`}
    >
      {/* Top Banner Stripe */}
      <div
        className={`h-1 w-full bg-gradient-to-r ${
          isSelesai ? "from-emerald-500 to-teal-500" : "from-rose-500 to-pink-500"
        }`}
      />

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Header: Customer info & Actions */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <input
                type="checkbox"
                checked={selected}
                onChange={onSelectToggle}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 shrink-0 cursor-pointer"
                title="Pilih pre-order"
              />
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shadow-inner shrink-0 ${
                  isSelesai ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}
              >
                {initials || <User2 size={14} />}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate max-w-[140px]" title={po.namaPelanggan}>
                    {po.namaPelanggan}
                  </h4>
                  <StatusBadge status={po.status} />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-1">
                  Telp: {po.noTelponPelanggan || "-"}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={handleShareWhatsApp}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200"
                title="Bagikan ke WhatsApp"
              >
                <MessageCircle size={12} />
              </button>
              {!isSelesai && (
                <>
                  <button
                    onClick={onEdit}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 border border-transparent hover:border-rose-100 transition-all duration-200"
                    title="Hapus"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Route & Jastiper & Date Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100/60">
            <RouteDisplay rute={po.rute} />
            <div className="flex items-center gap-1.5 flex-wrap">
              {po.tanggalBerangkat && (
                <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs select-none">
                  <Calendar size={10} className="text-blue-600" />
                  {formatDate(po.tanggalBerangkat)}
                </span>
              )}
              <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100/30 shrink-0">
                Jastiper: <span className="text-slate-700 font-extrabold">{po.namaJastiper || "-"}</span>
              </span>
              {(() => {
                const sch = schedules.find((s) => s.id === po.idJadwal);
                if (!sch || !sch.hargaFeeJastiper) return null;
                return (
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs select-none">
                    Fee: {formatIDR(sch.hargaFeeJastiper)} / Kg
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Item List Container */}
        <div className="bg-slate-50/70 border border-slate-100/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Package size={11} className="text-slate-400 shrink-0" />
              {po.items.length} Jenis Barang
            </span>
          </div>

          <div className="space-y-2 border-t border-slate-200/50 pt-2.5">
            <div className={`space-y-2 ${expanded ? "max-h-40 overflow-y-auto custom-scrollbar pr-1" : ""}`}>
              {displayedItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5 select-none">
                  <label className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      onChange={() => onToggleItemCheck(i)}
                      disabled={isSelesai}
                      className={`rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors ${
                        isSelesai ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    />
                    <span
                      className={`font-semibold truncate pr-2 transition-all ${
                        item.checked ? "text-slate-400 line-through font-normal" : "text-slate-700"
                      }`}
                    >
                      {item.namaBarang}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {showToggle && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors mt-1 select-none"
              >
                {expanded ? (
                  <>Sembunyikan detail ▲</>
                ) : (
                  <>+ {po.items.length - 3} barang lainnya... (Lihat Semua ▾)</>
                )}
              </button>
            )}
          </div>

          {/* Weight Visual Tag */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[11px] font-bold text-slate-500">
            <span>Total Berat</span>
            <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
              <Weight size={11} className="text-rose-500" />
              {po.totalKg.toFixed(1)} Kg
            </span>
          </div>
        </div>

        {/* Notes speech bubble */}
        {po.catatan && (
          <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl relative">
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed flex gap-1 items-start">
              <span className="shrink-0 text-slate-400">📝</span>
              <span className="italic line-clamp-2">{po.catatan}</span>
            </p>
          </div>
        )}

        {/* Convert Button or Completed badge */}
        <div>
          {canConvert ? (
            <button
              onClick={onConvert}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5 hover:shadow-lg"
            >
              <ArrowRight size={13} strokeWidth="3" />
              Pindahkan ke Pesanan
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50/50 border border-emerald-100/60 rounded-xl text-xs font-bold text-emerald-600 select-none">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Sudah dipindahkan ke Pesanan
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
