import { useEffect, useMemo, useRef, useState } from "react";
// ===================== SearchableSelect =====================
type Option = { label: string; value: string; sublabel?: string };

function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
) {
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

  const hasAddOption = !!onAddOption && (query.trim() === "" || !exactMatch);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    // sync highlight ketika filter berubah
    const totalCount = arr.length + (hasAddOption ? 1 : 0);
    if (highlight >= totalCount) setHighlight(0);
    return arr;
  }, [options, query, hasAddOption, highlight]); // eslint-disable-line

  useOnClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value],
  );

  function commitSelection(idx: number) {
    if (hasAddOption && idx === 0) {
      onAddOption(query.trim());
      setOpen(false);
      return;
    }
    if (!filtered.length) return;
    const filteredIdx = hasAddOption ? idx - 1 : idx;
    if (filteredIdx < 0 || filteredIdx >= filtered.length) return;
    const picked = filtered[filteredIdx];
    onChange(picked.value);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className="block mb-1 text-sm text-neutral-600">{label}</label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
          if (e.key === "Enter" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        title={disabled ? "Terkunci" : ""}
        className={`w-full px-3 py-2.5 rounded-xl border border-[#0a2342]/20 bg-white text-left text-sm transition
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
          ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
          flex items-center justify-between gap-2 ${buttonClassName}`}
      >
        <span
          className={`truncate ${selectedLabel ? "text-neutral-900" : "text-neutral-400"}`}
        >
          {selectedLabel || placeholder}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M5.5 7.5l4.5 4.5 4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-xl border border-[#0a2342]/20 bg-white shadow-lg">
          <div className="p-2 border-b border-neutral-200">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                const totalCount = filtered.length + (hasAddOption ? 1 : 0);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, totalCount - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSelection(highlight);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder="Cari pelanggan…"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {hasAddOption && (
              <li
                onMouseEnter={() => setHighlight(0)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitSelection(0)}
                className={`px-3 py-2.5 text-xs cursor-pointer font-bold text-orange-600 bg-orange-50/50 hover:bg-orange-55 border-b border-neutral-100 flex items-center gap-1.5 transition-all
                  ${highlight === 0 ? "bg-orange-100/70 text-orange-700" : ""}`}
              >
                <span>
                  {query.trim() === ""
                    ? "➕ Tambah pelanggan baru"
                    : `➕ Tambah "${query.trim().toUpperCase()}" sebagai pelanggan baru`}
                </span>
              </li>
            )}

            {filtered.length === 0 && (!onAddOption || query.trim() === "") && (
              <li className="px-3 py-2 text-sm text-neutral-500">
                Tidak ada hasil
              </li>
            )}

            {filtered.map((o, idx) => {
              const offsetIdx = hasAddOption ? idx + 1 : idx;
              const active = offsetIdx === highlight;
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  onMouseEnter={() => setHighlight(offsetIdx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelection(offsetIdx)}
                  className={`px-3 py-2 text-sm cursor-pointer flex flex-col items-start
                    ${active ? "bg-orange-50" : ""} ${selected ? "font-semibold text-[#0a2342]" : "text-neutral-800"}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span>{o.label}</span>
                    {selected && (
                      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden className="shrink-0 text-orange-600">
                        <path
                          d="M5 10.5l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  {o.sublabel && (
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight block font-normal">
                      {o.sublabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
// =================== end SearchableSelect ===================
