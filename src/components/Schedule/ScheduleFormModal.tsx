import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, X, Search, ChevronDown, CheckCircle2 } from "lucide-react";
import { DepartureSchedule, Jastiper, ScheduleStatus } from "../../types";
import { FlagID, FlagJP } from "../ui/Flags";
import { RupiahInput } from "../ui/RupiahInput";
import { Button } from "../ui/Button";

interface ScheduleFormModalProps {
  initial?: DepartureSchedule | null;
  jastipers: Jastiper[];
  onClose: () => void;
  onSubmit: (data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">) => Promise<void>;
}

const SCHEDULE_STATUSES: ScheduleStatus[] = ["Open", "Closed"];

export function ScheduleFormModal({ initial, jastipers, onClose, onSubmit }: ScheduleFormModalProps) {
  const [idJastiper, setIdJastiper] = useState(initial?.idJastiper || "");
  const [rute, setRute] = useState(initial?.rute || "");
  const [tanggalBerangkat, setTanggalBerangkat] = useState(initial?.tanggalBerangkat || "");
  const [tanggalLastDrop, setTanggalLastDrop] = useState(initial?.tanggalLastDrop || "");
  const [slotBeratKg, setSlotBeratKg] = useState(String(initial?.slotBeratKg || ""));
  const [status, setStatus] = useState<ScheduleStatus>(initial?.status || "Open");
  const [catatan, setCatatan] = useState(initial?.catatan || "");
  const [hargaFeeJastiper, setHargaFeeJastiper] = useState<number>(initial?.hargaFeeJastiper || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jastiperSearch, setJastiperSearch] = useState("");
  const [showJastiperDropdown, setShowJastiperDropdown] = useState(false);
  const jastiperDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
    return jastipers.filter((j) => j.nama.toLowerCase().includes(jastiperSearch.toLowerCase()));
  }, [jastipers, jastiperSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idJastiper) {
      setError("Pilih Jastiper terlebih dahulu.");
      return;
    }
    if (!rute.trim()) {
      setError("Rute pengiriman wajib diisi.");
      return;
    }
    if (!tanggalBerangkat) {
      setError("Tanggal Keberangkatan wajib diisi.");
      return;
    }
    if (!tanggalLastDrop) {
      setError("Tanggal Last Drop wajib diisi.");
      return;
    }

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
        hargaFeeJastiper: Number(hargaFeeJastiper) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-800 transition-all";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
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
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {error}
              </div>
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
                <p className="text-[11px] text-amber-600 font-semibold">
                  ⚠ Belum ada jastiper terdaftar. Tambah dulu di menu Jastiper.
                </p>
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

            {/* Weight & Fee & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Slot Berat (Kg) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  data-keyboard-type="numeric"
                  value={slotBeratKg}
                  onChange={(e) => setSlotBeratKg(e.target.value)}
                  placeholder="Contoh: 50"
                  min="0"
                  step="0.5"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Fee Jastiper</label>
                <RupiahInput
                  currency="IDR"
                  label=""
                  value={hargaFeeJastiper}
                  onChange={setHargaFeeJastiper}
                  placeholder="Rp 0"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Status Jadwal</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
                  className={fieldClass}
                >
                  {SCHEDULE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
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
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
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
