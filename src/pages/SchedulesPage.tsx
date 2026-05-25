import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Pencil, Trash2, Search, Clock, Weight,
  Plane, CheckCircle2, AlertCircle, X, ChevronDown, Info,
  Filter, User,
} from "lucide-react";
import { DepartureSchedule, Jastiper, ScheduleStatus } from "../types";
import { listenSchedules, addSchedule, updateSchedule, deleteSchedule } from "../services/schedulesFirebase";
import { listenJastipers } from "../services/jastipersFirebase";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";
import { FlagID, FlagJP } from "../components/ui/Flags";

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bg: string; ring: string; icon: React.ElementType }> = {
  Open:       { label: "Open",      color: "text-emerald-700", bg: "bg-emerald-50",   ring: "ring-emerald-200",  icon: CheckCircle2 },
  Closed:     { label: "Closed",    color: "text-slate-600",   bg: "bg-slate-100",    ring: "ring-slate-200",    icon: X },
};

function StatusBadge({ status }: { status: ScheduleStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Closed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastMsg = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
            t.type === "error" ? "bg-white border-red-200 text-red-700" : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="ml-2 p-0.5 rounded-full hover:bg-black/10"><X size={14} /></button>
        </motion.div>
      ))}
    </div>
  );
}

const SCHEDULE_STATUSES: ScheduleStatus[] = ["Open", "Closed"];

function ScheduleFormModal({
  initial,
  jastipers,
  onClose,
  onSubmit,
}: {
  initial?: DepartureSchedule | null;
  jastipers: Jastiper[];
  onClose: () => void;
  onSubmit: (data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">) => Promise<void>;
}) {
  const [idJastiper, setIdJastiper] = useState(initial?.idJastiper || "");
  const [rute, setRute] = useState(initial?.rute || "");
  const [tanggalBerangkat, setTanggalBerangkat] = useState(initial?.tanggalBerangkat || "");
  const [tanggalLastDrop, setTanggalLastDrop] = useState(initial?.tanggalLastDrop || "");
  const [slotBeratKg, setSlotBeratKg] = useState(String(initial?.slotBeratKg || ""));
  const [status, setStatus] = useState<ScheduleStatus>(initial?.status || "Open");
  const [catatan, setCatatan] = useState(initial?.catatan || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jastiperSearch, setJastiperSearch] = useState("");
  const [showJastiperDropdown, setShowJastiperDropdown] = useState(false);
  const jastiperDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (jastiperDropdownRef.current && !jastiperDropdownRef.current.contains(event.target as Node)) {
        setShowJastiperDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedJastiper = jastipers.find((j) => j.id === idJastiper);

  const filteredJastipers = useMemo(() => {
    return jastipers.filter((j) =>
      j.nama.toLowerCase().includes(jastiperSearch.toLowerCase())
    );
  }, [jastipers, jastiperSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idJastiper) { setError("Pilih Jastiper terlebih dahulu."); return; }
    if (!rute.trim()) { setError("Rute pengiriman wajib diisi."); return; }
    if (!tanggalBerangkat) { setError("Tanggal Keberangkatan wajib diisi."); return; }
    if (!tanggalLastDrop) { setError("Tanggal Last Drop wajib diisi."); return; }

    setLoading(true);
    try {
      await onSubmit({
        idJastiper,
        namaJastiper: selectedJastiper?.nama || "",
        rute: rute.trim(),
        tanggalBerangkat,
        tanggalLastDrop,
        slotBeratKg: Number(slotBeratKg) || 0,
        status,
        catatan: catatan.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-800 transition-all";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border-t-4 border-t-blue-500 z-10 max-h-[92vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar size={18} className="text-blue-600" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {initial ? "Edit Jadwal" : "Jadwal Keberangkatan Baru"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">{error}</div>
            )}

            {/* Jastiper Select */}
            <div className="space-y-1.5 relative" ref={jastiperDropdownRef}>
              <label className={labelClass}>Jastiper *</label>
              <button
                type="button"
                onClick={() => setShowJastiperDropdown((prev) => !prev)}
                className={`${fieldClass} text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors`}
              >
                <span className={selectedJastiper ? "text-slate-800" : "text-slate-400"}>
                  {selectedJastiper ? selectedJastiper.nama : "— Pilih Jastiper —"}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showJastiperDropdown ? "rotate-180" : ""}`} />
              </button>

              {showJastiperDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={jastiperSearch}
                      onChange={(e) => setJastiperSearch(e.target.value)}
                      placeholder="Cari jastiper..."
                      className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 py-1"
                      autoFocus
                    />
                    {jastiperSearch && (
                      <button
                        type="button"
                        onClick={() => setJastiperSearch("")}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-44 py-1 divide-y divide-slate-50">
                    {filteredJastipers.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                        Tidak ada jastiper ditemukan
                      </div>
                    ) : (
                      filteredJastipers.map((j) => {
                        const isSelected = j.id === idJastiper;
                        return (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                              setIdJastiper(j.id);
                              setShowJastiperDropdown(false);
                              setJastiperSearch("");
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{j.nama}</span>
                            {isSelected && <CheckCircle2 size={12} className="text-blue-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {jastipers.length === 0 && (
                <p className="text-[11px] text-amber-600 font-semibold">⚠ Belum ada jastiper terdaftar. Tambah dulu di menu Jastiper.</p>
              )}
            </div>

            {/* Rute */}
            <div className="space-y-1.5">
              <label className={labelClass}>Rute Pengiriman *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "Indonesia → Jepang", label: "Indonesia → Jepang", isIDtoJP: true },
                  { value: "Jepang → Indonesia", label: "Jepang → Indonesia", isIDtoJP: false },
                ].map((opt) => {
                  const isSelected = rute === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRute(opt.value)}
                      className={`flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/20 scale-[1.02]"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
                        {opt.isIDtoJP ? (
                          <>
                            <FlagID size="md" />
                            <span className="text-slate-400 text-xs font-black">→</span>
                            <FlagJP size="md" />
                          </>
                        ) : (
                          <>
                            <FlagJP size="md" />
                            <span className="text-slate-400 text-xs font-black">→</span>
                            <FlagID size="md" />
                          </>
                        )}
                      </div>
                      <span className="text-[11px] font-extrabold tracking-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Tanggal Last Drop *</label>
                <input
                  type="date"
                  value={tanggalLastDrop}
                  onChange={(e) => setTanggalLastDrop(e.target.value)}
                  className={fieldClass}
                />
                <p className="text-[10px] text-slate-400 font-medium">Batas akhir konsumen titip barang</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Tanggal Keberangkatan *</label>
                <input
                  type="date"
                  value={tanggalBerangkat}
                  onChange={(e) => setTanggalBerangkat(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Weight & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Slot Berat Total (Kg) *</label>
                <input
                  type="number"
                  value={slotBeratKg}
                  onChange={(e) => setSlotBeratKg(e.target.value)}
                  placeholder="Contoh: 50"
                  min="0"
                  step="0.5"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Status Jadwal</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ScheduleStatus)} className={fieldClass}>
                  {SCHEDULE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className={labelClass}>Catatan (Opsional)</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan tambahan jadwal..."
                rows={3}
                className={`${fieldClass} resize-none`}
              />
            </div>
          </form>

          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button
              onClick={handleSubmit as any}
              isLoading={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-600/20"
            >
              {initial ? "Simpan Perubahan" : "Buat Jadwal"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: DepartureSchedule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatDate = (d: string) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d; }
  };

  const percentage = Math.min(100, Math.round(((schedule.beratTerpakai || 0) / (schedule.slotBeratKg || 1)) * 100));
  
  // Choose progress bar color based on weight usage percentage
  const progressBarColor = percentage >= 90 
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
            <span className="text-sm font-black text-slate-800 mt-1 leading-none">{formatDate(schedule.tanggalLastDrop).split(" ")[0]}</span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{formatDate(schedule.tanggalLastDrop).split(" ").slice(1).join(" ")}</span>
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
            <span className="text-sm font-black text-slate-800 mt-1 leading-none">{formatDate(schedule.tanggalBerangkat).split(" ")[0]}</span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{formatDate(schedule.tanggalBerangkat).split(" ").slice(1).join(" ")}</span>
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
              {schedule.beratTerpakai} / {schedule.slotBeratKg} Kg <span className="text-slate-400 font-semibold">({percentage}%)</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DepartureSchedule | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const unsubS = listenSchedules((rows) => {
      setSchedules(rows);
      setLoading(false);

      // Auto-close schedules whose departure date has already passed
      const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      rows.forEach((sch) => {
        if (sch.status === "Open" && sch.tanggalBerangkat < todayStr) {
          updateSchedule(sch.id, { status: "Closed" }).catch(() => {});
        }
      });
    });
    const unsubJ = listenJastipers((rows) => setJastipers(rows));
    return () => { unsubS(); unsubJ(); };
  }, []);

  const filtered = useMemo(() => {
    let list = schedules;
    if (statusFilter) list = list.filter((s) => s.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (sch) =>
          sch.rute.toLowerCase().includes(s) ||
          sch.namaJastiper.toLowerCase().includes(s),
      );
    }
    return list;
  }, [schedules, statusFilter, q]);

  // Reset pagination whenever search query or status filter changes
  useEffect(() => {
    setVisibleCount(10);
  }, [q, statusFilter]);

  const visibleSchedules = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  function addToast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleSubmit(data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">) {
    if (editing) {
      await updateSchedule(editing.id, data);
      addToast("Jadwal berhasil diperbarui", "success");
    } else {
      await addSchedule(data);
      addToast("Jadwal keberangkatan berhasil dibuat", "success");
    }
  }

  function handleDelete(s: DepartureSchedule) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Jadwal",
      message: `Yakin ingin menghapus jadwal "${s.rute}" tanggal ${s.tanggalBerangkat}?`,
      onConfirm: async () => {
        try {
          await deleteSchedule(s.id);
          addToast("Jadwal berhasil dihapus", "success");
        } catch {
          addToast("Gagal menghapus jadwal", "error");
        }
      },
    });
  }

  const openCount = schedules.filter((s) => s.status === "Open").length;

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <ToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Jadwal Keberangkatan ✈️
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola jadwal perjalanan jastiper dan kapasitas berat.
          </p>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2a4a] via-[#1a3f6f] to-[#0c2a4a] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-sky-400/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold text-blue-300 mb-3">
                <Calendar size={12} />
                <span>Manajemen Jadwal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Jadwal Keberangkatan ✈️
              </h2>
              <p className="text-slate-400 mt-1.5 text-sm max-w-lg">
                Buat dan kelola jadwal perjalanan jastiper. Pantau kapasitas berat dan batas titip barang dari konsumen.
              </p>
            </div>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 font-bold px-5 py-2.5 rounded-xl border border-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Buat Jadwal
            </Button>
          </div>
        </motion.div>

        {/* Stats + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-700">{schedules.length} Total Jadwal</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{openCount} Open</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl p-1 ml-auto">
            {["", ...SCHEDULE_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {s || "Semua"}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari rute atau nama jastiper..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm transition-all"
          />
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-2 bg-slate-200 rounded-full w-full mt-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 shadow-inner">
              <Calendar size={32} className="text-blue-300" />
            </div>
            <h3 className="font-extrabold text-slate-700 text-lg mb-1">
              {q || statusFilter ? "Jadwal Tidak Ditemukan" : "Belum Ada Jadwal"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              {q || statusFilter ? "Coba ubah filter atau kata kunci." : "Buat jadwal keberangkatan pertama Anda."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {visibleSchedules.map((sch) => (
                  <ScheduleCard
                    key={sch.id}
                    schedule={sch}
                    onEdit={() => { setEditing(sch); setShowForm(true); }}
                    onDelete={() => handleDelete(sch)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {filtered.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3">
                <p className="text-xs text-slate-500 font-bold">
                  Menampilkan <span className="text-slate-800">{Math.min(visibleCount, filtered.length)}</span> dari{" "}
                  <span className="text-slate-800">{filtered.length}</span> jadwal keberangkatan
                </p>
                <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(Math.min(visibleCount, filtered.length) / filtered.length) * 100}%` }}
                  />
                </div>
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  variant="outline"
                  className="px-6 py-2 rounded-xl text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-800 shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  Muat Lebih Banyak ▾
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className={`sm:hidden fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 ${FAB_COLOR_CLASS}`}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {showForm && (
        <ScheduleFormModal
          initial={editing}
          jastipers={jastipers}
          onClose={() => { setShowForm(false); setEditing(null); }}
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
            onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

