import React, { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Trash2,
  Weight,
  X,
  ChevronRight,
  Link2,
  Check,
  RotateCw,
} from "lucide-react";
import { DepartureSchedule, PreOrder, Customer, PreOrderItem } from "../types";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { ConvertPreOrderModal } from "../components/PreOrder/ConvertPreOrderModal";
import { PreOrderToastContainer } from "../components/PreOrder/PreOrderToastContainer";
import { ConfirmModal } from "../components/ConfirmModal";
import { usePreOrderDetail, EditingCell } from "../hooks/usePreOrderDetail";
import { updatePreOrder } from "../services/preOrdersFirebase";

// ─── Inline Editable Cell ────────────────────────────────────────────────────

function EditableCell({
  value,
  poId,
  field,
  type = "text",
  editingCell,
  onStartEdit,
  onSave,
  className = "",
  style,
  isRotated = false,
}: {
  value: string | number;
  poId: string;
  field: EditingCell["field"];
  type?: "text" | "number";
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onSave: (poId: string, field: EditingCell["field"], value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  isRotated?: boolean;
}) {
  const isEditing = editingCell?.poId === poId && editingCell?.field === field;
  const [localVal, setLocalVal] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setLocalVal(String(value ?? ""));
      setTimeout(() => inputRef.current?.select(), 10);
    }
  }, [isEditing, value]);

  const commit = useCallback(() => {
    onSave(poId, field, localVal);
  }, [poId, field, localVal, onSave]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onSave(poId, field, String(value));
        }}
        style={style}
        className="w-full min-w-0 px-1.5 py-0.5 border-2 border-rose-400 rounded outline-none font-semibold text-slate-800 bg-rose-50/50 focus:bg-white transition-all"
        step={type === "number" ? "0.1" : undefined}
      />
    );
  }

  return (
    <div
      onClick={() => onStartEdit({ poId, field })}
      style={style}
      className={`cursor-pointer group/cell flex items-center gap-1 min-h-[22px] rounded px-1 py-0.5 hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 transition-all ${className}`}
      title="Klik untuk edit"
    >
      <span className={`flex-1 ${isRotated ? "truncate" : "break-words whitespace-normal leading-tight"}`}>{value ?? "—"}</span>
      <Pencil
        size={9}
        className="text-slate-300 group-hover/cell:text-rose-400 shrink-0 opacity-0 group-hover/cell:opacity-100 transition-all"
      />
    </div>
  );
}

// ─── Customer Dropdown Cell ────────────────────────────────────────────────────

function CustomerDropdownCell({
  po,
  customers,
  onSelect,
  style,
  isRotated = false,
}: {
  po: PreOrder;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  style?: React.CSSProperties;
  isRotated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Hitung posisi fixed saat buka
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropH = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4;
      setCoords({ top, left: rect.left, width: Math.max(rect.width, 240) });
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        (c.telpon || "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  const handlePick = (c: Customer) => {
    setOpen(false);
    onSelect(c);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {!open ? (
          <div
            onClick={() => setOpen(true)}
            style={style}
            className="cursor-pointer group/cell flex items-center gap-1 min-h-[22px] rounded px-1 py-0.5 hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 transition-all"
            title="Klik untuk ganti pelanggan"
          >
            <span className={isRotated ? "flex-1 truncate font-extrabold text-slate-800" : "flex-1 font-extrabold text-slate-800 break-words whitespace-normal leading-tight block"}>
              {isRotated && po.namaPelanggan && po.namaPelanggan.length > 10
                ? `${po.namaPelanggan.slice(0, 10)}...`
                : po.namaPelanggan || "—"}
            </span>
            < Pencil size={9} className="text-slate-300 group-hover/cell:text-rose-400 shrink-0 opacity-0 group-hover/cell:opacity-100 transition-all" />
          </div>
        ) : (
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              placeholder="Cari pelanggan..."
              style={style}
              className="w-full min-w-0 px-1.5 py-0.5 border-2 border-rose-400 rounded outline-none font-semibold text-slate-800 bg-rose-50/50 focus:bg-white transition-all"
            />

            {/* Local absolute overlay when layout is rotated (cell isRotated is false) */}
            {!isRotated && (
              <div
                ref={dropRef}
                className="absolute left-0 top-full mt-1 w-60 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 z-[99]"
              >
                <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between bg-white">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pilih Pelanggan</span>
                  <span className="text-[9px] font-bold text-rose-500">{filtered.length} hasil</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-2 text-[10px] text-slate-400 font-semibold text-center">Tidak ditemukan</div>
                ) : (
                  filtered.map((c) => {
                    const isActive = c.id === po.idPelanggan;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handlePick(c); }}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-50 transition-colors ${isActive ? "bg-rose-50/60" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 ${isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {c.nama.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-extrabold leading-tight truncate ${isActive ? "text-rose-600" : "text-slate-800"}`}>{c.nama}</p>
                          {c.telpon && <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{c.telpon}</p>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed portal overlay when layout is vertical (cell isRotated is true) */}
      {isRotated && open && coords && (
        <div
          ref={dropRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
          className="max-h-72 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-1"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Pelanggan</span>
            <span className="text-[10px] font-bold text-rose-500">{filtered.length} hasil</span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 font-semibold text-center">Tidak ditemukan</div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === po.idPelanggan;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handlePick(c); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-rose-50 transition-colors ${isActive ? "bg-rose-50/60" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {c.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-extrabold leading-tight truncate ${isActive ? "text-rose-600" : "text-slate-800"}`}>{c.nama}</p>
                    {c.telpon && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{c.telpon}</p>}
                  </div>
                  {isActive && <Check size={11} className="text-rose-500 ml-auto shrink-0" strokeWidth={3} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ─── Items Edit Modal ──────────────────────────────────────────────────────

function ItemsEditModal({
  po,
  onClose,
  onToggleCheck,
  onSaveItems,
}: {
  po: PreOrder;
  onClose: () => void;
  onToggleCheck: (po: PreOrder, idx: number) => void;
  onSaveItems: (poId: string, items: PreOrderItem[]) => Promise<void>;
}) {
  const [localItems, setLocalItems] = useState<PreOrderItem[]>(() =>
    po.items.map((i) => ({ ...i }))
  );
  const [saving, setSaving] = useState(false);
  const isReadOnly = po.status === "Selesai";

  const addItem = () => {
    setLocalItems((prev) => [...prev, { namaBarang: "", checked: false }]);
  };

  const removeItem = (idx: number) => {
    setLocalItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateName = (idx: number, val: string) => {
    setLocalItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, namaBarang: val } : item))
    );
  };

  const toggleCheck = (idx: number) => {
    setLocalItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleSave = async () => {
    const cleaned = localItems.filter((i) => i.namaBarang.trim() !== "");
    setSaving(true);
    try {
      await onSaveItems(po.id, cleaned);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = localItems.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={isReadOnly ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Daftar Titipan Barang</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              <span className="text-rose-600 font-bold">{po.namaPelanggan}</span>
              {" — "}{localItems.filter(i => i.checked).length}/{localItems.length} selesai
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Info row */}
        <div className="px-5 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px]">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">PIC / Jastiper</span>
              <span className="text-slate-800 font-extrabold">{po.namaJastiper || "—"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Berat</span>
              <span className="text-rose-600 font-extrabold">{po.totalKg.toFixed(1)} Kg</span>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="px-5 py-3 flex-1 overflow-y-auto space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Checklist Barang
            </p>
            {!isReadOnly && (
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-extrabold border border-rose-100 transition-all active:scale-95"
              >
                <Plus size={11} strokeWidth={3} />
                Tambah Barang
              </button>
            )}
          </div>

          {localItems.length === 0 && (
            <div className="py-6 text-center text-[11px] text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-slate-100">
              Belum ada barang. Klik "+ Tambah Barang" untuk mulai.
            </div>
          )}

          {localItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl transition-colors ${isReadOnly ? "bg-slate-50/40" : "hover:bg-slate-50"
                }`}
            >
              <input
                type="checkbox"
                checked={!!item.checked}
                onChange={() => toggleCheck(idx)}
                disabled={isReadOnly}
                className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 w-4 h-4 shrink-0 cursor-pointer"
              />
              {isReadOnly ? (
                <span className={`text-xs font-semibold flex-1 ${item.checked ? "line-through text-slate-400" : "text-slate-700"
                  }`}>{item.namaBarang}</span>
              ) : (
                <input
                  type="text"
                  value={item.namaBarang}
                  onChange={(e) => updateName(idx, e.target.value)}
                  placeholder="Nama barang..."
                  autoFocus={idx === localItems.length - 1 && item.namaBarang === ""}
                  className={`flex-1 text-xs font-semibold bg-transparent outline-none border-b border-transparent focus:border-rose-300 transition-colors py-0.5 ${item.checked ? "line-through text-slate-400" : "text-slate-700"
                    }`}
                />
              )}
              {!isReadOnly && (
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-semibold">
            {checkedCount}/{localItems.length} selesai
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-extrabold text-xs transition-all active:scale-95"
            >
              Batal
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  schedule: DepartureSchedule;
  schedules: DepartureSchedule[];
  customers: Customer[];
  preOrders: PreOrder[];
  onBack: () => void;
  onOpenCreateForm: () => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editing: PreOrder | null;
  setEditing: (v: PreOrder | null) => void;
  convertTarget: PreOrder | null;
  setConvertTarget: (v: PreOrder | null) => void;
  handleSubmit: (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  /** Jika true, halaman diakses via share link (tanpa login) */
  isShareMode?: boolean;
  isRotated?: boolean;
  onToggleRotate?: (v: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PreOrderDetailPage({
  schedule,
  schedules,
  customers,
  preOrders: allPreOrders,
  onBack,
  onOpenCreateForm,
  showForm,
  setShowForm,
  editing,
  setEditing,
  convertTarget,
  setConvertTarget,
  handleSubmit,
  isShareMode = false,
  isRotated: propIsRotated,
  onToggleRotate,
}: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [tableFontSize, setTableFontSize] = useState<number>(10);
  const [localIsRotated, setLocalIsRotated] = useState(false);

  const isRotated = propIsRotated !== undefined ? propIsRotated : localIsRotated;
  const setIsRotated = (v: boolean) => {
    if (onToggleRotate) {
      onToggleRotate(v);
    } else {
      setLocalIsRotated(v);
    }
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/?share=${schedule.id}`;
    // Fallback untuk non-HTTPS (dev via IP, dll)
    const doCopy = () => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(shareUrl);
      }
      // Fallback: execCommand
      const el = document.createElement("textarea");
      el.value = shareUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return Promise.resolve();
    };
    doCopy()
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      })
      .catch(() => {
        // Kalau semua gagal, buka prompt manual
        prompt("Salin link berikut:", shareUrl);
      });
  };
  const {
    pos,
    loading,
    editingCell,
    setEditingCell,
    savingCell,
    toasts,
    setToasts,
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    viewItemsPO,
    setViewItemsPO,
    handleCellSave,
    handleCustomerChange,
    handleToggleItemCheck,
    handleDelete,
    shareWA,
    shareMultipleWA,
    toggleSelect,
    totalBeratPOs,
  } = usePreOrderDetail(
    schedule,
    schedules,
    allPreOrders,
    setShowForm,
    setEditing,
    setConvertTarget,
    handleSubmit
  );

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <AnimatePresence>
        <PreOrderToastContainer
          toasts={toasts}
          remove={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
        />
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4 space-y-4">

        {/* ── Top Bar ── */}
        {!isRotated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {!isShareMode && (
                <>
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 font-bold text-xs transition-colors group shrink-0"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Kembali
                  </button>
                  <ChevronRight size={12} className="text-slate-300 shrink-0" />
                </>
              )}
              <span className="text-sm font-extrabold text-slate-800 truncate">{schedule.rute}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${schedule.status === "Open"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}>
                {schedule.status}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Share button — hanya tampil jika bukan share mode */}
              {!isShareMode && (
                <button
                  onClick={handleShareLink}
                  className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold transition-all active:scale-95"
                  title="Bagikan link halaman ini"
                >
                  <AnimatePresence mode="wait">
                    {linkCopied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <Check size={12} strokeWidth={3} />
                        <span className="hidden sm:inline">Tersalin!</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="share"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <Link2 size={12} />
                        <span className="hidden sm:inline">Bagikan</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )}
              {/* Rotate Layout Button */}
              <button
                onClick={() => setIsRotated(!isRotated)}
                className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl border text-xs font-extrabold transition-all active:scale-95 ${isRotated
                    ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                title="Putar Layar ke Horizontal"
              >
                <RotateCw size={12} className={isRotated ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
                <span className="hidden sm:inline">{isRotated ? "Vertikal" : "Putar Layar"}</span>
              </button>
              {/* Tombol Tambah — tersembunyi di share mode (muncul sebagai FAB di bawah) */}
              {!isShareMode && (
                <button
                  onClick={onOpenCreateForm}
                  className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus size={13} strokeWidth="3" />
                  <span className="hidden sm:inline">Tambah</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Content Area ── */}
        <div
          style={
            isRotated
              ? {
                position: "fixed",
                top: 0,
                left: "100%",
                width: "100vh",
                height: "100vw",
                transform: "rotate(90deg)",
                transformOrigin: "top left",
                zIndex: 9990,
                overflow: "auto",
                backgroundColor: "#f8fafc", // slate-50
                padding: "16px 16px 80px 16px",
              }
              : {}
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl h-12 border border-slate-100" />
                ))}
              </div>
            ) : pos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200/80 border-dashed">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3">
                  <Package size={24} className="text-rose-300" />
                </div>
                <p className="font-extrabold text-slate-600 text-sm mb-1">Belum Ada Booking</p>
                <p className="text-slate-400 text-xs mb-4">Tambahkan booking baru untuk jadwal ini.</p>
                <button
                  onClick={onOpenCreateForm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
                >
                  <Plus size={13} strokeWidth="3" />
                  Tambah Booking
                </button>
              </div>
            ) : (
              <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm ${isRotated ? "" : "overflow-hidden"}`}>
                {/* Sub-header with font size selector and stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spreadsheet</span>
                      <span className="text-[10px] text-slate-400">— Klik cell untuk edit langsung</span>
                    </div>

                    {/* Font Size Selector */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 px-1 uppercase">Font:</span>
                      {[9, 10, 11, 12].map((size) => (
                        <button
                          key={size}
                          onClick={() => setTableFontSize(size)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${tableFontSize === size
                              ? "bg-white text-rose-600 shadow-2xs border border-slate-200/50"
                              : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Weight size={10} />
                      Total: {totalBeratPOs.toFixed(1)} Kg
                    </span>
                    <span>{pos.length} baris</span>
                  </div>
                </div>

                {/* Scrollable table */}
                <div className={isRotated ? "w-full" : "overflow-x-auto w-full"}>
                  <table
                    style={{
                      "--table-fs": `${tableFontSize}px`,
                      fontSize: "var(--table-fs)",
                    } as React.CSSProperties}
                    className={`${isRotated ? "w-full min-w-0 table-fixed" : "min-w-[900px] table-auto"} w-full border-collapse text-left`}
                  >
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                      <tr className="text-slate-500 font-bold uppercase tracking-wider select-none" style={{ fontSize: "calc(var(--table-fs) - 1px)" }}>
                        <th className="border-r border-slate-200 px-1 py-2 text-center bg-slate-100/80" style={{ width: isRotated ? "4%" : "36px" }}>#</th>
                        <th className="border-r border-slate-200 px-1 py-2 text-center bg-slate-50" style={{ width: isRotated ? "6%" : "40px" }}>✓</th>
                        <th className="border-r border-slate-200 px-2 py-2" style={{ width: isRotated ? "18%" : "160px" }}>Pelanggan</th>
                        <th className="border-r border-slate-200 px-2 py-2" style={{ width: isRotated ? "11%" : "112px" }}>Berat</th>
                        <th className="border-r border-slate-200 px-2 py-2" style={{ width: isRotated ? "12%" : "150px" }}>Barang</th>
                        <th className="border-r border-slate-200 px-2 py-2" style={{ width: isRotated ? "10%" : "112px" }}>PIC</th>
                        <th className="border-r border-slate-200 px-2 py-2" style={{ width: isRotated ? "15%" : "160px" }}>Catatan</th>
                        <th className="border-r border-slate-200 px-2 py-2 text-center" style={{ width: isRotated ? "10%" : "96px" }}>Status</th>
                        <th className="px-2 py-2 text-right" style={{ width: isRotated ? "14%" : "176px" }}>Aksi</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {pos.map((po, poIdx) => {
                        const isSelesai = po.status === "Selesai";
                        const checkedCount = po.items.filter((i) => i.checked).length;
                        const totalItems = po.items.length;
                        const isSaving = savingCell?.startsWith(po.id);

                        return (
                          <tr
                            key={po.id}
                            className={`group transition-colors duration-100 ${selectedIds.includes(po.id)
                                ? "bg-rose-50/50"
                                : isSelesai
                                  ? "bg-emerald-50/20"
                                  : "hover:bg-slate-50/60"
                              } ${isSaving ? "opacity-70" : ""}`}
                          >
                            {/* # */}
                            <td
                              style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                              className={`border-r border-slate-100 ${isRotated ? "px-1 py-1.5 w-7" : "px-2 py-2 w-9"} text-center bg-slate-50/80 font-mono text-slate-400 select-none`}
                            >
                              {poIdx + 1}
                            </td>

                            {/* Checkbox */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1.5 w-8" : "px-2 py-2 w-10"} text-center`}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(po.id)}
                                onChange={() => toggleSelect(po.id)}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>

                            {/* Pelanggan */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 min-w-[75px]" : "px-2 py-1.5 min-w-[160px]"} align-middle`}>
                              {isSelesai ? (
                                <span
                                  style={{ fontSize: "var(--table-fs)" }}
                                  className={isRotated ? "font-extrabold text-slate-800 break-words whitespace-normal leading-tight block" : "font-extrabold text-slate-800 truncate block"}
                                >
                                  {!isRotated && po.namaPelanggan && po.namaPelanggan.length > 10
                                    ? `${po.namaPelanggan.slice(0, 10)}...`
                                    : po.namaPelanggan}
                                </span>
                              ) : (
                                <CustomerDropdownCell
                                  po={po}
                                  customers={customers}
                                  onSelect={(c) => handleCustomerChange(po.id, c)}
                                  style={{ fontSize: "var(--table-fs)" }}
                                  isRotated={!isRotated}
                                />
                              )}
                            </td>

                            {/* Total Berat */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 w-[50px]" : "px-2 py-1.5 w-28"} align-middle`}>
                              <div className="flex items-center gap-1">
                                {!isRotated && <Weight size={10} className="text-slate-400 shrink-0" />}
                                {isSelesai ? (
                                  <span
                                    style={{ fontSize: "var(--table-fs)" }}
                                    className={`font-bold text-slate-700 block ${isRotated ? "break-words whitespace-normal leading-tight" : "whitespace-nowrap"}`}
                                  >
                                    {po.totalKg.toFixed(1)} Kg
                                  </span>
                                ) : (
                                  <div className="flex-1">
                                    <EditableCell
                                      value={po.totalKg.toFixed(1)}
                                      poId={po.id}
                                      field="totalKg"
                                      type="number"
                                      editingCell={editingCell}
                                      onStartEdit={setEditingCell}
                                      onSave={handleCellSave}
                                      className={isRotated ? "font-bold text-slate-700 break-words whitespace-normal leading-tight" : "font-bold text-slate-700 whitespace-nowrap"}
                                      style={{ fontSize: "var(--table-fs)" }}
                                      isRotated={!isRotated}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Barang */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 min-w-[80px]" : "px-2 py-1.5 min-w-[150px]"} align-middle`}>
                              <button
                                onClick={() => setViewItemsPO(po)}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 font-extrabold text-slate-600 transition-all active:scale-95 w-full justify-center whitespace-normal"
                                style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                              >
                                {!isRotated && <Package size={10} className="shrink-0" />}
                                {totalItems > 0 ? (
                                  isRotated ? (
                                    `${checkedCount}/${totalItems} ✓`
                                  ) : (
                                    `${totalItems} Barang (${checkedCount} ✓)`
                                  )
                                ) : (
                                  isRotated ? "+" : "+ Tambah Barang"
                                )}
                              </button>
                            </td>

                            {/* PIC — editable bebas */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 w-[45px]" : "px-2 py-1.5 w-28"} align-middle`}>
                              {isSelesai ? (
                                <span
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  className={`font-bold text-slate-500 block ${isRotated ? "break-words whitespace-normal leading-tight" : "truncate"}`}
                                >
                                  {po.pic || "—"}
                                </span>
                              ) : (
                                <EditableCell
                                  value={po.pic || ""}
                                  poId={po.id}
                                  field="pic"
                                  editingCell={editingCell}
                                  onStartEdit={setEditingCell}
                                  onSave={handleCellSave}
                                  className={isRotated ? "font-bold text-slate-600 break-words whitespace-normal leading-tight" : "font-bold text-slate-600 truncate"}
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  isRotated={!isRotated}
                                />
                              )}
                            </td>

                            {/* Catatan */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 min-w-[70px]" : "px-2 py-1.5 min-w-[160px]"} align-middle`}>
                              {isSelesai ? (
                                po.catatan ? (
                                  <span
                                    style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                    className={`italic block ${isRotated ? "text-slate-400 break-words whitespace-normal leading-tight" : "text-slate-400 line-clamp-1"}`}
                                  >
                                    📝 {po.catatan}
                                  </span>
                                ) : null
                              ) : (
                                <EditableCell
                                  value={po.catatan || ""}
                                  poId={po.id}
                                  field="catatan"
                                  editingCell={editingCell}
                                  onStartEdit={setEditingCell}
                                  onSave={handleCellSave}
                                  className={isRotated ? "text-slate-400 italic break-words whitespace-normal leading-tight" : "text-slate-400 italic line-clamp-1"}
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  isRotated={!isRotated}
                                />
                              )}
                            </td>

                            {/* Status */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1 w-[50px]" : "px-2 py-1.5 w-24"} text-center align-middle`}>
                              <span
                                style={{ fontSize: "calc(var(--table-fs) - 1.5px)" }}
                                className={`font-bold px-1 py-0.5 rounded select-none ${isRotated ? "block break-words whitespace-normal leading-tight" : "inline-block"} ${isSelesai
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  }`}
                              >
                                {po.status}
                              </span>
                            </td>

                            {/* Aksi */}
                            <td className={`px-1 py-1 ${isRotated ? "w-[80px]" : "w-44"} text-right align-middle`}>
                              <div className="flex items-center justify-end gap-0.5 flex-wrap">
                                <button
                                  onClick={() => shareWA(po)}
                                  className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100`}
                                  title="Share WA"
                                >
                                  <MessageCircle size={isRotated ? 11 : 13} />
                                </button>

                                {!isSelesai ? (
                                  <>
                                    <button
                                      onClick={() => { setEditing(po); setShowForm(true); }}
                                      className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100`}
                                      title="Edit"
                                    >
                                      <Pencil size={isRotated ? 11 : 13} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(po)}
                                      className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-rose-500 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100`}
                                      title="Hapus"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                    {!isShareMode && (
                                      <button
                                        onClick={() => setConvertTarget(po)}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold transition-all active:scale-95 shrink-0"
                                        title="Pindahkan ke Pesanan"
                                      >
                                        <ArrowRight size={9} strokeWidth={3} />
                                        Pindahkan
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span
                                    style={{ fontSize: "calc(var(--table-fs) - 1.5px)" }}
                                    className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded select-none whitespace-nowrap"
                                  >
                                    Selesai ✓
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer total row */}
                    <tfoot>
                      <tr
                        className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-600"
                        style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                      >
                        <td colSpan={3} className={`${isRotated ? "px-1 py-1.5" : "px-3 py-2"} text-right text-slate-500`}>Total</td>
                        <td className={`border-r border-slate-200 ${isRotated ? "px-1 py-1.5" : "px-3 py-2"} font-extrabold text-rose-600 whitespace-nowrap`}>
                          {totalBeratPOs.toFixed(1)} Kg
                        </td>
                        <td colSpan={5} className={`${isRotated ? "px-1 py-1.5" : "px-3 py-2"} text-slate-400`}>{pos.length} booking</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Modals ── */}
          {showForm && (
            <PreOrderFormModal
              initial={editing}
              schedules={schedules}
              customers={customers}
              preOrders={allPreOrders}
              defaultScheduleId={schedule.id}
              onClose={() => { setShowForm(false); setEditing(null); }}
              onSubmit={handleSubmit}
            />
          )}

          {convertTarget && (
            <ConvertPreOrderModal
              preOrder={convertTarget}
              onClose={() => setConvertTarget(null)}
              onConverted={() => {
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

          {/* ── Items Edit Modal ── */}
          <AnimatePresence>
            {viewItemsPO && (
              <ItemsEditModal
                po={viewItemsPO}
                onClose={() => setViewItemsPO(null)}
                onToggleCheck={handleToggleItemCheck}
                onSaveItems={async (poId, items) => {
                  await updatePreOrder(poId, { items });
                  // Sync viewItemsPO state
                  setViewItemsPO((prev) => prev ? { ...prev, items } : prev);
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Bulk Action Bar ── */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3 z-[90]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white leading-none">{selectedIds.length} Terpilih</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Booking dipilih</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={shareMultipleWA}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <MessageCircle size={13} />
                    Bagikan WA
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating Rotate Back Button — Only visible when rotated ── */}
          {isRotated && (
            <button
              onClick={() => setIsRotated(false)}
              className="fixed bottom-6 left-6 z-[10000] flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/90 backdrop-blur text-white rounded-xl text-xs font-extrabold shadow-2xl transition-all active:scale-90"
            >
              <RotateCw size={12} className="animate-spin-slow" />
              Vertikal
            </button>
          )}

          {/* ── Share Mode FAB ── Tombol Tambah mengambang di bawah saat share mode */}
          <AnimatePresence>
            {isShareMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={onOpenCreateForm}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-500/40 flex items-center justify-center transition-all active:scale-90 z-40"
                title="Tambah Booking"
              >
                <Plus size={22} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
