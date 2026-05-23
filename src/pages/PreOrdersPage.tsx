import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Pencil, Trash2, Search, X, CheckCircle2,
  AlertCircle, Weight, Package, ChevronDown, ChevronUp,
  ArrowRight, RotateCcw, Clock, User2, Calendar, Plane,
} from "lucide-react";
import { PreOrder, PreOrderItem, PreOrderStatus, DepartureSchedule, Customer } from "../types";
import { listenPreOrders, addPreOrder, updatePreOrder, deletePreOrder, convertPreOrderToOrder } from "../services/preOrdersFirebase";
import { listenSchedules } from "../services/schedulesFirebase";
import { listenCustomers } from "../services/customersFirebase";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ConfirmModal";
import { FAB_COLOR_CLASS, CATEGORY_OPTIONS } from "../utils/constants";

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PreOrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  Pending:     { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50 ring-1 ring-amber-200",   dot: "bg-amber-500" },
  Diproses:    { label: "Diproses",   color: "text-blue-700",    bg: "bg-blue-50 ring-1 ring-blue-200",     dot: "bg-blue-500" },
  Selesai:     { label: "Selesai",    color: "text-emerald-700", bg: "bg-emerald-50 ring-1 ring-emerald-200",dot: "bg-emerald-500" },
  Dibatalkan:  { label: "Dibatalkan", color: "text-rose-700",    bg: "bg-rose-50 ring-1 ring-rose-200",     dot: "bg-rose-500" },
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
  item, index, onChange, onRemove, canRemove,
}: {
  item: PreOrderItem; index: number;
  onChange: (idx: number, field: keyof PreOrderItem, val: string | number) => void;
  onRemove: (idx: number) => void; canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="col-span-12 sm:col-span-4 space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama Barang *</label>
        <input
          value={item.namaBarang}
          onChange={(e) => onChange(index, "namaBarang", e.target.value)}
          placeholder="Nama barang..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-semibold text-slate-800 transition-all"
        />
      </div>
      <div className="col-span-6 sm:col-span-4 space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kategori</label>
        <select
          value={item.kategori}
          onChange={(e) => onChange(index, "kategori", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-semibold text-slate-800 transition-all"
        >
          <option value="">— Pilih —</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="col-span-5 sm:col-span-3 space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Berat (Kg)</label>
        <input
          type="number"
          value={item.jumlahKg || ""}
          onChange={(e) => onChange(index, "jumlahKg", e.target.value)}
          placeholder="0"
          min="0" step="0.1"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-semibold text-slate-800 transition-all"
        />
      </div>
      <div className="col-span-1 flex items-end justify-center pb-1">
        {canRemove && (
          <button onClick={() => onRemove(index)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PreOrder Form Modal ──────────────────────────────────────────────────────

const EMPTY_ITEM: PreOrderItem = { namaBarang: "", kategori: "", jumlahKg: 0, catatan: "" };

function PreOrderFormModal({
  initial,
  schedules,
  customers,
  onClose,
  onSubmit,
}: {
  initial?: PreOrder | null;
  schedules: DepartureSchedule[];
  customers: Customer[];
  onClose: () => void;
  onSubmit: (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [idJadwal, setIdJadwal] = useState(initial?.idJadwal || "");
  const [idPelanggan, setIdPelanggan] = useState(initial?.idPelanggan || "");
  const [items, setItems] = useState<PreOrderItem[]>(initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }]);
  const [status, setStatus] = useState<PreOrderStatus>(initial?.status || "Pending");
  const [catatan, setCatatan] = useState(initial?.catatan || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const selectedSchedule = schedules.find((s) => s.id === idJadwal);
  const selectedCustomer = customers.find((c) => c.id === idPelanggan);
  const totalKg = items.reduce((sum, i) => sum + Number(i.jumlahKg || 0), 0);

  function handleItemChange(idx: number, field: keyof PreOrderItem, val: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  function addItem() { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!idJadwal) { setError("Pilih Jadwal Keberangkatan."); return; }
    if (!idPelanggan) { setError("Pilih Pelanggan."); return; }
    if (items.some((i) => !i.namaBarang.trim())) { setError("Nama barang wajib diisi di setiap baris."); return; }
    if (totalKg <= 0) { setError("Total berat harus lebih dari 0 Kg."); return; }

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
        items,
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
                <select value={idJadwal} onChange={(e) => setIdJadwal(e.target.value)} className={fieldClass}>
                  <option value="">— Pilih Jadwal —</option>
                  {schedules
                    .filter((s) => s.status === "Open")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.rute} — {s.tanggalBerangkat} ({s.namaJastiper})
                      </option>
                    ))}
                </select>
                {selectedSchedule && (
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1"><Weight size={11} className="text-blue-500" />Sisa: {Math.max(0, selectedSchedule.slotBeratKg - selectedSchedule.beratTerpakai)} Kg</span>
                    <span className="text-blue-600">Last Drop: {selectedSchedule.tanggalLastDrop}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Pelanggan *</label>
                <select value={idPelanggan} onChange={(e) => setIdPelanggan(e.target.value)} className={fieldClass}>
                  <option value="">— Pilih Pelanggan —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Daftar Barang *</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Weight size={12} />
                    Total: {totalKg.toFixed(1)} Kg
                  </span>
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all">
                    <Plus size={13} stroke-width="3" />
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
                  />
                ))}
              </div>
            </div>

            {/* Status & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PreOrderStatus)} className={fieldClass}>
                  {(["Pending", "Diproses", "Selesai", "Dibatalkan"] as PreOrderStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
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
      // Build combined namaBarang from all items
      const namaBarang = preOrder.items.map((i) => i.namaBarang).join(", ");
      const kategori = preOrder.items[0]?.kategori || "Lainnya";

      const orderId = await convertPreOrderToOrder(preOrder.id, {
        no: `PO-${Date.now()}`,
        tanggal: new Date().toISOString().split("T")[0],
        idPelanggan: preOrder.idPelanggan,
        namaPelanggan: preOrder.namaPelanggan,
        namaBarang,
        kategori,
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
        catatan: `Dikonversi dari Pre Order. Items: ${preOrder.items.map((i) => `${i.namaBarang} (${i.jumlahKg}Kg)`).join(", ")}`,
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
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-600">{item.namaBarang}</span>
                    <span className="font-bold text-slate-700">{item.jumlahKg} Kg</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-extrabold text-emerald-600 pt-1 border-t border-slate-200">
                  <span>Total</span>
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
}: {
  po: PreOrder;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canConvert = po.status === "Pending" || po.status === "Diproses";

  const formatDate = (d: string) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
        po.status === "Selesai" ? "border-emerald-100/80" : po.status === "Dibatalkan" ? "border-slate-100/80 opacity-60" : "border-slate-100/80"
      }`}
    >
      {/* Status stripe */}
      <div className={`h-1 w-full ${
        po.status === "Selesai" ? "bg-emerald-500" : po.status === "Dibatalkan" ? "bg-slate-300" : po.status === "Diproses" ? "bg-blue-500" : "bg-amber-400"
      }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-extrabold text-slate-800 text-sm">{po.namaPelanggan}</h3>
              <StatusBadge status={po.status} />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Plane size={10} className="text-blue-400" />{po.rute}</span>
              <span className="flex items-center gap-1"><Calendar size={10} className="text-violet-400" />{formatDate(po.tanggalBerangkat)}</span>
              <span className="flex items-center gap-1"><User2 size={10} className="text-indigo-400" />{po.namaJastiper}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {po.status !== "Selesai" && po.status !== "Dibatalkan" && (
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
                <div className="space-y-1.5 mb-2 border-t border-slate-200 pt-2">
                  {po.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 text-xs gap-1">
                      <div className="col-span-6 font-semibold text-slate-700 truncate">{item.namaBarang}</div>
                      <div className="col-span-4 text-slate-500 truncate">{item.kategori}</div>
                      <div className="col-span-2 font-bold text-right text-slate-700">{item.jumlahKg}kg</div>
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
            <ArrowRight size={14} stroke-width="3" />
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

  const counts = {
    pending: preOrders.filter((p) => p.status === "Pending").length,
    diproses: preOrders.filter((p) => p.status === "Diproses").length,
    selesai: preOrders.filter((p) => p.status === "Selesai").length,
  };

  const STATUS_FILTERS = ["", "Pending", "Diproses", "Selesai", "Dibatalkan"];

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <ToastContainer toasts={toasts} remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4c0519] via-[#881337] to-[#4c0519] px-6 py-8 shadow-xl border border-white/5"
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: counts.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Diproses", value: counts.diproses, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
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

        {/* Cards */}
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
        ) : filtered.length === 0 ? (
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
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((po) => (
                <PreOrderCard
                  key={po.id}
                  po={po}
                  onEdit={() => { setEditing(po); setShowForm(true); }}
                  onDelete={() => handleDelete(po)}
                  onConvert={() => setConvertTarget(po)}
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
        <PreOrderFormModal
          initial={editing}
          schedules={schedules}
          customers={customers}
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
