import React, { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Plus, X, ChevronDown } from "lucide-react";
import { PreOrder, PreOrderItem, PreOrderStatus, DepartureSchedule, Customer } from "../../types";
import { formatIDR, formatDate } from "../../utils/format";
import { Button } from "../ui/Button";
import SearchableSelect from "../ui/SearchableSelect";
import { addCustomer } from "../../services/customersFirebase";

// ─── Click Outside hook ──────────────────────────────────────────────────────
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  onKeyDown,
  autoFocus,
}: {
  item: PreOrderItem;
  index: number;
  onChange: (idx: number, field: keyof PreOrderItem, val: string | number) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => void;
  autoFocus: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="col-span-11 space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama Barang *</label>
        <input
          value={item.namaBarang}
          onChange={(e) => onChange(index, "namaBarang", e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          autoFocus={autoFocus}
          placeholder="Nama barang..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-semibold text-slate-800 transition-all"
        />
      </div>
      <div className="col-span-1 flex items-end justify-center pb-1 pt-5">
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Selector Dropdown ──────────────────────────────────────────────
function ScheduleSelect({
  value,
  onChange,
  schedules,
  placeholder = "— Pilih Jadwal Keberangkatan —",
  fieldClass = "",
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  schedules: DepartureSchedule[];
  placeholder?: string;
  fieldClass?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(wrapRef, () => setOpen(false));

  const selected = schedules.find((s) => s.id === value);

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${fieldClass} cursor-pointer flex items-center justify-between gap-3 text-left`}
      >
        {selected ? (
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{selected.rute}</span>
              <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md leading-none font-sans">
                {formatDate(selected.tanggalBerangkat)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-1 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
              <span>Jastiper: <span className="text-blue-600 font-bold">{selected.namaJastiper}</span></span>
              <span>&bull;</span>
              <span>Terisi: <span className="text-rose-600 font-bold">{selected.beratTerpakai} / {selected.slotBeratKg} Kg</span></span>
              <span>&bull;</span>
              <span>Fee: <span className="text-emerald-600 font-bold">{selected.hargaFeeJastiper ? formatIDR(selected.hargaFeeJastiper) : "Rp 0"} / Kg</span></span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 font-medium">{placeholder}</span>
        )}
        <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
          {schedules.length === 0 ? (
            <div className="px-4 py-6 text-xs font-semibold text-slate-400 text-center select-none">Tidak ada jadwal tersedia</div>
          ) : (
            <div className="p-1.5 space-y-1">
              {schedules.map((s) => {
                const isPicked = s.id === value;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.id); setOpen(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                      isPicked 
                        ? "bg-rose-50/70 border border-rose-100/60" 
                        : "hover:bg-slate-50/80 border border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{s.rute}</span>
                      <span className="text-[9px] bg-slate-100 font-bold text-slate-500 px-1.5 py-0.5 rounded-md leading-none font-sans">{formatDate(s.tanggalBerangkat)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-medium gap-2 flex-wrap">
                      <span>Jastiper: <span className="text-blue-600 font-bold">{s.namaJastiper}</span></span>
                      <span>Fee: <span className="text-emerald-600 font-bold">{s.hargaFeeJastiper ? formatIDR(s.hargaFeeJastiper) : "Rp 0"} / Kg</span></span>
                      <span>Terisi: <span className="text-rose-600 font-bold">{s.beratTerpakai} / {s.slotBeratKg} Kg</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_ITEM: PreOrderItem = { namaBarang: "", catatan: "", checked: false };

export function PreOrderFormModal({
  initial,
  schedules,
  customers,
  preOrders,
  onClose,
  onSubmit,
}: {
  initial?: PreOrder | null;
  schedules: DepartureSchedule[];
  customers: Customer[];
  preOrders: PreOrder[];
  onClose: () => void;
  onSubmit: (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [idJadwal, setIdJadwal] = useState(initial?.idJadwal || "");
  const [idPelanggan, setIdPelanggan] = useState(initial?.idPelanggan || "");
  const [items, setItems] = useState<PreOrderItem[]>(initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }]);
  const [status, setStatus] = useState<PreOrderStatus>(initial?.status || "Pending");
  const [catatan, setCatatan] = useState(initial?.catatan || "");
  const [totalKgInput, setTotalKgInput] = useState(String(initial?.totalKg || ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddCustomer = async (name: string) => {
    try {
      const formattedName = name.toUpperCase().trim();
      const newCust = await addCustomer({ nama: formattedName });
      if (newCust && newCust.id) {
        setIdPelanggan(newCust.id);
      }
    } catch (err: any) {
      setError(`Gagal menambahkan pelanggan baru: ${err?.message || err}`);
    }
  };

  const [autoFocusIndex, setAutoFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const selectedSchedule = schedules.find((s) => s.id === idJadwal);
  const selectedCustomer = customers.find((c) => c.id === idPelanggan);
  const totalKg = Number(totalKgInput) || 0;

  const customerOptions = useMemo(
    () => customers.map((c) => ({ label: c.nama, value: c.id || "" })),
    [customers]
  );

  function handleItemChange(idx: number, field: keyof PreOrderItem, val: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  function addItem() { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (items[idx].namaBarang.trim()) {
        addItem();
        setAutoFocusIndex(items.length);
      }
    }
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!idJadwal) { setError("Pilih Jadwal Keberangkatan."); return; }
    if (!idPelanggan) { setError("Pilih Pelanggan."); return; }
    if (items.some((i) => !i.namaBarang.trim())) { setError("Nama barang wajib diisi di setiap baris."); return; }
    if (totalKg < 0) { setError("Total berat tidak boleh kurang dari 0 Kg."); return; }

    // Validation: customer must be unique per schedule
    const duplicate = preOrders.find(
      (p) =>
        p.idJadwal === idJadwal &&
        p.idPelanggan === idPelanggan &&
        p.id !== initial?.id
    );
    if (duplicate) {
      setError(`Pelanggan "${selectedCustomer?.nama || "Pelanggan"}" sudah memiliki pre-order pada jadwal ini.`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        idJadwal,
        namaJastiper: selectedSchedule?.namaJastiper || "",
        rute: selectedSchedule?.rute || "",
        tanggalBerangkat: selectedSchedule?.tanggalBerangkat || "",
        idPelanggan,
        namaPelanggan: selectedCustomer?.nama || "",
        noTelponPelanggan: selectedCustomer?.telpon || "",
        items: items.map(item => ({
          ...item,
          checked: item.checked ?? false
        })),
        totalKg,
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

  const fieldClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-800 transition-all";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border-t-4 border-t-rose-500 z-10 max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShoppingBag size={18} className="text-rose-600" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {initial ? "Edit Pre Order" : "Pre Order Baru"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"><X size={18} /></button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">{error}</div>}

            {/* Jadwal & Pelanggan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Jadwal Keberangkatan *</label>
                <ScheduleSelect
                  value={idJadwal}
                  onChange={setIdJadwal}
                  schedules={schedules.filter((s) => s.status === "Open")}
                  fieldClass={fieldClass}
                  disabled={loading}
                />
                {selectedSchedule && (
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl mt-2 select-none">
                    <span className="text-blue-600 font-extrabold flex items-center gap-1">
                      📅 Last Drop: {selectedSchedule.tanggalLastDrop}
                    </span>
                    {selectedSchedule.catatan && (
                      <span className="text-slate-400 italic font-medium truncate max-w-[200px]" title={selectedSchedule.catatan}>
                        📝 {selectedSchedule.catatan}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Pelanggan *</label>
                <SearchableSelect
                  value={idPelanggan}
                  onChange={setIdPelanggan}
                  options={customerOptions}
                  disabled={loading}
                  onAddOption={handleAddCustomer}
                  placeholder="Cari atau pilih pelanggan..."
                  buttonClassName={fieldClass}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Daftar Barang *</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                    {items.length} Jenis Barang
                  </span>
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all">
                    <Plus size={13} strokeWidth="3" />
                    Tambah Baris
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <ItemRow
                    key={idx} item={item} index={idx}
                    onChange={handleItemChange}
                    onRemove={removeItem}
                    canRemove={items.length > 1}
                    onKeyDown={handleNameKeyDown}
                    autoFocus={idx === autoFocusIndex}
                  />
                ))}
              </div>
            </div>

            {/* Berat & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Berat Total (Kg)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalKgInput}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
                    setTotalKgInput(cleaned);
                  }}
                  placeholder="Contoh: 5.0"
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PreOrderStatus)} className={fieldClass}>
                  {(["Pending", "Selesai"] as PreOrderStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <label className={labelClass}>Catatan (Opsional)</label>
              <input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan..."
                className={fieldClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button onClick={() => handleSubmit()} isLoading={loading} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-md shadow-rose-600/20">
              {initial ? "Simpan Perubahan" : "Buat Pre Order"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
