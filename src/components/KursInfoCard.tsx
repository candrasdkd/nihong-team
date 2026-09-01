import { useState, useEffect } from "react";
import { Calculator, ArrowRightLeft, RefreshCw, AlertCircle } from "lucide-react";
import { formatIDR } from "../utils/format";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { updateSettings } from "../services/settingsFirebase";
import { FlagID, FlagJP } from "./ui/Flags";
import { Card } from "./ui/Card";

export function KursInfoCard({ globalJastipYen = 1000 }: { globalJastipYen?: number }) {
  const { rate, loading, error } = useExchangeRate();
  const [yenInput, setYenInput] = useState<string>(String(globalJastipYen));
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isTyping) {
      setYenInput(String(globalJastipYen));
    }
  }, [globalJastipYen, isTyping]);

  useEffect(() => {
    if (!isTyping) return;
    const timer = setTimeout(() => {
      const val = parseFloat(yenInput);
      if (!isNaN(val) && val >= 0) {
        updateSettings({ jastipYenPerKg: val });
      }
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [yenInput, isTyping]);

  const handleYenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYenInput(e.target.value);
    setIsTyping(true);
  };

  const yenVal = parseFloat(yenInput) || 0;
  const converted = rate ? Math.round(yenVal * rate) : 0;

  return (
    <Card className="flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-brand-cream text-brand-orange">
            <Calculator size={14} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Kalkulator</p>
            <h3 className="text-sm font-extrabold text-brand-navyDark">Kurs & Harga Jastip</h3>
          </div>
        </div>
        {loading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-brand-mist bg-brand-mist/60 p-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white bg-white px-2.5 py-1 shadow-sm">
            <FlagJP />
            <span className="text-xs font-bold text-slate-700">1 JPY</span>
          </div>
          <ArrowRightLeft size={12} className="text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 rounded-xl border border-white bg-white px-2.5 py-1 shadow-sm">
            <FlagID />
            <span className="text-xs font-bold text-slate-700">IDR</span>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="w-16 h-4 bg-slate-200 animate-pulse rounded" />
          ) : error ? (
            <div className="flex items-center gap-1 text-xs text-red-500 font-semibold" title={error}>
              <AlertCircle size={12} /> Gagal
            </div>
          ) : (
            <span className="text-sm font-bold text-emerald-600">Rp {rate?.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Target Harga / Kg (Yen)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              data-keyboard-type="numeric"
              value={yenInput}
              onChange={handleYenChange}
              className="w-full rounded-input border border-surface-border bg-white py-2.5 pl-8 pr-3 text-sm font-bold text-brand-navyDark transition-shadow focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/10"
              placeholder="Contoh: 1000"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
          <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Estimasi Rupiah</span>
          {loading ? (
            <div className="w-24 h-6 bg-emerald-200/50 animate-pulse rounded mt-1" />
          ) : (
            <span className="text-lg font-black text-emerald-700">{formatIDR(converted)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
