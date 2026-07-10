import React from "react";

export function TextArea({
  label,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-semibold text-slate-700">
          {label}
        </span>
      )}
      <textarea
        {...props}
        className={`w-full rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy placeholder:text-slate-400 ${error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : ""} ${props.className || ""}`}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </label>
  );
}
