import React from "react";
import { FlagID, FlagJP, FlagSG, FlagMY } from "./Flags";

type CurrencyCode = "IDR" | "JPY" | "SGD" | "MYR";

interface PriceDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  showCurrency?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  secondary?: { amount: number; currency: CurrencyCode };
}

const formatters: Record<CurrencyCode, (n: number) => string> = {
  IDR: (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Math.round(n || 0)),
  JPY: (n) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(n || 0),
  SGD: (n) =>
    new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    }).format(n || 0),
  MYR: (n) =>
    new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0,
    }).format(n || 0),
};

const flagComponents: Record<CurrencyCode, React.FC<any>> = {
  IDR: FlagID,
  JPY: FlagJP,
  SGD: FlagSG,
  MYR: FlagMY,
};

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

const flagSizes: Record<string, "sm" | "md"> = {
  sm: "sm",
  md: "sm",
  lg: "md",
};

export function PriceDisplay({
  amount,
  currency = "IDR",
  showCurrency = false,
  className = "",
  size = "md",
  secondary,
}: PriceDisplayProps) {
  const Flag = flagComponents[currency] || FlagID;
  const formatted = formatters[currency]?.(amount) || `¥${amount.toLocaleString()}`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} font-bold text-slate-800 ${className}`}>
      {showCurrency && <Flag size={flagSizes[size]} />}
      <span>{formatted}</span>
      {secondary && (
        <span className="text-slate-400 font-medium text-[85%] ml-1">
          {formatters[secondary.currency]?.(secondary.amount) || ""}
        </span>
      )}
    </span>
  );
}
