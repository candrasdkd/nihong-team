import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type CapitalAdvance } from "../services/capitalAdvanceFirebase";
import { formatIDR } from "../utils/format";
import { formatAndAddYear } from "../utils/helpers";
import { Coins, Calendar, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface CapitalAdvanceTrackerProps {
  pending: CapitalAdvance[];
  loading: boolean;
  onMarkReturned: (adv: CapitalAdvance) => void;
}

export function CapitalAdvanceTracker({
  pending,
  loading,
  onMarkReturned,
}: CapitalAdvanceTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalPendingAmount = pending.reduce((sum, item) => sum + item.jumlah, 0);

  if (pending.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Modal Belanja Belum Kembali</span>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                {pending.length} Transaksi
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
              Total modal aktif yang belum kembali: <span className="font-bold text-rose-600 font-mono">{formatIDR(totalPendingAmount)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
            {isExpanded ? "Sembunyikan" : "Tampilkan Rincian"}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-50 bg-slate-50/30"
          >
            <div className="p-5">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Memuat modal belanja...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pending.map((adv) => (
                    <motion.div
                      key={adv.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-200/80 transition-all duration-300 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-black font-mono text-slate-800">
                            {formatIDR(adv.jumlah)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                            <AlertCircle className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                            Belum Kembali
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-medium text-[11px]">{formatAndAddYear(adv.tanggalKeluar)}</span>
                          </div>
                          {adv.keterangan ? (
                            <div className="flex items-start gap-1.5 text-slate-600">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="font-semibold line-clamp-2 leading-relaxed break-all">{adv.keterangan}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 italic">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Tanpa keterangan</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end">
                        <button
                          onClick={() => onMarkReturned(adv)}
                          className="px-3.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 hover:border-emerald-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Kembali</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
