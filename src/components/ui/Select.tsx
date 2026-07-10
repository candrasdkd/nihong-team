import React from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string };

export function Select({ label, error, children, className = "", ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-semibold text-slate-700">
          {label}
        </span>
      )}

      <div className="relative">
        <select
          {...props}
          className={[
            "block w-full rounded-input pl-3.5 pr-10 py-2.5 text-sm",
            "border border-surface-border",
            "bg-surface-card text-slate-800",
            "appearance-none [-webkit-appearance:none] [-moz-appearance:none] shadow-none bg-clip-padding",
            "outline-none focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "",
            "transition",
            className,
          ].join(" ")}
          style={
            {
              WebkitAppearance: "none",
              backgroundImage: "none",
              WebkitTapHighlightColor: "transparent",
              colorScheme: "light dark",
            } as React.CSSProperties
          }
        >
          {children}
        </select>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </label>
  );
}
