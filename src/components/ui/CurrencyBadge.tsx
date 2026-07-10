import React from "react";
import { FlagID, FlagJP, FlagSG, FlagMY } from "./Flags";

type CurrencyCode = "IDR" | "JPY" | "SGD" | "MYR";

interface CurrencyBadgeProps {
  currency: CurrencyCode;
  className?: string;
  size?: "sm" | "md";
}

const flagComponents: Record<CurrencyCode, React.FC<any>> = {
  IDR: FlagID,
  JPY: FlagJP,
  SGD: FlagSG,
  MYR: FlagMY,
};

const labels: Record<CurrencyCode, string> = {
  IDR: "IDR",
  JPY: "JPY",
  SGD: "SGD",
  MYR: "MYR",
};

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-1 gap-1.5",
};

export function CurrencyBadge({ currency, className = "", size = "sm" }: CurrencyBadgeProps) {
  const Flag = flagComponents[currency] || FlagID;

  return (
    <span
      className={`inline-flex items-center rounded-md border border-surface-border bg-slate-50 font-semibold text-slate-600 ${sizeClasses[size]} ${className}`}
    >
      <Flag size={size === "sm" ? "sm" : "sm"} />
      <span>{labels[currency]}</span>
    </span>
  );
}
