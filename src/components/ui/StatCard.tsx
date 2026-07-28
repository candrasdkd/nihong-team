import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
  index?: number;
  className?: string;
  tone?: "navy" | "orange" | "emerald" | "violet";
}

const TONES = {
  navy: {
    icon: "bg-brand-mist text-brand-navy",
    line: "bg-brand-navy",
  },
  orange: {
    icon: "bg-brand-cream text-brand-orange",
    line: "bg-brand-orange",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    line: "bg-emerald-500",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    line: "bg-violet-500",
  },
};

export function StatCard({ label, value, sub, icon: Icon, trend, className = "", tone = "navy" }: StatCardProps) {
  const pos = trend === undefined || trend >= 0;
  const palette = TONES[tone];

  return (
    <Card hover className={`relative min-h-[156px] overflow-hidden ${className}`}>
      <div className={`absolute inset-x-5 top-0 h-[3px] rounded-b-full ${palette.line}`} />
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${palette.icon}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            pos ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="break-words text-xl font-black leading-tight tracking-tight text-brand-navyDark sm:text-2xl" title={String(value)}>{value}</p>
        {sub && <p className="mt-1.5 text-[11px] font-semibold text-slate-500">{sub}</p>}
      </div>
    </Card>
  );
}
