import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Check } from "lucide-react";

type Option = { label: string; value: string; sublabel?: string };

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  className = "",
  buttonClassName = "",
  disabled = false,
  onAddOption,
}: {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onAddOption?: (query: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.some((o) => o.label.toLowerCase() === q);
  }, [options, query]);

  useOnClickOutside(wrapRef, () => { setOpen(false); setQuery(""); });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) setHighlight(0);
  }, [open]);

  const keyNavigate = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      onChange(filtered[highlight].value);
      setOpen(false);
      setQuery("");
    }
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      {label && (
        <span className="block mb-1.5 text-sm font-semibold text-slate-700">{label}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded-input border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-left transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] ${buttonClassName}`}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-card border border-surface-border rounded-card shadow-lg overflow-hidden">
          <div className="p-2 border-b border-surface-border">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onKeyDown={keyNavigate}
                onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                placeholder="Cari…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-input outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                {query.trim() && !exactMatch && onAddOption ? (
                  <button
                    onClick={() => onAddOption(query.trim())}
                    className="inline-flex items-center gap-1.5 text-brand-navy font-semibold hover:underline"
                  >
                    <Plus size={14} /> Tambah "{query.trim()}"
                  </button>
                ) : (
                  "Tidak ada hasil"
                )}
              </div>
            )}

            {filtered.map((opt, i) => {
              const active = value === opt.value;
              const highlighted = i === highlight;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors min-h-[44px]
                    ${active ? "bg-brand-navy/5 text-brand-navy font-semibold" : "text-slate-700"}
                    ${highlighted ? "bg-slate-50" : ""}
                    hover:bg-slate-50`}
                >
                  {active && <Check size={14} className="shrink-0 text-brand-navy" />}
                  <div className={active ? "" : "ml-[22px]"}>
                    <span>{opt.label}</span>
                    {opt.sublabel && <span className="ml-2 text-[11px] text-slate-400">{opt.sublabel}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
