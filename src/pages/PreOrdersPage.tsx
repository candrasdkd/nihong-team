import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Pencil, Trash2, Search, X, CheckCircle2,
  AlertCircle, Weight, Package, ChevronDown, ChevronUp,
  ArrowRight, Calendar, Plane, User2,
} from "lucide-react";
import { PreOrder, PreOrderItem, PreOrderStatus, DepartureSchedule, Customer } from "../types";
import { listenPreOrders, addPreOrder, updatePreOrder, deletePreOrder, convertPreOrderToOrder } from "../services/preOrdersFirebase";
import { listenSchedules, updateSchedule } from "../services/schedulesFirebase";
import { listenCustomers } from "../services/customersFirebase";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS } from "../utils/constants";
import SearchableSelect from "../components/ui/SearchableSelect";

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

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastMsg = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <motion.div key={t.id} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${t.type === "error" ? "bg-white border-red-200 text-red-700" : "bg-slate-900 text-white border-slate-800"}`}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="ml-2 p-0.5 rounded-full hover:bg-black/10"><X size={14} /></button>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item, index, onChange, onRemove, canRemove, onKeyDown, autoFocus,
}: {
  item: PreOrderItem; index: number;
  onChange: (idx: number, field: keyof PreOrderItem, val: string | number) => void;
  onRemove: (idx: number) => void; canRemove: boolean;
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
          <button onClick={() => onRemove(index)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

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

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d; }
  };

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
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              Jastiper: <span className="text-blue-600 font-bold">{selected.namaJastiper}</span> &bull; Terisi: <span className="text-rose-600 font-bold">{selected.beratTerpakai} / {selected.slotBeratKg} Kg</span>
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
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
                      <span>Jastiper: <span className="text-blue-600 font-bold">{s.namaJastiper}</span></span>
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

// ─── PreOrder Form Modal ──────────────────────────────────────────────────────

const EMPTY_ITEM: PreOrderItem = { namaBarang: "", catatan: "", checked: false };

function PreOrderFormModal({
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
                  type="number"
                  step="0.1"
                  min="0"
                  value={totalKgInput}
                  onChange={(e) => setTotalKgInput(e.target.value)}
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

// ─── Convert Modal ────────────────────────────────────────────────────────────

function ConvertModal({
  preOrder,
  onClose,
  onConverted,
}: {
  preOrder: PreOrder;
  onClose: () => void;
  onConverted: (orderId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConvert() {
    setLoading(true);
    try {
      const namaBarang = preOrder.items.map((i) => i.namaBarang).join(", ");

      const orderId = await convertPreOrderToOrder(preOrder.id, {
        no: `PO-${Date.now()}`,
        tanggal: new Date().toISOString().split("T")[0],
        idPelanggan: preOrder.idPelanggan,
        namaPelanggan: preOrder.namaPelanggan,
        namaBarang,
        kategori: "",
        pengiriman: preOrder.rute,
        jumlahKg: preOrder.totalKg,
        kgCeil: Math.ceil(preOrder.totalKg),
        hargaJastip: 0,
        hargaJastipMarkup: 0,
        hargaOngkir: 0,
        hargaOngkirMarkup: 0,
        totalPembayaran: 0,
        totalKeuntungan: 0,
        status: "Belum Membayar",
        catatan: `Dikonversi dari Pre Order. Items: ${preOrder.items.map((i) => i.namaBarang).join(", ")}`,
      });
      onConverted(orderId);
    } catch (err: any) {
      setError(err.message || "Gagal mengkonversi pre order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowRight size={20} />
              </div>
              <h3 className="font-extrabold text-lg">Pindahkan ke Pesanan</h3>
            </div>
            <p className="text-emerald-100 text-sm">Pre Order akan dikonversi menjadi Pesanan resmi. Lengkapi harga setelah konversi.</p>
          </div>

          <div className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">{error}</div>}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ringkasan</p>
              <p className="text-sm font-bold text-slate-800">{preOrder.namaPelanggan}</p>
              <p className="text-xs text-slate-500">{preOrder.rute}</p>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                {preOrder.items.map((item, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    • {item.namaBarang}
                  </div>
                ))}
                <div className="flex justify-between text-xs font-extrabold text-emerald-600 pt-2 border-t border-slate-200">
                  <span>Total Berat</span>
                  <span>{preOrder.totalKg} Kg</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 font-semibold">
              ⚠️ Harga jastip dan ongkir akan diisi <strong>0</strong>. Lengkapi di halaman Pesanan setelah konversi.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
              <Button isLoading={loading} onClick={handleConvert} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                <ArrowRight size={16} className="mr-2" />
                Konversi Sekarang
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── PreOrder Card ────────────────────────────────────────────────────────────

function PreOrderCard({
  po,
  onEdit,
  onDelete,
  onConvert,
  onToggleItemCheck,
}: {
  po: PreOrder;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onToggleItemCheck: (itemIdx: number) => void;
}) {
  const [expanded, setExpanded] = useState(true); // default expand to show items & checkbox easily
  const canConvert = po.status === "Pending";

  const formatDate = (d: string) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
        po.status === "Selesai" ? "border-emerald-100/80" : "border-slate-100/80"
      }`}
    >
      {/* Status stripe */}
      <div className={`h-1 w-full ${po.status === "Selesai" ? "bg-emerald-500" : "bg-amber-400"}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-slate-800 text-sm truncate max-w-[130px]">{po.namaPelanggan}</h3>
              <StatusBadge status={po.status} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1 font-semibold"><Plane size={9} className="text-blue-400 shrink-0" />{po.rute}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {po.status !== "Selesai" && (
              <>
                <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil size={13} /></button>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Hapus"><Trash2 size={13} /></button>
              </>
            )}
          </div>
        </div>

        {/* Items summary */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Package size={11} />
              {po.items.length} Jenis Barang
            </span>
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Sembunyikan" : "Lihat Detail"}
            </button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mb-2 border-t border-slate-200 pt-2 max-h-40 overflow-y-auto">
                  {po.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2 py-0.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={!!item.checked}
                          onChange={() => onToggleItemCheck(i)}
                          disabled={po.status === "Selesai"}
                          className={`rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 shrink-0 ${po.status === "Selesai" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        />
                        <span className={`font-semibold truncate ${item.checked ? "text-slate-400 line-through font-normal" : "text-slate-700"}`}>
                          {item.namaBarang}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500 font-semibold">Total Berat</span>
            <span className="text-sm font-extrabold text-rose-600 flex items-center gap-1">
              <Weight size={13} />
              {po.totalKg.toFixed(1)} Kg
            </span>
          </div>
        </div>

        {po.catatan && (
          <p className="text-[11px] text-slate-500 italic mb-3">📝 {po.catatan}</p>
        )}

        {/* Convert button */}
        {canConvert && (
          <button
            onClick={onConvert}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-98 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <ArrowRight size={14} strokeWidth="3" />
            Pindahkan ke Pesanan
          </button>
        )}

        {po.status === "Selesai" && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-emerald-600">
            <CheckCircle2 size={14} />
            Sudah dikonversi ke Pesanan
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PreOrdersPage() {
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PreOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<PreOrder | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    const unsubPO = listenPreOrders((rows) => { setPreOrders(rows); setLoading(false); });
    const unsubS = listenSchedules((rows) => setSchedules(rows));
    const unsubC = listenCustomers((rows) => setCustomers(rows));
    return () => { unsubPO(); unsubS(); unsubC(); };
  }, []);

  const filtered = useMemo(() => {
    let list = preOrders;
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((p) =>
        p.namaPelanggan.toLowerCase().includes(s) ||
        p.rute.toLowerCase().includes(s) ||
        p.namaJastiper.toLowerCase().includes(s) ||
        p.items.some((i) => i.namaBarang.toLowerCase().includes(s)),
      );
    }
    return list;
  }, [preOrders, q, statusFilter]);

  // Grouping pre-orders by schedule
  const groupedBySchedule = useMemo(() => {
    const list: { schedule?: DepartureSchedule; preOrders: PreOrder[]; label: string; date?: string; jastiper?: string }[] = [];

    // Group by known schedules
    schedules.forEach((sch) => {
      // When viewing Pending pre-orders, hide groups for Closed schedules
      if (statusFilter === "Pending" && sch.status === "Closed") return;

      const matchPO = filtered.filter((p) => p.idJadwal === sch.id);
      if (matchPO.length > 0 || !q) {
        list.push({
          schedule: sch,
          preOrders: matchPO,
          label: `${sch.rute} (${sch.status})`,
          date: sch.tanggalBerangkat,
          jastiper: sch.namaJastiper,
        });
      }
    });

    // Check if there are pre-orders with schedules not in the list (or empty idJadwal)
    const orphans = filtered.filter((p) => !schedules.some((s) => s.id === p.idJadwal));
    if (orphans.length > 0) {
      list.push({
        preOrders: orphans,
        label: "Lainnya / Tanpa Jadwal",
      });
    }

    return list;
  }, [schedules, filtered, q, statusFilter]);

  function addToast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleSubmit(data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updatePreOrder(editing.id, data);
      addToast("Pre Order berhasil diperbarui", "success");
    } else {
      await addPreOrder(data);
      addToast("Pre Order berhasil dibuat", "success");
    }
  }

  function handleDelete(po: PreOrder) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pre Order",
      message: `Yakin ingin menghapus pre order "${po.namaPelanggan}"? Berat ${po.totalKg} Kg akan dikembalikan ke jadwal.`,
      onConfirm: async () => {
        try {
          await deletePreOrder(po.id);
          addToast("Pre Order berhasil dihapus", "success");
        } catch {
          addToast("Gagal menghapus pre order", "error");
        }
      },
    });
  }

  async function handleToggleItemCheck(po: PreOrder, itemIdx: number) {
    try {
      const updatedItems = po.items.map((item, idx) =>
        idx === itemIdx ? { ...item, checked: !item.checked } : item
      );
      await updatePreOrder(po.id, { items: updatedItems });
      addToast("Status check barang berhasil diubah", "success");
    } catch (err: any) {
      addToast(err.message || "Gagal mengubah status barang", "error");
    }
  }

  const counts = {
    pending: preOrders.filter((p) => p.status === "Pending").length,
    selesai: preOrders.filter((p) => p.status === "Selesai").length,
  };

  const STATUS_FILTERS = ["", "Pending", "Selesai"];

  const formatDate = (d: string) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <ToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Mobile Header */}
        <div className="block sm:hidden">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Daftar Pre Order 📦
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola barang titipan konsumen sebelum berangkat.
          </p>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4c0519] via-[#881337] to-[#4c0519] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-400/15 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-pink-400/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-400/30 px-3 py-1 rounded-full text-xs font-bold text-rose-300 mb-3">
                <ShoppingBag size={12} />
                <span>Pre Order Konsumen</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Daftar Pre Order 📦
              </h2>
              <p className="text-slate-400 mt-1.5 text-sm max-w-lg">
                Catat barang titipan konsumen sebelum berangkat. Setelah semua siap, konversi ke Pesanan resmi.
              </p>
            </div>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 font-bold px-5 py-2.5 rounded-xl border border-rose-500/50 hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" />
              Buat Pre Order
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="hidden sm:grid grid-cols-2 gap-3">
          {[
            { label: "Pending", value: counts.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Selesai", value: counts.selesai, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-2`}>
              <span className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs font-bold text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
              >
                {s || "Semua"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md ml-auto">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pelanggan, rute, barang..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:ring-2 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
            />
          </div>
        </div>

        {/* Grouped Lists by Schedule */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-3 bg-slate-100 rounded w-40" />
                <div className="h-20 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : groupedBySchedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 shadow-inner">
              <ShoppingBag size={32} className="text-rose-300" />
            </div>
            <h3 className="font-extrabold text-slate-700 text-lg mb-1">
              {q || statusFilter ? "Pre Order Tidak Ditemukan" : "Belum Ada Pre Order"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              {q || statusFilter ? "Coba ubah filter pencarian." : "Buat Pre Order baru untuk mencatat titipan konsumen."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedBySchedule.map((group, idx) => (
              <div key={group.schedule?.id || idx} className="bg-slate-100/40 border border-slate-200/50 rounded-3xl p-5 sm:p-6 space-y-4">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                      <Plane className="w-4 h-4 text-rose-500" />
                      <span>{group.label}</span>
                    </h3>
                    {group.date && (
                      <p className="text-xs text-slate-500 font-semibold mt-0.5 font-sans">
                        Tanggal Berangkat: {formatDate(group.date)} &bull; Jastiper: <span className="text-blue-600 font-bold">{group.jastiper}</span>
                      </p>
                    )}
                  </div>
                  {group.schedule && (
                    <div className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs select-none">
                      Total Berat Terisi: <span className="text-slate-800 font-extrabold">{group.schedule.beratTerpakai.toFixed(1)} Kg</span>
                    </div>
                  )}
                </div>

                {/* Pre-Orders under this schedule */}
                {group.preOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200 select-none">
                    Belum ada pre-order di jadwal ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.preOrders.map((po) => (
                      <PreOrderCard
                        key={po.id}
                        po={po}
                        onEdit={() => { setEditing(po); setShowForm(true); }}
                        onDelete={() => handleDelete(po)}
                        onConvert={() => setConvertTarget(po)}
                        onToggleItemCheck={(itemIdx) => handleToggleItemCheck(po, itemIdx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
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
        <PreOrderFormModal
          initial={editing}
          schedules={schedules}
          customers={customers}
          preOrders={preOrders}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {convertTarget && (
        <ConvertModal
          preOrder={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={(id) => {
            addToast(`Pre Order berhasil dikonversi ke Pesanan!`, "success");
            setConvertTarget(null);
          }}
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
