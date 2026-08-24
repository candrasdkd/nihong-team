// src/components/NihongStore/AssignScheduleModal.tsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plane,
  User,
  Weight,
  CheckCircle2,
  X,
  AlertCircle,
  Package,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  NihongStoreOrder,
  DepartureSchedule,
  Customer,
} from "../../types";
import { formatDate, formatIDR } from "../../utils/format";
import { Button } from "../ui/Button";

interface AssignScheduleModalProps {
  isOpen: boolean;
  orders: NihongStoreOrder[];
  schedules: DepartureSchedule[];
  customers: Customer[];
  onClose: () => void;
  onConfirm: (
    scheduleId: string,
    options?: {
      customTotalKg?: number;
      customerId?: string;
      pic?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

function parseHighlightDate(dateStr?: string) {
  if (!dateStr) {
    return { day: "—", month: "TANPA", year: "", dayName: "Info" };
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, "0");
    const d = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
    const month = monthNames[monthIndex] || parts[1];
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = !isNaN(d.getDay()) ? dayNames[d.getDay()] : "";
    return { day, month, year, dayName };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { day: "—", month: "TGL", year: "", dayName: "" };
  }
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();
  const year = d.getFullYear().toString();
  const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
  return { day, month, year, dayName };
}

export function AssignScheduleModal({
  isOpen,
  orders,
  schedules,
  customers,
  onClose,
  onConfirm,
}: AssignScheduleModalProps) {
  const isBatch = orders.length > 1;
  const singleOrder = orders.length === 1 ? orders[0] : null;

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [totalKg, setTotalKg] = useState<string>(
    singleOrder ? String(singleOrder.totalKg || 0.5) : ""
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    singleOrder?.idPelanggan || ""
  );
  const [pic, setPic] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when order changes
  React.useEffect(() => {
    if (singleOrder) {
      setTotalKg(String(singleOrder.totalKg || 0.5));
      setSelectedCustomerId(singleOrder.idPelanggan || "");
      setSelectedScheduleId("");
      setError(null);
    } else if (isBatch) {
      const combinedKg = orders.reduce((sum, o) => sum + (o.totalKg || 0.5), 0);
      setTotalKg(String(Number(combinedKg.toFixed(2))));
      setSelectedScheduleId("");
      setError(null);
    }
  }, [orders, singleOrder, isBatch]);

  // Open schedules only
  const openSchedules = useMemo(() => {
    return schedules.filter((s) => s.status === "Open");
  }, [schedules]);

  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId);
  }, [schedules, selectedScheduleId]);

  const totalCalculatedKg = isBatch
    ? orders.reduce((sum, o) => sum + (o.totalKg || 0.5), 0)
    : Number(totalKg) || 0.5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) {
      setError("Silakan pilih salah satu Jadwal Keberangkatan");
      return;
    }

    const kgNum = Number(totalKg);
    if (!isBatch && (isNaN(kgNum) || kgNum <= 0)) {
      setError("Berat total (Kg) harus lebih besar dari 0");
      return;
    }

    // Check capacity warning
    if (selectedSchedule) {
      const availableKg = selectedSchedule.slotBeratKg - selectedSchedule.beratTerpakai;
      if (totalCalculatedKg > availableKg) {
        const confirmOver = window.confirm(
          `Peringatan: Berat pesanan (${totalCalculatedKg.toFixed(1)} Kg) melebihi sisa kapasitas jadwal (${availableKg.toFixed(1)} Kg). Tetap lanjutkan?`
        );
        if (!confirmOver) return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(selectedScheduleId, {
        customTotalKg: !isBatch ? kgNum : undefined,
        customerId: selectedCustomerId || undefined,
        pic: pic.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Gagal meng-assign pesanan ke jadwal");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || orders.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window (Bottom Sheet on Mobile, Centered on Desktop) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 30 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange ring-1 ring-brand-orange/20 shrink-0">
                <Plane size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">
                  Assign ke Jadwal Keberangkatan
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                  {isBatch
                    ? `${orders.length} pesanan NihongStore dipilih untuk dijadwalkan`
                    : `Pesanan ${singleOrder?.no} — ${singleOrder?.namaPelanggan}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Orders Summary Preview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-slate-400" />
                  Rincian Pesanan NihongStore
                </span>
                <span className="text-xs font-extrabold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
                  Total Estimasi: {totalCalculatedKg.toFixed(1)} Kg
                </span>
              </div>

              {isBatch ? (
                <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200/60 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 truncate">{ord.namaPelanggan}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {ord.no} · {ord.items.length} item ({ord.items.map((i) => i.namaBarang).join(", ")})
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-700 ml-3 shrink-0">
                        {ord.totalKg} Kg
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Pemesan:</span>
                    <span className="font-bold text-slate-800">
                      {singleOrder?.namaPelanggan} ({singleOrder?.noTelponPelanggan || "-"})
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Barang ({singleOrder?.items.length}):</span>
                    <div className="text-left sm:text-right max-w-full sm:max-w-[280px]">
                      {singleOrder?.items.map((it, idx) => (
                        <p key={idx} className="font-semibold text-slate-700 truncate">
                          • {it.namaBarang} {it.warna ? `(${it.warna})` : ""} {it.ukuran ? `[${it.ukuran}]` : ""} x{it.jumlah}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Pilih Jadwal Keberangkatan (Open) <span className="text-rose-500">*</span>
              </label>

              {openSchedules.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
                  <AlertCircle size={20} className="text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-amber-800">
                    Tidak ada Jadwal Keberangkatan yang berstatus "Open"
                  </p>
                  <p className="text-[11px] text-amber-600">
                    Buka halaman Jadwal untuk membuat atau membuka kembali jadwal keberangkatan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {openSchedules.map((sch) => {
                    const isSelected = selectedScheduleId === sch.id;
                    const availableKg = Math.max(0, sch.slotBeratKg - sch.beratTerpakai);
                    const fillPercent = Math.min(100, (sch.beratTerpakai / sch.slotBeratKg) * 100);
                    const dateInfo = parseHighlightDate(sch.tanggalBerangkat);

                    return (
                      <div
                        key={sch.id}
                        onClick={() => setSelectedScheduleId(sch.id)}
                        className={`relative p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                          isSelected
                            ? "bg-brand-orange/5 border-brand-orange ring-2 ring-brand-orange/20 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Calendar Date Block */}
                          <div className={`flex flex-col items-center justify-center w-12 py-1.5 px-0.5 rounded-xl border shrink-0 select-none ${
                            isSelected
                              ? "bg-brand-orange text-white border-brand-orange"
                              : "bg-rose-50 border-rose-100 text-rose-800"
                          }`}>
                            <span className={`text-[8px] font-black uppercase tracking-wider ${isSelected ? "text-white/80" : "text-rose-500"}`}>
                              {dateInfo.month}
                            </span>
                            <span className="text-base font-black leading-none my-0.5">
                              {dateInfo.day}
                            </span>
                            <span className={`text-[8px] font-bold ${isSelected ? "text-white/90" : "text-rose-700"}`}>
                              {dateInfo.dayName}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-black text-slate-800 truncate">
                                {sch.rute}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                                Open
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-bold">
                              <User size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{sch.namaJastiper}</span>
                            </div>
                          </div>
                        </div>

                        {/* Capacity meter */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Sisa Kapasitas:</span>
                            <span className={availableKg < totalCalculatedKg ? "text-amber-600" : "text-slate-700"}>
                              {availableKg.toFixed(1)} / {sch.slotBeratKg} Kg
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fillPercent > 80 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 text-brand-orange">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Weight for Single Order */}
            {!isBatch && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Total Berat Booking (Kg) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={totalKg}
                      onChange={(e) => setTotalKg(e.target.value)}
                      placeholder="0.5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white shadow-sm"
                    />
                    <Weight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Akan dihitung ke kuota terpakai jadwal keberangkatan.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    PIC Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    placeholder="Nama PIC (opsional)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Catatan Tambahan untuk Pre-Order
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan khusus untuk jastiper atau pengiriman..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white shadow-sm"
              />
            </div>
          </form>

          {/* Sticky Footer */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-bold px-4 py-2.5 rounded-xl flex-1 sm:flex-initial justify-center"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedScheduleId}
              className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-brand-orange/20 flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plane size={15} />
              )}
              <span>{isBatch ? `Assign (${orders.length})` : "Assign Jadwal"}</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
