// src/components/NihongStore/NihongStoreOrderCard.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Calendar,
  User,
  Phone,
  MapPin,
  Weight,
  MessageCircle,
  Plane,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Layers,
  Trash2,
  XCircle,
  CheckCircle2,
  Tag,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  Copy,
} from "lucide-react";
import { NihongStoreOrder } from "../../types";
import { formatDate, formatDateTime, formatIDR } from "../../utils/format";
import { Button } from "../ui/Button";

interface NihongStoreOrderCardProps {
  order: NihongStoreOrder;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  onAssign: (order: NihongStoreOrder) => void;
  onReject: (order: NihongStoreOrder) => void;
  onDelete: (order: NihongStoreOrder) => void;
  onManageItems: (order: NihongStoreOrder) => void;
  onUpdateStatus: (order: NihongStoreOrder) => void;
  onWhatsAppChat: (order: NihongStoreOrder) => void;
}

export function NihongStoreOrderCard({
  order,
  isSelected = false,
  onSelectToggle,
  onAssign,
  onReject,
  onDelete,
  onManageItems,
  onUpdateStatus,
  onWhatsAppChat,
}: NihongStoreOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isInbox = order.status === "inbox";
  const isAssigned = order.status === "assigned";
  const isRejected = order.status === "rejected";

  const totalItemCount = order.items.reduce((sum, it) => sum + (it.jumlah || 1), 0);
  const availableItemCount = order.items.filter((it) => it.status !== "Stok habis").length;
  const oosItemCount = order.items.length - availableItemCount;

  const handleCopyNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order.no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`relative bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 shadow-xs sm:shadow-sm overflow-hidden ${
        isSelected
          ? "border-brand-orange ring-2 ring-brand-orange/20 shadow-md bg-orange-50/[0.02]"
          : "border-slate-200/90 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="p-3 sm:p-4.5 space-y-2.5 sm:space-y-3">
        {/* ── 1. Top Header: Checkbox + No Order / Date + Status Badge + Menu ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Multi-select checkbox */}
            {isInbox && onSelectToggle && (
              <button
                type="button"
                onClick={() => onSelectToggle(order.id)}
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                  isSelected
                    ? "bg-brand-orange border-brand-orange text-white shadow-sm"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </button>
            )}

            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {/* Order Code Badge with Copy */}
              <button
                type="button"
                onClick={handleCopyNo}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 text-[11px] font-black tracking-tight font-mono transition-all group shrink-0"
                title="Klik untuk salin no order"
              >
                <span>{order.no}</span>
                {copied ? (
                  <Check size={10} className="text-emerald-600" />
                ) : (
                  <Copy size={10} className="text-slate-400 group-hover:text-slate-600" />
                )}
              </button>

              {/* Timestamp */}
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                {order.createdAt ? formatDateTime(order.createdAt) : "Baru saja"}
              </span>
            </div>
          </div>

          {/* Right side: Status Badge & 3-Dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isRejected ? (
              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <XCircle size={10} className="text-rose-500" />
                <span>Dibatalkan</span>
              </span>
            ) : isAssigned ? (
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <Plane size={10} className="text-purple-600" />
                <span>{order.displayStatus || "Terjadwal"}</span>
              </span>
            ) : (
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{order.displayStatus || "Menunggu Jadwal"}</span>
              </span>
            )}

            {/* OOS Warning Badge */}
            {oosItemCount > 0 && !isRejected && (
              <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <AlertCircle size={9} />
                <span>{oosItemCount} Habis</span>
              </span>
            )}

            {/* 3-dots Dropdown Action Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <MoreVertical size={15} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-7 z-30 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 text-xs font-semibold text-slate-700 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onUpdateStatus(order);
                        }}
                        className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-blue-50 text-blue-700 transition-colors text-left"
                      >
                        <RefreshCw size={13} />
                        Ubah Status Pesanan
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onManageItems(order);
                        }}
                        className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors text-left"
                      >
                        <Layers size={13} className="text-amber-500" />
                        Kelola Stok Item
                      </button>
                      {!isRejected && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onReject(order);
                          }}
                          className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-rose-50 text-rose-600 transition-colors text-left"
                        >
                          <XCircle size={13} />
                          Tolak Pesanan
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(order);
                        }}
                        className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-rose-50 text-rose-600 transition-colors text-left border-t border-slate-100"
                      >
                        <Trash2 size={13} />
                        Hapus dari Inbox
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── 2. Customer Information Bar & Direct WhatsApp ── */}
        <div className="flex items-center justify-between gap-2 bg-slate-50/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-navyDark to-brand-navy flex items-center justify-center text-white shrink-0 font-black text-xs">
              {order.namaPelanggan[0]?.toUpperCase() || "C"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {order.namaPelanggan}
                </span>
                {order.noTelponPelanggan && (
                  <span className="text-[11px] text-slate-400 font-medium font-mono hidden xs:inline truncate">
                    • {order.noTelponPelanggan}
                  </span>
                )}
              </div>
              {order.alamatPelanggan && (
                <p className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                  {order.alamatPelanggan}
                </p>
              )}
            </div>
          </div>

          {/* WhatsApp Direct Button */}
          {order.noTelponPelanggan && (
            <button
              type="button"
              onClick={() => onWhatsAppChat(order)}
              className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold transition-all active:scale-95 shrink-0 shadow-2xs"
              title="Hubungi pemesan via WhatsApp"
            >
              <MessageCircle size={12} className="text-white" />
              <span>WA</span>
            </button>
          )}
        </div>

        {/* ── 3. Product Items Summary ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] px-0.5 text-slate-500 font-bold">
            <span>Titipan ({order.items.length} item · {totalItemCount} pcs)</span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onManageItems(order)}
                className="text-slate-500 hover:text-brand-orange flex items-center gap-1 transition-colors"
                title="Kelola status stok ketersediaan barang"
              >
                <Layers size={11} />
                <span>Stok</span>
              </button>
              {order.items.length > 2 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-brand-orange hover:text-orange-600 flex items-center gap-0.5 transition-colors"
                >
                  <span>{expanded ? "Tutup" : `Lihat Semua (${order.items.length})`}</span>
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
            </div>
          </div>

          {/* Items preview list */}
          <div className="space-y-1.5">
            {(expanded ? order.items : order.items.slice(0, 2)).map((it, idx) => {
              const isOos = it.status === "Stok habis";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs transition-all ${
                    isOos
                      ? "bg-slate-50/80 border-slate-200 opacity-70"
                      : "bg-white border-slate-100 shadow-2xs"
                  }`}
                >
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.namaBarang}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0 bg-slate-50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Package size={15} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className={`font-bold leading-snug line-clamp-1 text-xs ${isOos ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {it.namaBarang}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isOos && (
                          <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">
                            Habis
                          </span>
                        )}
                        <span className="font-black text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded-md text-[11px]">
                          x{it.jumlah}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-medium">
                      {it.kodeBarang && (
                        <span className="bg-slate-100 px-1 rounded font-mono text-[9px] text-slate-600 font-semibold">
                          {it.kodeBarang}
                        </span>
                      )}
                      {it.warna && (
                        <span className="bg-slate-50 border border-slate-200/60 px-1.5 rounded text-slate-600">
                          {it.warna}
                        </span>
                      )}
                      {it.ukuran && (
                        <span className="bg-slate-50 border border-slate-200/60 px-1.5 rounded text-slate-600">
                          {it.ukuran}
                        </span>
                      )}
                    </div>

                    {it.catatan && (
                      <p className="text-[10px] text-amber-700 italic pt-0.5">
                        Catatan: {it.catatan}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {!expanded && order.items.length > 2 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full py-1 text-center text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 rounded-lg transition-colors"
              >
                + {order.items.length - 2} item lainnya…
              </button>
            )}
          </div>
        </div>

        {/* ── 4. Assigned Schedule Banner (if assigned) ── */}
        {isAssigned && order.assignedScheduleRoute && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/80 text-purple-950 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Plane size={13} className="text-purple-600 shrink-0" />
              <span className="font-bold truncate">
                {order.assignedScheduleRoute}{" "}
                {order.assignedScheduleDate ? `(${formatDate(order.assignedScheduleDate)})` : ""}
              </span>
            </div>
            <span className="text-[9px] font-black bg-purple-200/80 text-purple-950 px-1.5 py-0.5 rounded shrink-0">
              Terjadwal
            </span>
          </div>
        )}

        {/* ── 5. Bottom Row: Weight + Est. Price & 50:50 Buttons ── */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-600">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-extrabold text-slate-700">
                <Weight size={11} className="text-slate-400" />
                {order.totalKg ? `${order.totalKg} Kg` : "0.5 Kg"}
              </span>
              {order.paymentStatus && (
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                  {order.paymentStatus}
                </span>
              )}
            </div>

            {order.totalEstimasiHargaIdr ? (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 mr-1">Est:</span>
                <span className="font-black text-slate-800 text-xs sm:text-sm">
                  {formatIDR(order.totalEstimasiHargaIdr)}
                </span>
              </div>
            ) : null}
          </div>

          {/* 50:50 Button Row for Mobile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateStatus(order)}
              className="w-full justify-center px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw size={12} className="text-slate-500" />
              <span>Ubah Status</span>
            </button>

            {isInbox ? (
              <Button
                type="button"
                onClick={() => onAssign(order)}
                className="w-full justify-center bg-brand-orange hover:bg-orange-600 text-white text-xs font-black px-3 py-2 rounded-xl shadow-md shadow-brand-orange/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plane size={13} />
                <span>Assign Jadwal</span>
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => onManageItems(order)}
                className="w-full justify-center px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Layers size={12} className="text-amber-500" />
                <span>Kelola Stok</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
