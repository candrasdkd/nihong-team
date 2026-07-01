import React, { useCallback, useRef, useEffect, useState } from "react";
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
} from "lucide-react";
import { DepartureSchedule, PreOrder, Customer } from "../types";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { ConvertPreOrderModal } from "../components/PreOrder/ConvertPreOrderModal";
import { PreOrderToastContainer } from "../components/PreOrder/PreOrderToastContainer";
import { ConfirmModal } from "../components/ConfirmModal";
import { usePreOrderDetail, EditingCell } from "../hooks/usePreOrderDetail";

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
}: {
  value: string | number;
  poId: string;
  field: EditingCell["field"];
  type?: "text" | "number";
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onSave: (poId: string, field: EditingCell["field"], value: string) => void;
  className?: string;
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
        className="w-full min-w-0 px-1.5 py-0.5 border-2 border-rose-400 rounded outline-none text-xs font-semibold text-slate-800 bg-rose-50/50 focus:bg-white transition-all"
        step={type === "number" ? "0.1" : undefined}
      />
    );
  }

  return (
    <div
      onClick={() => onStartEdit({ poId, field })}
      className={`cursor-pointer group/cell flex items-center gap-1 min-h-[22px] rounded px-1 py-0.5 hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 transition-all ${className}`}
      title="Klik untuk edit"
    >
      <span className="flex-1 truncate">{value ?? "—"}</span>
      <Pencil
        size={9}
        className="text-slate-300 group-hover/cell:text-rose-400 shrink-0 opacity-0 group-hover/cell:opacity-100 transition-all"
      />
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
}: Props) {
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 font-bold text-xs transition-colors group shrink-0"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Kembali
            </button>
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
            <span className="text-sm font-extrabold text-slate-800 truncate">{schedule.rute}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
              schedule.status === "Open"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {schedule.status}
            </span>
          </div>

          <button
            onClick={onOpenCreateForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-500/25 transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
          >
            <Plus size={13} strokeWidth="3" />
            Tambah
          </button>
        </motion.div>

        {/* ── Spreadsheet Table ── */}
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
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              {/* Table sub-header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spreadsheet</span>
                  <span className="text-[10px] text-slate-400">— Klik cell untuk edit langsung</span>
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
              <div className="overflow-x-auto w-full">
                <table className="min-w-[900px] w-full border-collapse text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                      <th className="border-r border-slate-200 px-2 py-2.5 w-9 text-center bg-slate-100/80">#</th>
                      <th className="border-r border-slate-200 px-2 py-2.5 w-10 text-center bg-slate-50">✓</th>
                      <th className="border-r border-slate-200 px-3 py-2.5 min-w-[160px]">Pelanggan</th>
                      <th className="border-r border-slate-200 px-3 py-2.5 min-w-[120px]">No. Telpon</th>
                      <th className="border-r border-slate-200 px-3 py-2.5 w-28">Total Berat</th>
                      <th className="border-r border-slate-200 px-3 py-2.5 min-w-[200px]">Catatan / Barang</th>
                      <th className="border-r border-slate-200 px-3 py-2.5 w-24 text-center">Status</th>
                      <th className="px-3 py-2.5 w-44 text-right">Aksi</th>
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
                          className={`group transition-colors duration-100 ${
                            selectedIds.includes(po.id)
                              ? "bg-rose-50/50"
                              : isSelesai
                              ? "bg-emerald-50/20"
                              : "hover:bg-slate-50/60"
                          } ${isSaving ? "opacity-70" : ""}`}
                        >
                          {/* # */}
                          <td className="border-r border-slate-100 px-2 py-2 w-9 text-center bg-slate-50/80 font-mono text-[10px] text-slate-400 select-none">
                            {poIdx + 1}
                          </td>

                          {/* Checkbox */}
                          <td className="border-r border-slate-100 px-2 py-2 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(po.id)}
                              onChange={() => toggleSelect(po.id)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>

                          {/* Pelanggan */}
                          <td className="border-r border-slate-100 px-2 py-1.5 min-w-[160px] align-middle">
                            <div className="font-extrabold text-slate-800 text-[11px] leading-tight">
                              {isSelesai ? po.namaPelanggan : (
                                <EditableCell
                                  value={po.namaPelanggan}
                                  poId={po.id}
                                  field="namaPelanggan"
                                  editingCell={editingCell}
                                  onStartEdit={setEditingCell}
                                  onSave={handleCellSave}
                                  className="font-extrabold text-slate-800 text-[11px]"
                                />
                              )}
                            </div>
                          </td>

                          {/* No. Telpon */}
                          <td className="border-r border-slate-100 px-2 py-1.5 min-w-[120px] align-middle text-slate-500">
                            {isSelesai ? (
                              <span className="text-[10px]">{po.noTelponPelanggan || "—"}</span>
                            ) : (
                              <EditableCell
                                value={po.noTelponPelanggan || ""}
                                poId={po.id}
                                field="noTelponPelanggan"
                                editingCell={editingCell}
                                onStartEdit={setEditingCell}
                                onSave={handleCellSave}
                                className="text-[10px] text-slate-500"
                              />
                            )}
                          </td>

                          {/* Total Berat */}
                          <td className="border-r border-slate-100 px-2 py-1.5 w-28 align-middle">
                            <div className="flex items-center gap-1">
                              <Weight size={10} className="text-slate-400 shrink-0" />
                              {isSelesai ? (
                                <span className="font-bold text-[11px] text-slate-700">{po.totalKg.toFixed(1)} Kg</span>
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
                                    className="font-bold text-[11px] text-slate-700"
                                  />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Catatan / Barang */}
                          <td className="border-r border-slate-100 px-2 py-1.5 min-w-[200px] align-middle">
                            <div className="flex flex-col gap-1">
                              {totalItems > 0 && (
                                <button
                                  onClick={() => setViewItemsPO(po)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 font-extrabold text-[10px] text-slate-600 transition-all active:scale-95 w-max"
                                >
                                  <Package size={10} className="shrink-0" />
                                  {totalItems} Barang ({checkedCount} ✓)
                                </button>
                              )}
                              {isSelesai ? (
                                po.catatan ? (
                                  <span className="text-[10px] text-slate-400 italic line-clamp-1">
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
                                  className="text-[10px] text-slate-400 italic"
                                />
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="border-r border-slate-100 px-2 py-1.5 w-24 text-center align-middle">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${
                              isSelesai
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}>
                              {po.status}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="px-2 py-1.5 w-44 text-right align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => shareWA(po)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100"
                                title="Share WA"
                              >
                                <MessageCircle size={13} />
                              </button>

                              {!isSelesai ? (
                                <>
                                  <button
                                    onClick={() => { setEditing(po); setShowForm(true); }}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                                    title="Edit"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(po)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                                    title="Hapus"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setConvertTarget(po)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold transition-all active:scale-95 shrink-0"
                                    title="Pindahkan ke Pesanan"
                                  >
                                    <ArrowRight size={9} strokeWidth={3} />
                                    Pindahkan
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded select-none">
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
                    <tr className="bg-slate-50/80 border-t-2 border-slate-200 text-[10px] font-bold text-slate-600">
                      <td colSpan={4} className="px-3 py-2 text-right text-slate-500">Total</td>
                      <td className="border-r border-slate-200 px-3 py-2 font-extrabold text-rose-600">
                        {totalBeratPOs.toFixed(1)} Kg
                      </td>
                      <td colSpan={3} className="px-3 py-2 text-slate-400">{pos.length} booking</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

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

      {/* ── Items Checklist Modal ── */}
      <AnimatePresence>
        {viewItemsPO && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setViewItemsPO(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden z-10 flex flex-col"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Daftar Titipan Barang</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Konsumen: <span className="text-rose-600 font-bold">{viewItemsPO.namaPelanggan}</span>
                  </p>
                </div>
                <button
                  onClick={() => setViewItemsPO(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 max-h-[350px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Jastiper</span>
                    <span className="text-slate-800 font-extrabold">{viewItemsPO.namaJastiper}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Berat</span>
                    <span className="text-rose-600 font-extrabold">{viewItemsPO.totalKg.toFixed(1)} Kg</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Checklist ({viewItemsPO.items.filter((i) => i.checked).length} / {viewItemsPO.items.length} Selesai)
                  </p>
                  <div className="space-y-1.5 bg-slate-50/50 border border-slate-100 p-2.5 rounded-2xl">
                    {viewItemsPO.items.map((item, idx) => {
                      const disabled = viewItemsPO.status === "Selesai";
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-colors ${
                            disabled
                              ? "cursor-default"
                              : "cursor-pointer hover:bg-white hover:shadow-sm active:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={() => handleToggleItemCheck(viewItemsPO, idx)}
                            disabled={disabled}
                            className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 w-4 h-4 shrink-0"
                          />
                          <span className={`text-xs font-semibold flex-1 ${
                            item.checked ? "line-through text-slate-400" : "text-slate-700"
                          }`}>
                            {item.namaBarang}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {viewItemsPO.catatan && (
                  <div className="flex items-start gap-1.5 bg-amber-50/40 border border-amber-100/50 rounded-2xl px-3 py-2 text-[10px] font-semibold">
                    <span className="text-amber-500">📝</span>
                    <p className="italic leading-relaxed text-slate-600">{viewItemsPO.catatan}</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setViewItemsPO(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
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
    </div>
  );
}
