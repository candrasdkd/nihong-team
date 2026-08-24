// src/components/NihongStore/ManageOrderItemsModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Weight,
  Layers,
  Save,
  Tag,
} from "lucide-react";
import { NihongStoreOrder, NihongStoreItem } from "../../types";
import { formatIDR } from "../../utils/format";
import { Button } from "../ui/Button";

interface ManageOrderItemsModalProps {
  isOpen: boolean;
  order: NihongStoreOrder | null;
  onClose: () => void;
  onSave: (
    orderId: string,
    updatedItems: NihongStoreItem[]
  ) => Promise<void>;
}

export function ManageOrderItemsModal({
  isOpen,
  order,
  onClose,
  onSave,
}: ManageOrderItemsModalProps) {
  const [items, setItems] = useState<NihongStoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setItems(
        order.items.map((it) => ({
          ...it,
          status: it.status || "Tersedia",
        }))
      );
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleToggleStatus = (index: number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const newStatus = it.status === "Stok habis" ? "Tersedia" : "Stok habis";
        return {
          ...it,
          status: newStatus,
        };
      })
    );
  };

  const handleNoteChange = (index: number, note: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          catatan: note,
        };
      })
    );
  };

  const availableItems = items.filter((it) => it.status !== "Stok habis");
  const outOfStockItems = items.filter((it) => it.status === "Stok habis");

  const calculatedTotalKg = Number(
    availableItems
      .reduce((sum, it) => sum + (it.beratKg || 0.3) * (it.jumlah || 1), 0)
      .toFixed(2)
  );

  const calculatedTotalIdr = availableItems.reduce(
    (sum, it) => sum + (it.hargaIdr || 0) * (it.jumlah || 1),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSave(order.id, items);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menyimpan ketersediaan item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 ring-1 ring-amber-200 shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">
                Kelola Ketersediaan Barang Titipan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                Pesanan <span className="font-bold text-slate-600">{order.no}</span> · {order.namaPelanggan}
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 size={15} />
                  <span>{availableItems.length} Tersedia</span>
                </div>
                {outOfStockItems.length > 0 && (
                  <div className="flex items-center gap-1.5 font-bold text-rose-600">
                    <XCircle size={15} />
                    <span>{outOfStockItems.length} Stok Habis</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 justify-between sm:justify-end">
                <span className="font-extrabold text-slate-700">
                  Berat: {calculatedTotalKg || 0.5} Kg
                </span>
                <span className="font-extrabold text-brand-orange">
                  Est. {formatIDR(calculatedTotalIdr)}
                </span>
              </div>
            </div>

            {/* Instruction Note */}
            <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/60 p-3 rounded-2xl flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Tandai <strong>Stok Habis</strong> jika produk kosong di gerai Jepang. Tagihan dan berat akan disesuaikan otomatis.
              </p>
            </div>

            {/* Items List */}
            <div className="space-y-2.5 sm:space-y-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={13} />
                Daftar Barang ({items.length})
              </span>

              {items.map((it, idx) => {
                const isOos = it.status === "Stok habis";
                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 sm:space-y-3 ${
                      isOos
                        ? "bg-slate-50/80 border-slate-200 opacity-75"
                        : "bg-white border-slate-200/90 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.namaBarang}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package size={20} />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-xs font-black leading-snug ${isOos ? "text-slate-500 line-through" : "text-slate-800"}`}>
                              {it.namaBarang}
                            </h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isOos ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isOos ? "Stok Habis" : "Tersedia"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 font-medium">
                            {it.kodeBarang && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                {it.kodeBarang}
                              </span>
                            )}
                            {it.warna && <span>Warna: {it.warna}</span>}
                            {it.ukuran && <span>Ukuran: {it.ukuran}</span>}
                            <span>· Qty: <b>{it.jumlah}</b></span>
                            {it.hargaIdr ? <span>· <b>{formatIDR(it.hargaIdr * it.jumlah)}</b></span> : null}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(idx)}
                        className={`w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                          isOos
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                        }`}
                      >
                        {isOos ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Set Tersedia</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            <span>Set Stok Habis</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Note Field */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">Catatan:</span>
                      <input
                        type="text"
                        value={it.catatan || ""}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        placeholder={isOos ? "Contoh: Stok warna habis di store Tokyo" : "Catatan khusus belanja…"}
                        className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Footer Buttons */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex-1 sm:flex-initial text-center"
            >
              Batal
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-brand-orange/20 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Save size={15} />
              <span>{loading ? "Menyimpan…" : "Simpan Perubahan"}</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
