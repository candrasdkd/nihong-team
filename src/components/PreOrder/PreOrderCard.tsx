import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pencil, Trash2, CheckCircle2, Package,
  MessageCircle, ArrowRight, ChevronDown, Weight,
} from "lucide-react";
import { PreOrder, PreOrderStatus, DepartureSchedule } from "../../types";
import { formatIDR, formatDate } from "../../utils/format";

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PreOrderStatus, { label: string; cls: string }> = {
  Pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  Selesai: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
};

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, done }: { name: string; done: boolean }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase()).join("")
    : "?";
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 select-none
        ${done ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
    >
      {initials}
    </div>
  );
}

// ─── Main Card ───────────────────────────────────────────────────────────────
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
  const isSelesai = po.status === "Selesai";
  const cfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.Pending;

  const checkedCount = po.items.filter((i) => i.checked).length;
  const totalItems = po.items.length;

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

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 active:scale-[0.99]
        ${selected
          ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/30"
          : isSelesai
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-white"
        }`}
    >
      {/* Accent stripe */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${isSelesai ? "from-emerald-400 to-teal-400" : "from-rose-500 to-pink-500"}`} />

      {/* ── Main Row (always visible) ── */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelectToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 shrink-0 cursor-pointer"
        />

        {/* Avatar */}
        <Avatar name={po.namaPelanggan} done={isSelesai} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p className="font-extrabold text-slate-800 text-sm truncate leading-tight">
              {po.namaPelanggan}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 select-none ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Weight + items summary */}
          <div className="flex items-center gap-3 mt-1">
            <span className={`flex items-center gap-1 text-[11px] font-extrabold ${isSelesai ? "text-emerald-600" : "text-rose-600"}`}>
              <Weight size={11} />
              {po.totalKg.toFixed(1)} Kg
            </span>
            {totalItems > 0 && (
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Package size={11} />
                {totalItems} barang
                {checkedCount > 0 && (
                  <span className="text-emerald-500 font-bold">({checkedCount}✓)</span>
                )}
              </span>
            )}
          </div>

          {/* Phone */}
          {po.noTelponPelanggan && (
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
              {po.noTelponPelanggan}
            </p>
          )}
        </div>

        {/* Quick action icons */}
        <div className="flex items-center gap-0.5 shrink-0 self-start">
          <button
            onClick={handleShareWhatsApp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Bagikan WA"
          >
            <MessageCircle size={13} />
          </button>
          {!isSelesai && (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Hapus"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t border-slate-100 transition-colors select-none"
      >
        {expanded ? "Sembunyikan" : "Lihat Detail"}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ChevronDown size={12} strokeWidth={3} />
        </motion.span>
      </button>

      {/* ── Expanded detail ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3 pt-2 space-y-3 border-t border-slate-100">

              {/* Schedule info row */}
              {(() => {
                const sch = schedules.find((s) => s.id === po.idJadwal);
                return (
                  <div className="flex flex-wrap gap-2">
                    {po.tanggalBerangkat && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg select-none">
                        🛫 {formatDate(po.tanggalBerangkat)}
                      </span>
                    )}
                    {po.namaJastiper && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg select-none">
                        {po.namaJastiper}
                      </span>
                    )}
                    {sch?.hargaFeeJastiper && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg select-none">
                        {formatIDR(sch.hargaFeeJastiper)}/Kg
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Item checklist */}
              {po.items.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                    Daftar Barang
                  </p>
                  {po.items.map((item, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-2.5 py-1 px-1 rounded-lg cursor-pointer select-none group ${
                        isSelesai ? "cursor-default" : "hover:bg-slate-100 active:bg-slate-200"
                      } transition-colors`}
                    >
                      <input
                        type="checkbox"
                        checked={!!item.checked}
                        onChange={() => onToggleItemCheck(i)}
                        disabled={isSelesai}
                        className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 w-3.5 h-3.5 shrink-0"
                      />
                      <span
                        className={`text-xs font-semibold flex-1 transition-colors ${
                          item.checked ? "line-through text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {item.namaBarang}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Notes */}
              {po.catatan && (
                <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <span className="shrink-0 text-slate-400 text-sm">📝</span>
                  <p className="text-[10px] font-semibold text-slate-500 italic leading-relaxed line-clamp-3">
                    {po.catatan}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Convert / Done button ── */}
      <div className="px-3.5 pb-3.5 pt-1">
        {!isSelesai ? (
          <button
            onClick={onConvert}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-extrabold shadow-sm shadow-emerald-500/30 transition-all active:scale-95"
          >
            <ArrowRight size={13} strokeWidth={3} />
            Pindahkan ke Pesanan
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-600 select-none">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Sudah dipindahkan ke Pesanan
          </div>
        )}
      </div>
    </motion.div>
  );
}
