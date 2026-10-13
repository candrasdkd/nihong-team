import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  fallbackSub?: string;
  icon: React.ElementType;
  trend?: number;
  index?: number;
  className?: string;
  tone?: "navy" | "orange" | "emerald" | "violet";
  badge?: string;
  live?: boolean;
}

const TONES = {
  navy: {
    gradientBar: "from-brand-navy via-brand-navyLight to-sky-400",
    glow: "bg-sky-500/10",
    iconBox: "bg-gradient-to-br from-brand-navyDark to-brand-navyLight text-white shadow-brand-navy/20",
    badge: "bg-slate-100 text-slate-700 border-slate-200/80",
    watermark: "text-brand-navy",
    hoverBorder: "hover:border-brand-navy/30",
  },
  emerald: {
    gradientBar: "from-emerald-600 via-emerald-500 to-teal-400",
    glow: "bg-emerald-500/12",
    iconBox: "bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-emerald-500/25",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    watermark: "text-emerald-900",
    hoverBorder: "hover:border-emerald-500/35",
  },
  orange: {
    gradientBar: "from-brand-orange via-orange-500 to-amber-400",
    glow: "bg-amber-500/15",
    iconBox: "bg-gradient-to-br from-brand-orange to-amber-500 text-white shadow-orange-500/25",
    badge: "bg-orange-50 text-orange-700 border-orange-200/80",
    watermark: "text-orange-950",
    hoverBorder: "hover:border-brand-orange/35",
  },
  violet: {
    gradientBar: "from-violet-600 via-violet-500 to-indigo-400",
    glow: "bg-violet-500/12",
    iconBox: "bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-purple-500/25",
    badge: "bg-violet-50 text-violet-700 border-violet-200/80",
    watermark: "text-violet-950",
    hoverBorder: "hover:border-violet-500/35",
  },
};

function FormattedValue({ value }: { value: string | number }) {
  if (typeof value !== "string") {
    return <span>{value}</span>;
  }

  // Parse IDR format: e.g. "Rp 419.508.898" or "-Rp 200.000"
  const idrMatch = value.match(/^([+-]?)\s*Rp\s*(.+)$/);
  if (idrMatch) {
    const sign = idrMatch[1];
    const amount = idrMatch[2];
    const isNegative = sign === "-";
    return (
      <span className="inline-flex items-baseline tracking-tight">
        {sign && <span className={isNegative ? "text-rose-600 font-black mr-0.5" : "mr-0.5 font-black"}>{sign}</span>}
        <span className="text-xs sm:text-sm font-extrabold text-slate-400 mr-1 uppercase">Rp</span>
        <span className={isNegative ? "text-rose-600" : "text-brand-navyDark"}>{amount}</span>
      </span>
    );
  }

  // Parse JPY format: e.g. "¥10.000" or "-¥1.000"
  const jpyMatch = value.match(/^([+-]?)\s*¥\s*(.+)$/);
  if (jpyMatch) {
    const sign = jpyMatch[1];
    const amount = jpyMatch[2];
    const isNegative = sign === "-";
    return (
      <span className="inline-flex items-baseline tracking-tight">
        {sign && <span className={isNegative ? "text-rose-600 font-black mr-0.5" : "mr-0.5 font-black"}>{sign}</span>}
        <span className="text-xs sm:text-sm font-extrabold text-slate-400 mr-1">¥</span>
        <span className={isNegative ? "text-rose-600" : "text-brand-navyDark"}>{amount}</span>
      </span>
    );
  }

  return <span>{value}</span>;
}

export function StatCard({
  label,
  value,
  sub,
  fallbackSub,
  icon: Icon,
  trend,
  className = "",
  tone = "navy",
  badge,
  live,
}: StatCardProps) {
  const pos = trend === undefined || trend >= 0;
  const palette = TONES[tone] || TONES.navy;
  const displaySub = sub || fallbackSub;

  return (
    <div
      className={`group relative flex min-h-[162px] flex-col justify-between overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(11,37,69,0.04),0_12px_24px_-4px_rgba(11,37,69,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(11,37,69,0.09),0_0_0_1px_rgba(11,37,69,0.05)] ${palette.hoverBorder} ${className}`}
    >
      {/* Top subtle gradient line accent */}
      <div className={`absolute inset-x-0 top-0 h-[3.5px] bg-gradient-to-r ${palette.gradientBar}`} />

      {/* Ambient background corner glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity duration-500 ${palette.glow} opacity-60 group-hover:opacity-100`}
      />

      {/* Subtle watermark icon in background */}
      <div
        className={`pointer-events-none absolute -bottom-3 -right-3 opacity-[0.035] transition-all duration-300 group-hover:scale-105 group-hover:opacity-[0.07] ${palette.watermark}`}
      >
        <Icon size={76} strokeWidth={1.5} />
      </div>

      {/* Card Header: Icon + Badge / Trend */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${palette.iconBox}`}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>

        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                pos
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}

          {badge && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-xs ${palette.badge}`}
            >
              {live && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-orange" />
                </span>
              )}
              {badge}
            </div>
          )}
        </div>
      </div>

      {/* Card Body: Label + Primary Value */}
      <div className="relative z-10 mt-4 flex-1">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <div
          className="text-xl font-black leading-tight tracking-tight text-brand-navyDark sm:text-2xl"
          title={String(value)}
        >
          <FormattedValue value={value} />
        </div>
      </div>

      {/* Card Footer: Subtitle / Contextual Helper */}
      {displaySub && (
        <div className="relative z-10 mt-3.5 border-t border-slate-100/90 pt-2.5">
          {sub && (sub.startsWith("¥") || sub.startsWith("-¥") || sub.startsWith("Rp")) ? (
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valuta Lain:</span>
              <span className="font-extrabold text-brand-navy">{sub}</span>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${sub ? "bg-slate-300" : "bg-slate-200"} shrink-0`} />
              <span className="truncate">{displaySub}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
