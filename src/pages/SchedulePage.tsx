// src/pages/SchedulePage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Plus, CalendarDays, Pencil, Trash2, X, Plane, ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  subscribeSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  JadwalUpsert,
} from "../services/scheduleFirebase";
import { JadwalKeberangkatan, JadwalRute, JadwalStatus } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const RUTE_OPTIONS: JadwalRute[] = ["Indo → Jepang", "Jepang → Indo"];

const STATUS_CONFIG: Record<JadwalStatus, { label: string; color: string; bg: string; border: string }> = {
  open:   { label: "Open",    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  full:   { label: "Full",    color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200"    },
  closed: { label: "Closed",  color: "text-slate-600",   bg: "bg-slate-100",  border: "border-slate-200"  },
};

function formatTanggal(d: string) {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toInputDate(d: Date) {
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 10);
}

function isPast(tanggal: string) {
  return tanggal < toInputDate(new Date());
}

// ── RuteBadge ─────────────────────────────────────────────────────────────────
function RuteBadge({ rute }: { rute: JadwalRute }) {
  const isIndoToJp = rute === "Indo → Jepang";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border
      ${isIndoToJp
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-red-50 text-red-700 border-red-200"}`}
    >
      {isIndoToJp
        ? <><span>🇮🇩</span><ArrowRight className="w-3 h-3" /><span>🇯🇵</span></>
        : <><span>🇯🇵</span><ArrowLeft className="w-3 h-3" /><span>🇮🇩</span></>
      }
      {rute}
    </span>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────
function ScheduleFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: JadwalKeberangkatan | null;
  onClose: () => void;
  onSubmit: (val: JadwalUpsert) => Promise<void>;
}) {
  const [form, setForm] = useState<JadwalUpsert>({
    rute: initial?.rute ?? "Indo → Jepang",
    tanggal: initial?.tanggal ?? toInputDate(new Date()),
    keterangan: initial?.keterangan ?? "",
    status: initial?.status ?? "open",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[460px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800">
              {initial ? "Edit Jadwal" : "Tambah Jadwal"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Rute */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rute</label>
            <div className="grid grid-cols-2 gap-2">
              {RUTE_OPTIONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm(f => ({ ...f, rute: r }))}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-all
                    ${form.rute === r
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <RuteBadge rute={r} />
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal Keberangkatan</label>
            <Input
              type="date"
              value={form.tanggal}
              onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
              required
              className="w-full"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Keterangan</label>
            <Input
              placeholder="Misal: Batch Maret, Open order s/d 20 Mar..."
              value={form.keterangan ?? ""}
              onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              className="w-full"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
            <Select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: (e.target as any).value as JadwalStatus }))}
              className="w-full"
            >
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-[2] bg-slate-900 text-white hover:bg-slate-800"
            >
              {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah Jadwal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SchedulePage() {
  const [ruteFilter, setRuteFilter] = useState<"" | JadwalRute>("");
  const [schedules, setSchedules] = useState<JadwalKeberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<{ open: boolean; editing?: JadwalKeberangkatan | null }>({ open: false });
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeSchedules({ ruteFilter: ruteFilter || undefined }, (rows) => {
      setSchedules(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ruteFilter]);

  const { upcoming, past } = useMemo(() => {
    const up = schedules.filter(s => !isPast(s.tanggal));
    const pa = schedules.filter(s => isPast(s.tanggal));
    return { upcoming: up, past: pa };
  }, [schedules]);

  async function handleDelete(id: string) {
    if (!confirm("Hapus jadwal ini?")) return;
    await deleteSchedule(id);
  }

  async function handleSubmit(val: JadwalUpsert) {
    if (showForm.editing?.id) await updateSchedule(showForm.editing.id, val);
    else await createSchedule(val);
  }

  const FILTER_TABS = [
    { label: "Semua", value: "" as const },
    { label: "Indo → Jepang", value: "Indo → Jepang" as JadwalRute },
    { label: "Jepang → Indo", value: "Jepang → Indo" as JadwalRute },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Jadwal Keberangkatan
              </h1>
            </div>
            <Button
              onClick={() => setShowForm({ open: true, editing: null })}
              className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filter Tabs */}
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex gap-1 w-full sm:w-auto overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setRuteFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all
                ${ruteFilter === tab.value
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3" />
            Memuat jadwal...
          </div>
        )}

        {/* Upcoming */}
        {!loading && (
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <CalendarDays className="w-10 h-10 mb-3 text-slate-300" />
                <h3 className="text-base font-semibold text-slate-600">Belum ada jadwal mendatang</h3>
                <p className="text-sm mt-1">Klik tombol tambah untuk membuat jadwal baru.</p>
              </div>
            ) : upcoming.map(s => (
              <ScheduleCard
                key={s.id}
                item={s}
                onEdit={() => setShowForm({ open: true, editing: s })}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}

        {/* Past schedules toggle */}
        {!loading && past.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {showPast ? "Sembunyikan" : `Lihat ${past.length} jadwal lalu`}
            </button>

            {showPast && (
              <div className="mt-3 space-y-3">
                {past.map(s => (
                  <ScheduleCard
                    key={s.id}
                    item={s}
                    past
                    onEdit={() => setShowForm({ open: true, editing: s })}
                    onDelete={() => handleDelete(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowForm({ open: true, editing: null })}
        className="sm:hidden fixed bottom-20 right-6 h-14 w-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Form Modal */}
      {showForm.open && (
        <ScheduleFormModal
          initial={showForm.editing}
          onClose={() => setShowForm({ open: false })}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────────────────
function ScheduleCard({
  item, past = false, onEdit, onDelete,
}: {
  item: JadwalKeberangkatan;
  past?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIndoToJp = item.rute === "Indo → Jepang";
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 transition-all hover:shadow-md ${past ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="hidden sm:flex w-12 h-12 rounded-full bg-slate-50 border border-slate-100 items-center justify-center shrink-0 text-2xl shadow-sm">
          {isIndoToJp ? "🇮🇩" : "🇯🇵"}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="sm:hidden w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-white shadow-sm overflow-hidden text-xs">
              {isIndoToJp ? "🇮🇩" : "🇯🇵"}
            </div>
            <h3 className="text-base font-bold text-slate-800 truncate">{item.rute}</h3>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            {past && (
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full shrink-0">Lewat</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">{formatTanggal(item.tanggal)}</span>
            </div>
            {item.keterangan && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">{item.keterangan}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-50 rounded-xl p-1 border border-slate-100">
          <button
            onClick={onEdit}
            className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            onClick={onDelete}
            className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

