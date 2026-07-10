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
}

export function StatCard({ label, value, sub, icon: Icon, trend, className = "" }: StatCardProps) {
  const pos = trend === undefined || trend >= 0;

  return (
    <Card hover className={`relative ${className}`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-brand-navy" />
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
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl sm:text-2xl font-black text-slate-800 leading-tight break-words" title={String(value)}>{value}</p>
        {sub && <p className="text-xs font-medium text-slate-400 mt-1">{sub}</p>}
      </div>
    </Card>
  );
}
