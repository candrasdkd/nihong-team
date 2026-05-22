import { useState, useEffect } from "react";
import { Calculator, ArrowRightLeft, RefreshCw, AlertCircle } from "lucide-react";
import { formatIDR } from "../utils/format";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { updateSettings } from "../services/settingsFirebase";
import { FlagID, FlagJP } from "./ui/Flags";

export function KursInfoCard({ globalJastipYen = 1000 }: { globalJastipYen?: number }) {
  const { rate, loading, error } = useExchangeRate();
  const [yenInput, setYenInput] = useState<string>(String(globalJastipYen));
  const [isTyping, setIsTyping] = useState(false);
  
  // Sync when global changes, unless user is currently typing
  useEffect(() => {
    if (!isTyping) {
      setYenInput(String(globalJastipYen));
    }
  }, [globalJastipYen, isTyping]);

  // Handle typing and auto-save
  useEffect(() => {
    if (!isTyping) return;
    const timer = setTimeout(() => {
      const val = parseFloat(yenInput);
      if (!isNaN(val) && val >= 0) {
        updateSettings({ jastipYenPerKg: val });
      }
      setIsTyping(false);
    }, 1000); // 1s auto-save debounce
    return () => clearTimeout(timer);
  }, [yenInput, isTyping]);

  const handleYenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYenInput(e.target.value);
    setIsTyping(true);
  };

  const yenVal = parseFloat(yenInput) || 0;
  const converted = rate ? Math.round(yenVal * rate) : 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator size={14} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Kurs & Harga Jastip</h3>
        </div>
        {loading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
      </div>

      {/* Exchange Rate Status */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/30 shadow-xs">
            <FlagJP />
            <span className="text-xs font-bold text-slate-700">1 JPY</span>
          </div>
          <ArrowRightLeft size={12} className="text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/30 shadow-xs">
            <FlagID />
            <span className="text-xs font-bold text-slate-700">IDR</span>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="w-16 h-4 bg-slate-200 animate-pulse rounded" />
          ) : error ? (
            <div className="flex items-center gap-1 text-xs text-rose-500 font-semibold" title={error}>
              <AlertCircle size={12} /> Gagal memuat
            </div>
          ) : (
            <span className="text-sm font-bold text-emerald-600">Rp {rate?.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Calculator Form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Target Harga / Kg (Yen)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">¥</span>
            <input
              type="number"
              value={yenInput}
              onChange={handleYenChange}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              placeholder="Contoh: 1000"
            />
          </div>
        </div>

        {/* Result */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center items-center gap-1">
          <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Estimasi Rupiah</span>
          {loading ? (
            <div className="w-24 h-6 bg-emerald-200/50 animate-pulse rounded mt-1" />
          ) : (
            <span className="text-lg font-black text-emerald-700">{formatIDR(converted)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
