type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; helperText?: string };

export function Input({ label, error, helperText, className = "", ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-semibold text-slate-700">
          {label}
        </span>
      )}
      <input
        {...props}
        className={[
          "block w-full rounded-input px-3.5 py-2.5 text-sm",
          "bg-surface-card text-slate-800",
          "border border-surface-border",
          "outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy",
          "placeholder:text-slate-400",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
          "read-only:bg-slate-50 read-only:cursor-default",
          error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "",
          className,
        ].join(" ")}
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </label>
  );
}
