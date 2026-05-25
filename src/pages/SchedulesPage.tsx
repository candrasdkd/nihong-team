import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Pencil, Trash2, Search, Clock, Weight,
  Plane, CheckCircle2, AlertCircle, X, ChevronDown, Info,
  Filter,
} from "lucide-react";
import { DepartureSchedule, Jastiper, ScheduleStatus } from "../types";
import { listenSchedules, addSchedule, updateSchedule, deleteSchedule } from "../services/schedulesFirebase";
import { listenJastipers } from "../services/jastipersFirebase";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const selectedJastiper = jastipers.find((j) => j.id === idJastiper);

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
            <div className="space-y-1.5">
              <label className={labelClass}>Jastiper *</label>
              <select
                value={idJastiper}
                onChange={(e) => setIdJastiper(e.target.value)}
                className={fieldClass}
              >
                <option value="">— Pilih Jastiper —</option>
                {jastipers.map((j) => (
                  <option key={j.id} value={j.id}>{j.nama}</option>
                ))}
              </select>
              {jastipers.length === 0 && (
                <p className="text-[11px] text-amber-600 font-semibold">⚠ Belum ada jastiper terdaftar. Tambah dulu di menu Jastiper.</p>
              )}
            </div>

            {/* Rute */}
            <div className="space-y-1.5">
              <label className={labelClass}>Rute Pengiriman *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "Indonesia → Jepang", flag: "🇮🇩→🇯🇵", label: "Indonesia → Jepang" },
                  { value: "Jepang → Indonesia", flag: "🇯🇵→🇮🇩", label: "Jepang → Indonesia" },
                ].map((opt) => {
                  const isSelected = rute === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRute(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/20 scale-[1.02]"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xl leading-none">{opt.flag}</span>
                      <span className="text-[11px] font-extrabold tracking-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Tanggal Keberangkatan *</label>
                <input
                  type="date"
                  value={tanggalBerangkat}
                  onChange={(e) => setTanggalBerangkat(e.target.value)}
                  className={fieldClass}
                />
              </div>
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-200/60 transition-all duration-300 group overflow-hidden"
    >
      {/* Top stripe */}
      <div className="h-1 w-full bg-blue-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{schedule.rute}</h3>
              <StatusBadge status={schedule.status} />
            </div>
            <p className="text-xs text-slate-500 font-semibold">Jastiper: <span className="text-slate-700">{schedule.namaJastiper}</span></p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Hapus">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Berangkat</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
              <Plane size={12} className="text-blue-500 shrink-0" />
              {formatDate(schedule.tanggalBerangkat)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Last Drop</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
              <Clock size={12} className="text-amber-500 shrink-0" />
              {formatDate(schedule.tanggalLastDrop)}
            </div>
          </div>
        </div>

        {/* Weight Box */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl mt-2 select-none">
          <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
            <Weight size={13} className="text-slate-400" />
            Total Berat Terisi:
          </span>
          <span className="font-extrabold text-slate-800 text-sm">
            {schedule.beratTerpakai} / {schedule.slotBeratKg} Kg
          </span>
        </div>

        {schedule.catatan && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 italic line-clamp-2">📝 {schedule.catatan}</p>
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
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((sch) => (
                <ScheduleCard
                  key={sch.id}
                  schedule={sch}
                  onEdit={() => { setEditing(sch); setShowForm(true); }}
                  onDelete={() => handleDelete(sch)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
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

