import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { ScheduleStatus } from "../../types";

const STATUS_CONFIG: Record<
  ScheduleStatus,
  { label: string; color: string; bg: string; ring: string; icon: React.ElementType }
> = {
  Open: { label: "Open", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", icon: CheckCircle2 },
  Closed: { label: "Closed", color: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200", icon: X },
};

export function StatusBadge({ status }: { status: ScheduleStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Closed;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}
