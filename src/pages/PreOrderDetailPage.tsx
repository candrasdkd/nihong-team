import React, { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Trash2,
  Weight,
  X,
  ChevronRight,
  Link2,
  Check,
  RotateCw,
  AlertCircle,
  Printer,
} from "lucide-react";
import { DepartureSchedule, PreOrder, Customer, PreOrderItem } from "../types";
import { PreOrderFormModal } from "../components/PreOrder/PreOrderFormModal";
import { ConvertPreOrderModal } from "../components/PreOrder/ConvertPreOrderModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { usePreOrderDetail, EditingCell } from "../hooks/usePreOrderDetail";
import { updatePreOrder } from "../services/preOrdersFirebase";
import {
  getIndonesiaDeliveryAddress,
  getJapanDeliveryAddress,
  inferDeliveryCountry,
  printDeliveryAddressBatch,
} from "../utils/deliveryAddress";
import { buildPublicUrl } from "../utils/publicUrl";
import {
  createDeliveryAddressLink,
  createDeliveryAddressToken,
} from "../services/deliveryAddressFirebase";
import { normalizeWhatsAppPhone } from "../utils/whatsapp";

type BookingColumnKey =
  | "number"
  | "selection"
  | "customer"
  | "weight"
  | "items"
  | "pic"
  | "notes"
  | "status"
  | "actions";

type BookingColumn = {
  key: BookingColumnKey;
  label: string;
  defaultWidth: number;
  minWidth: number;
  rotatedWidth: string;
  align?: "left" | "center" | "right";
};

const BOOKING_COLUMN_WIDTHS_STORAGE_KEY = "nihong:booking-detail:column-widths";
const BOOKING_COLUMN_WIDTHS_VERSION_KEY = "nihong:booking-detail:column-widths-version";
const BOOKING_COLUMN_WIDTHS_VERSION = 3;

const BOOKING_COLUMNS: readonly BookingColumn[] = [
  { key: "number", label: "#", defaultWidth: 36, minWidth: 32, rotatedWidth: "4%", align: "center" },
  { key: "selection", label: "✓", defaultWidth: 40, minWidth: 36, rotatedWidth: "6%", align: "center" },
  { key: "customer", label: "Pelanggan", defaultWidth: 160, minWidth: 110, rotatedWidth: "20%" },
  { key: "weight", label: "Berat", defaultWidth: 112, minWidth: 80, rotatedWidth: "11%" },
  { key: "items", label: "Barang", defaultWidth: 150, minWidth: 100, rotatedWidth: "12%" },
  { key: "pic", label: "PIC", defaultWidth: 112, minWidth: 80, rotatedWidth: "10%" },
  { key: "notes", label: "Catatan", defaultWidth: 160, minWidth: 100, rotatedWidth: "17%" },
  { key: "status", label: "Status", defaultWidth: 96, minWidth: 80, rotatedWidth: "10%", align: "center" },
  { key: "actions", label: "Aksi", defaultWidth: 154, minWidth: 120, rotatedWidth: "10%", align: "right" },
];

type BookingColumnWidths = Record<BookingColumnKey, number>;

function getDefaultBookingColumnWidths(): BookingColumnWidths {
  return BOOKING_COLUMNS.reduce((widths, column) => {
    widths[column.key] = column.defaultWidth;
    return widths;
  }, {} as BookingColumnWidths);
}

function loadBookingColumnWidths(): BookingColumnWidths {
  const widths = getDefaultBookingColumnWidths();
  if (typeof window === "undefined") return widths;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(BOOKING_COLUMN_WIDTHS_STORAGE_KEY) || "{}",
    ) as Partial<BookingColumnWidths>;

    BOOKING_COLUMNS.forEach((column) => {
      const savedWidth = Number(saved[column.key]);
      if (Number.isFinite(savedWidth)) {
        widths[column.key] = Math.max(column.minWidth, savedWidth);
      }
    });

    const savedVersion = Number(
      window.localStorage.getItem(BOOKING_COLUMN_WIDTHS_VERSION_KEY) || 0,
    );
    if (savedVersion < BOOKING_COLUMN_WIDTHS_VERSION) {
      // Sinkronkan lebar kolom aksi saat jumlah tombol berubah.
      widths.actions = BOOKING_COLUMNS.find((column) => column.key === "actions")!.defaultWidth;
      window.localStorage.setItem(
        BOOKING_COLUMN_WIDTHS_VERSION_KEY,
        String(BOOKING_COLUMN_WIDTHS_VERSION),
      );
    }
  } catch {
    // Gunakan ukuran bawaan jika preferensi yang tersimpan tidak valid.
  }

  return widths;
}

function useBookingColumnWidths() {
  const [columnWidths, setColumnWidths] = useState<BookingColumnWidths>(
    loadBookingColumnWidths,
  );
  const activeResizeCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        BOOKING_COLUMN_WIDTHS_STORAGE_KEY,
        JSON.stringify(columnWidths),
      );
    } catch {
      // Tabel tetap dapat dipakai jika penyimpanan browser tidak tersedia.
    }
  }, [columnWidths]);

  useEffect(() => () => activeResizeCleanup.current?.(), []);

  const startResizing = useCallback(
    (column: BookingColumn, event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      activeResizeCleanup.current?.();

      const startX = event.clientX;
      const startWidth = columnWidths[column.key];
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const nextWidth = Math.max(
          column.minWidth,
          Math.round(startWidth + pointerEvent.clientX - startX),
        );
        setColumnWidths((current) =>
          current[column.key] === nextWidth
            ? current
            : { ...current, [column.key]: nextWidth },
        );
      };

      const stopResizing = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopResizing);
        window.removeEventListener("pointercancel", stopResizing);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        activeResizeCleanup.current = null;
      };

      activeResizeCleanup.current = stopResizing;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopResizing);
      window.addEventListener("pointercancel", stopResizing);
    },
    [columnWidths],
  );

  const resetColumnWidth = useCallback((column: BookingColumn) => {
    setColumnWidths((current) => ({
      ...current,
      [column.key]: column.defaultWidth,
    }));
  }, []);

  const resetAllColumnWidths = useCallback(() => {
    setColumnWidths(getDefaultBookingColumnWidths());
  }, []);

  const tableWidth = useMemo(
    () => BOOKING_COLUMNS.reduce((total, column) => total + columnWidths[column.key], 0),
    [columnWidths],
  );

  return {
    columnWidths,
    tableWidth,
    startResizing,
    resetColumnWidth,
    resetAllColumnWidths,
  };
}

function BookingTableColGroup({
  widths,
  isRotated,
}: {
  widths: BookingColumnWidths;
  isRotated: boolean;
}) {
  return (
    <colgroup>
      {BOOKING_COLUMNS.map((column) => (
        <col
          key={column.key}
          style={{ width: isRotated ? column.rotatedWidth : widths[column.key] }}
        />
      ))}
    </colgroup>
  );
}

function ResizableBookingTableHeader({
  isRotated,
  onResizeStart,
  onResetWidth,
}: {
  isRotated: boolean;
  onResizeStart: (column: BookingColumn, event: React.PointerEvent<HTMLDivElement>) => void;
  onResetWidth: (column: BookingColumn) => void;
}) {
  return (
    <thead className="isolate border-b border-slate-300 bg-white">
      <tr
        className="bg-white text-slate-500 font-bold uppercase tracking-wider select-none"
        style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
      >
        {BOOKING_COLUMNS.map((column) => (
          <th
            key={column.key}
            className={`sticky top-0 z-30 px-2 py-2 shadow-[0_1px_0_#cbd5e1] ${
              column.key === "number" ? "bg-slate-100" : "bg-white"
            } ${column.key === "actions" ? "" : "border-r border-slate-200"} ${
              column.align === "center"
                ? "text-center"
                : column.align === "right"
                  ? "text-right"
                  : "text-left"
            }`}
          >
            {column.label}
            {!isRotated && (
              <div
                role="separator"
                aria-label={`Ubah lebar kolom ${column.label}`}
                aria-orientation="vertical"
                onPointerDown={(event) => onResizeStart(column, event)}
                onDoubleClick={() => onResetWidth(column)}
                className="group absolute -right-1 top-0 bottom-0 z-30 flex w-3 cursor-col-resize touch-none items-center justify-center"
                title="Tarik untuk mengubah lebar · klik dua kali untuk reset"
              >
                <span className="h-full w-px bg-slate-200 transition-all group-hover:w-0.5 group-hover:bg-rose-500" />
              </div>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Inline Editable Cell ────────────────────────────────────────────────────

function EditableCell({
  value,
  poId,
  field,
  type = "text",
  editingCell,
  onStartEdit,
  onSave,
  className = "",
  style,
  isRotated = false,
}: {
  value: string | number;
  poId: string;
  field: EditingCell["field"];
  type?: "text" | "number";
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onSave: (poId: string, field: EditingCell["field"], value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  isRotated?: boolean;
}) {
  const isEditing = editingCell?.poId === poId && editingCell?.field === field;
  const [localVal, setLocalVal] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setLocalVal(String(value ?? ""));
      setTimeout(() => inputRef.current?.select(), 10);
    }
  }, [isEditing, value]);

  const commit = useCallback(() => {
    onSave(poId, field, localVal);
  }, [poId, field, localVal, onSave]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onSave(poId, field, String(value));
        }}
        style={style}
        className="w-full min-w-0 px-1.5 py-0.5 border-2 border-rose-400 rounded outline-none font-semibold text-slate-800 bg-rose-50/50 focus:bg-white transition-all"
        step={type === "number" ? "0.1" : undefined}
      />
    );
  }

  return (
    <div
      onClick={() => onStartEdit({ poId, field })}
      style={style}
      className={`cursor-pointer group/cell flex items-center gap-1 min-h-[22px] rounded px-1 py-0.5 hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 transition-all ${className}`}
      title="Klik untuk edit"
    >
      <span className={`flex-1 ${isRotated ? "truncate" : "break-words whitespace-normal leading-tight"}`}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Virtual Keyboard ─────────────────────────────────────────────────────────

function VirtualKeyboard({
  inputEl,
  onClose,
}: {
  inputEl: HTMLInputElement | HTMLTextAreaElement;
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<"lowercase" | "uppercase" | "symbols">("lowercase");
  const [currentVal, setCurrentVal] = useState(inputEl.value);

  // Sync display with the real input value
  useEffect(() => {
    const handler = () => setCurrentVal(inputEl.value);
    inputEl.addEventListener("input", handler);
    return () => inputEl.removeEventListener("input", handler);
  }, [inputEl]);

  const isNumeric = inputEl.type === "number" || inputEl.inputMode === "decimal" || inputEl.inputMode === "numeric" || (inputEl as HTMLElement).dataset.keyboardType === "numeric";

  const applyValue = (newVal: string) => {
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    const setter = inputEl.tagName === "TEXTAREA" ? nativeTextAreaSetter : nativeInputSetter;
    if (setter) {
      setter.call(inputEl, newVal);
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      inputEl.value = newVal;
    }
  };

  const handleKeyPress = (actualChar: string, e: React.MouseEvent) => {
    e.preventDefault();
    const val = inputEl.value;

    if (actualChar === "BACKSPACE") {
      applyValue(val.slice(0, -1));
    } else if (actualChar === "SHIFT") {
      setLayout(prev => prev === "lowercase" ? "uppercase" : "lowercase");
    } else if (actualChar === "SYMBOLS") {
      setLayout("symbols");
    } else if (actualChar === "ALPHA") {
      setLayout("lowercase");
    } else if (actualChar === "DONE") {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      inputEl.dispatchEvent(enterEvent);

      // Check if focus shifted to a new element (e.g. new item row was focused)
      setTimeout(() => {
        const active = document.activeElement;
        if (active && active !== inputEl && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          // Focus shifted, keep keyboard open for the new input
        } else {
          inputEl.blur();
          onClose();
        }
      }, 50);
    } else if (actualChar === "CLEAR") {
      applyValue("");
    } else {
      // actualChar is the real character to insert (space, letter, number, symbol)
      const newVal = val + actualChar;
      applyValue(newVal);
      if (layout === "uppercase") setLayout("lowercase");
    }
  };

  const fieldLabel = inputEl.placeholder || inputEl.getAttribute("aria-label") || "Input";

  const renderDisplay = () => (
    <div className="px-3 pb-2">
      <p className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 px-0.5">{fieldLabel}</p>
      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 min-h-[36px]">
        <div className="flex-1 min-w-0">
          {currentVal ? (
            <span className="text-white text-sm font-semibold leading-snug break-all">
              {currentVal}
              <span className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 animate-pulse rounded-full align-middle" />
            </span>
          ) : (
            <span className="text-slate-500 text-xs font-semibold italic">
              {fieldLabel}...
              <span className="inline-block w-0.5 h-3.5 bg-slate-600 ml-0.5 animate-pulse rounded-full align-middle" />
            </span>
          )}
        </div>
        {currentVal && (
          <button
            onMouseDown={(e) => handleKeyPress("CLEAR", e)}
            className="shrink-0 w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={10} className="text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );

  const renderNumeric = () => (
    <div className="grid grid-cols-3 gap-1.5 max-w-sm mx-auto">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
        <button
          key={key}
          onMouseDown={(e) => handleKeyPress(key, e)}
          className="h-9 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-base rounded-lg shadow border border-white/5 transition-all flex items-center justify-center"
        >
          {key}
        </button>
      ))}
      <button
        onMouseDown={(e) => handleKeyPress("BACKSPACE", e)}
        className="h-9 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 font-extrabold text-sm rounded-lg shadow border border-white/5 transition-all flex items-center justify-center"
      >
        ⌫
      </button>
      <button
        onMouseDown={(e) => handleKeyPress("DONE", e)}
        className="col-span-3 h-9 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg shadow transition-all active:scale-95 flex items-center justify-center"
      >
        Selesai ✓
      </button>
    </div>
  );

  const renderQwerty = () => {
    // Each row: [displayLabel, actualChar]
    const rows: [string, string][][] = layout === "symbols"
      ? [
        [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["0", "0"]],
        [["-", "-"], ["/", "/"], [":", ";"], [";", ";"], ["(", "("], [")", ")"], ["$", "$"], ["&", "&"], ["@", "@"], ['"', '"']],
        [["abc", "ALPHA"], [".", "."], [",", ","], ["?", "?"], ["!", "!"], ["'", "'"], ["⌫", "BACKSPACE"]],
        [["⎵ Spasi", " "], ["Selesai ✓", "DONE"]],
      ]
      : [
        [["q", "q"], ["w", "w"], ["e", "e"], ["r", "r"], ["t", "t"], ["y", "y"], ["u", "u"], ["i", "i"], ["o", "o"], ["p", "p"]],
        [["a", "a"], ["s", "s"], ["d", "d"], ["f", "f"], ["g", "g"], ["h", "h"], ["j", "j"], ["k", "k"], ["l", "l"]],
        [["⇧", "SHIFT"], ["z", "z"], ["x", "x"], ["c", "c"], ["v", "v"], ["b", "b"], ["n", "n"], ["m", "m"], ["⌫", "BACKSPACE"]],
        [["123", "SYMBOLS"], ["⎵ Spasi", " "], ["Selesai ✓", "DONE"]],
      ];

    return (
      <div className="flex flex-col gap-1 max-w-xl mx-auto">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1 w-full">
            {row.map(([displayLabel, actualChar]) => {
              let widthClass = "flex-1";
              let bgClass = "bg-slate-800 hover:bg-slate-700 text-white";
              let finalLabel = displayLabel;

              if (actualChar === "SHIFT") {
                widthClass = "w-11 shrink-0";
                bgClass = layout === "uppercase" ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-slate-700 text-slate-300";
              } else if (actualChar === "BACKSPACE") {
                widthClass = "w-11 shrink-0";
                bgClass = "bg-slate-700 text-slate-300";
              } else if (actualChar === "SYMBOLS" || actualChar === "ALPHA") {
                widthClass = "w-14 shrink-0";
                bgClass = "bg-slate-900 text-slate-400 text-[10px]";
              } else if (actualChar === " ") {
                widthClass = "flex-[3]";
              } else if (actualChar === "DONE") {
                widthClass = "w-20 shrink-0";
                bgClass = "bg-rose-600 hover:bg-rose-500 text-white text-[10px]";
              } else {
                // Regular letter: respect uppercase layout
                finalLabel = layout === "uppercase" ? displayLabel.toUpperCase() : displayLabel;
              }

              return (
                <button
                  key={actualChar + displayLabel}
                  onMouseDown={(e) => handleKeyPress(actualChar === "SHIFT" && layout === "uppercase" ? "SHIFT" : actualChar, e)}
                  className={`h-8 rounded-lg font-bold text-xs shadow transition-all active:scale-90 flex items-center justify-center border border-white/5 ${widthClass} ${bgClass}`}
                >
                  {finalLabel}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div data-vkeyboard="true" className="fixed inset-0 z-[99999] flex flex-col justify-end select-none">
      {/* Subtle backdrop blur overlay for the area above the keyboard */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          inputEl.blur();
          onClose();
        }}
        className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1.5px]"
      />
      {/* Keyboard panel container */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative bg-slate-950/95 border-t border-white/10 pt-2 pb-3 shadow-2xl z-10"
      >
        {renderDisplay()}
        <div className="px-3">
          {isNumeric ? renderNumeric() : renderQwerty()}
        </div>
      </div>
    </div>
  );
}

// ─── Customer Picker Modal (Spacious rotated picker for landscape mode) ───────

function CustomerPickerModal({
  po,
  customers,
  onSelect,
  onClose,
}: {
  po: PreOrder;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        (c.telpon || "").toLowerCase().includes(q)
    );
  }, [customers, query]);
  const handleBackdropClick = (e: React.MouseEvent) => {
    const activeEl = document.activeElement;
    const isInputActive = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    if (isInputActive) {
      if (activeEl instanceof HTMLElement) {
        activeEl.blur();
      }
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 select-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleBackdropClick} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[48vh] flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs">Pilih Pelanggan</h4>
            <p className="text-[9px] text-slate-400 font-semibold">Cari dan pilih untuk booking ini</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau nomor telepon..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-rose-400 outline-none text-xs font-semibold text-slate-800 focus:bg-white"
            inputMode="none"
          />
        </div>

        {/* Grid customer list (2 columns to fit horizontal viewport) */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start pb-20">
          {filtered.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400 font-semibold">
              Tidak ditemukan
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === po.idPelanggan;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  className={`text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-all hover:bg-rose-50/50 hover:border-rose-100 ${isActive ? "border-rose-300 bg-rose-50/30" : "border-slate-100 bg-slate-50/30"
                    }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${isActive ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {c.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-extrabold leading-tight truncate ${isActive ? "text-rose-600" : "text-slate-800"}`}>{c.nama}</p>
                    {c.telpon && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{c.telpon}</p>}
                  </div>
                  {isActive && <Check size={11} className="text-rose-500 shrink-0 ml-auto" strokeWidth={3} />}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Customer Dropdown Cell ────────────────────────────────────────────────────

function CustomerDropdownCell({
  po,
  customers,
  onSelect,
  style,
  isRotated = false,
}: {
  po: PreOrder;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  style?: React.CSSProperties;
  isRotated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Hitung posisi fixed saat buka
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropH = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4;
      setCoords({ top, left: rect.left, width: Math.max(rect.width, 240) });
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        (c.telpon || "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  const handlePick = (c: Customer) => {
    setOpen(false);
    onSelect(c);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {!open ? (
          <div
            onClick={() => setOpen(true)}
            style={style}
            className="cursor-pointer group/cell flex items-center gap-1 min-h-[22px] rounded px-1 py-0.5 hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 transition-all"
            title="Klik untuk ganti pelanggan"
          >
            <span className={isRotated ? "flex-1 truncate font-extrabold text-slate-800" : "flex-1 font-extrabold text-slate-800 break-words whitespace-normal leading-tight block"}>
              {po.namaPelanggan || "—"}
            </span>
          </div>
        ) : (
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              placeholder="Cari pelanggan..."
              style={style}
              className="w-full min-w-0 px-1.5 py-0.5 border-2 border-rose-400 rounded outline-none font-semibold text-slate-800 bg-rose-50/50 focus:bg-white transition-all"
            />

            {/* Local absolute overlay when layout is rotated (cell isRotated is false) */}
            {!isRotated && (
              <div
                ref={dropRef}
                className="absolute left-0 top-full mt-1 w-60 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 z-[99]"
              >
                <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between bg-white">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pilih Pelanggan</span>
                  <span className="text-[9px] font-bold text-rose-500">{filtered.length} hasil</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-2 text-[10px] text-slate-400 font-semibold text-center">Tidak ditemukan</div>
                ) : (
                  filtered.map((c) => {
                    const isActive = c.id === po.idPelanggan;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handlePick(c); }}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-50 transition-colors ${isActive ? "bg-rose-50/60" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 ${isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {c.nama.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-extrabold leading-tight truncate ${isActive ? "text-rose-600" : "text-slate-800"}`}>{c.nama}</p>
                          {c.telpon && <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{c.telpon}</p>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed portal overlay when layout is vertical (cell isRotated is true) */}
      {isRotated && open && coords && (
        <div
          ref={dropRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
          className="max-h-72 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-1"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Pelanggan</span>
            <span className="text-[10px] font-bold text-rose-500">{filtered.length} hasil</span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 font-semibold text-center">Tidak ditemukan</div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === po.idPelanggan;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handlePick(c); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-rose-50 transition-colors ${isActive ? "bg-rose-50/60" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {c.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-extrabold leading-tight truncate ${isActive ? "text-rose-600" : "text-slate-800"}`}>{c.nama}</p>
                    {c.telpon && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{c.telpon}</p>}
                  </div>
                  {isActive && <Check size={11} className="text-rose-500 ml-auto shrink-0" strokeWidth={3} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ─── Items Edit Modal ──────────────────────────────────────────────────────

function ItemsEditModal({
  po,
  onClose,
  onToggleCheck,
  onSaveItems,
  isRotated = false,
}: {
  po: PreOrder;
  onClose: () => void;
  onToggleCheck: (po: PreOrder, idx: number) => void;
  onSaveItems: (poId: string, items: PreOrderItem[]) => Promise<void>;
  isRotated?: boolean;
}) {
  const [localItems, setLocalItems] = useState<PreOrderItem[]>(() =>
    po.items.map((i) => ({ ...i }))
  );
  const [saving, setSaving] = useState(false);
  const isReadOnly = po.status === "Selesai";

  const addItem = () => {
    setLocalItems((prev) => [...prev, { namaBarang: "", checked: false }]);
  };

  const removeItem = (idx: number) => {
    setLocalItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateName = (idx: number, val: string) => {
    setLocalItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, namaBarang: val } : item))
    );
  };

  const toggleCheck = (idx: number) => {
    setLocalItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleSave = async () => {
    const cleaned = localItems.filter((i) => i.namaBarang.trim() !== "");
    setSaving(true);
    try {
      await onSaveItems(po.id, cleaned);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = localItems.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={isReadOnly ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`relative bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col transition-all overflow-hidden z-10 ${isRotated
            ? "max-w-2xl w-[95%] max-h-[48vh]"
            : "max-w-md w-full max-h-[90vh]"
          }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Daftar Titipan Barang</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              <span className="text-rose-600 font-bold">{po.namaPelanggan}</span>
              {" — "}{localItems.filter(i => i.checked).length}/{localItems.length} selesai
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Info row */}
        <div className="px-5 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px]">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">PIC / Jastiper</span>
              <span className="text-slate-800 font-extrabold">{po.namaJastiper || "—"}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Total Berat</span>
              <span className="text-rose-600 font-extrabold">{po.totalKg.toFixed(1)} Kg</span>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="px-5 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Checklist Barang
            </p>
            {!isReadOnly && (
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-extrabold border border-rose-100 transition-all active:scale-95"
              >
                <Plus size={11} strokeWidth={3} />
                Tambah Barang
              </button>
            )}
          </div>

          {localItems.length === 0 && (
            <div className="py-6 text-center text-[11px] text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-slate-100">
              Belum ada barang. Klik "+ Tambah Barang" untuk mulai.
            </div>
          )}

          <div className={isRotated ? "grid grid-cols-2 gap-x-4 gap-y-1 pb-16" : "space-y-1.5"}>
            {localItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 py-1 px-2 rounded-xl transition-colors ${isReadOnly ? "bg-slate-50/40" : "hover:bg-slate-50"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={!!item.checked}
                  onChange={() => toggleCheck(idx)}
                  disabled={isReadOnly}
                  className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 w-4 h-4 shrink-0 cursor-pointer"
                />
                {isReadOnly ? (
                  <span className={`text-xs font-semibold flex-1 ${item.checked ? "line-through text-slate-400" : "text-slate-700"
                    }`}>{item.namaBarang}</span>
                ) : (
                  <input
                    type="text"
                    value={item.namaBarang}
                    onChange={(e) => updateName(idx, e.target.value)}
                    placeholder="Nama barang..."
                    autoFocus={idx === localItems.length - 1 && item.namaBarang === ""}
                    className={`flex-1 text-xs font-semibold bg-transparent outline-none border-b border-transparent focus:border-rose-300 transition-colors py-0.5 ${item.checked ? "line-through text-slate-400" : "text-slate-700"
                      }`}
                  />
                )}
                {!isReadOnly && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-semibold">
            {checkedCount}/{localItems.length} selesai
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-extrabold text-xs transition-all active:scale-95"
            >
              Batal
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  schedule: DepartureSchedule;
  schedules: DepartureSchedule[];
  customers: Customer[];
  preOrders: PreOrder[];
  onBack: () => void;
  onOpenCreateForm: () => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editing: PreOrder | null;
  setEditing: (v: PreOrder | null) => void;
  convertTarget: PreOrder | null;
  setConvertTarget: (v: PreOrder | null) => void;
  handleSubmit: (data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
  /** Jika true, halaman diakses via share link (tanpa login) */
  isShareMode?: boolean;
  isRotated?: boolean;
  onToggleRotate?: (v: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PreOrderDetailPage({
  schedule,
  schedules,
  customers,
  preOrders: allPreOrders,
  onBack,
  onOpenCreateForm,
  showForm,
  setShowForm,
  editing,
  setEditing,
  convertTarget,
  setConvertTarget,
  handleSubmit,
  showToast,
  isShareMode = false,
  isRotated: propIsRotated,
  onToggleRotate,
}: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [deliveryLinkCopied, setDeliveryLinkCopied] = useState<string | null>(null);
  const [tableFontSize, setTableFontSize] = useState<number>(10);
  const [localIsRotated, setLocalIsRotated] = useState(false);
  const [focusedInput, setFocusedInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [customerPickPO, setCustomerPickPO] = useState<PreOrder | null>(null);
  const {
    columnWidths,
    tableWidth,
    startResizing,
    resetColumnWidth,
    resetAllColumnWidths,
  } = useBookingColumnWidths();

  const isRotated = propIsRotated !== undefined ? propIsRotated : localIsRotated;
  const setIsRotated = (v: boolean) => {
    if (onToggleRotate) {
      onToggleRotate(v);
    } else {
      setLocalIsRotated(v);
    }
  };

  // Close keyboard when clicking outside it (any area that's not the keyboard)
  useEffect(() => {
    if (!focusedInput || !isRotated) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // If clicked another input/textarea, do not close the keyboard (let focusin listener transfer focus)
      if (target && (target.nodeName === "INPUT" || target.nodeName === "TEXTAREA")) return;

      const kbEl = document.querySelector('[data-vkeyboard]');
      // If clicked inside keyboard, let keyboard handle it
      if (kbEl && kbEl.contains(target)) return;
      // Otherwise, close keyboard
      setFocusedInput(null);
      focusedInput.blur();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [focusedInput, isRotated]);

  // Global focus interception for Rotated Layout
  useEffect(() => {
    if (!isRotated) {
      setFocusedInput(null);
      return;
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        target.setAttribute("inputmode", "none");
        setFocusedInput(target);
      }
    };

    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      active.setAttribute("inputmode", "none");
      setFocusedInput(active);
    }

    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isRotated]);

  // Restore inputmode when returning to portrait mode
  useEffect(() => {
    if (!isRotated) {
      const inputs = document.querySelectorAll("input, textarea");
      inputs.forEach(el => el.removeAttribute("inputmode"));
    }
  }, [isRotated]);

  const handleShareLink = () => {
    const shareUrl = buildPublicUrl(
      window.location.origin,
      `/?share=${encodeURIComponent(schedule.id)}`,
      import.meta.env.VITE_PUBLIC_APP_URL,
    );
    // Fallback untuk non-HTTPS (dev via IP, dll)
    const doCopy = () => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(shareUrl);
      }
      // Fallback: execCommand
      const el = document.createElement("textarea");
      el.value = shareUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return Promise.resolve();
    };
    doCopy()
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      })
      .catch(() => {
        // Kalau semua gagal, buka prompt manual
        prompt("Salin link berikut:", shareUrl);
      });
  };

  async function handleDeliveryAddressShare(po: PreOrder) {
    if (!po.idPelanggan) {
      showToast?.("Booking belum terhubung ke customer.", "warning");
      return;
    }

    const customerPhone = customers.find((c) => c.id === po.idPelanggan)?.telpon
      || po.noTelponPelanggan
      || "";
    const whatsappPhone = normalizeWhatsAppPhone(customerPhone);
    if (!whatsappPhone) {
      showToast?.("No. WhatsApp customer belum diisi.", "warning");
      return;
    }

    const country = inferDeliveryCountry(po.rute);
    const destination = country === "japan" ? "Jepang" : "Indonesia";
    const shareToken = createDeliveryAddressToken();
    const shareUrl = buildPublicUrl(
      window.location.origin,
      `/?delivery=${encodeURIComponent(shareToken)}`,
      import.meta.env.VITE_PUBLIC_APP_URL,
    );

    const customer = customers.find((c) => c.id === po.idPelanggan);
    const hasExistingAddress = country === "japan"
      ? !!customer?.alamatPengirimanJepang?.namaPenerima
      : !!customer?.alamatPengirimanIndonesia?.namaPenerima;

    const whatsappMessage = hasExistingAddress
      ? `Halo ${po.namaPelanggan} \u{1F44B}\n\nKami ingin memastikan data alamat pengiriman domestik di ${destination} kamu sudah benar.\n\nSilakan cek melalui link berikut, dan update jika ada yang perlu diperbaiki:\n\n${shareUrl}\n\nTerima kasih! \u{1F64F}`
      : `Halo ${po.namaPelanggan} \u{1F44B}\n\nSilakan lengkapi alamat penerima untuk pengiriman domestik di ${destination} melalui link berikut:\n\n${shareUrl}\n\nLink ini hanya dapat digunakan satu kali. Terima kasih! \u{1F64F}`;
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    // Popup dan clipboard harus dimulai langsung dari klik agar tidak diblokir browser.
    const whatsappWindow = window.open("about:blank", "_blank");
    const clipboardResultPromise = (() => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(shareUrl).then(() => true, () => false);
        }

        const element = document.createElement("textarea");
        element.value = shareUrl;
        element.style.position = "fixed";
        element.style.opacity = "0";
        document.body.appendChild(element);
        element.focus();
        element.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(element);
        return Promise.resolve(copied);
      } catch {
        return Promise.resolve(false);
      }
    })();

    const createLinkPromise = createDeliveryAddressLink(po, country, shareToken);
    try {
      await createLinkPromise;
      const copied = await clipboardResultPromise;

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.replace(whatsappUrl);
        whatsappWindow.opener = null;
      } else {
        window.location.assign(whatsappUrl);
      }

      setDeliveryLinkCopied(po.id);
      window.setTimeout(() => setDeliveryLinkCopied(null), 2500);
      showToast?.(
        copied ? "Link disalin dan WhatsApp dibuka." : "WhatsApp dibuka. Clipboard tidak tersedia.",
        copied ? "success" : "warning",
      );
    } catch (error: any) {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      showToast?.(error?.message || "Gagal membuat link form alamat.", "error");
    }
  }

  function handleDeliveryAddressBatchPrint() {
    if (!pos.length) {
      showToast?.("Belum ada booking pada batch ini untuk dicetak.", "warning");
      return;
    }

    const printItems = pos.map((po, index) => {
      const customer = customers.find((item) => item.id === po.idPelanggan) || {
        nama: po.namaPelanggan,
        telpon: po.noTelponPelanggan,
      };
      const country = inferDeliveryCountry(po.rute);
      return {
        country,
        address: country === "japan"
          ? getJapanDeliveryAddress(customer)
          : getIndonesiaDeliveryAddress(customer),
        bookingLabel: `#${index + 1} · ${po.namaPelanggan}`,
      };
    });

    const opened = printDeliveryAddressBatch(printItems, schedule.rute);
    if (!opened) showToast?.("Izinkan pop-up browser untuk membuka tampilan cetak.", "warning");
  }
  const {
    pos,
    loading,
    editingCell,
    setEditingCell,
    savingCell,
    selectedIds,
    setSelectedIds,
    confirmModal,
    setConfirmModal,
    viewItemsPO,
    setViewItemsPO,
    handleCellSave,
    handleCustomerChange,
    handleToggleItemCheck,
    handleDelete,
    shareWA,
    shareMultipleWA,
    shareAllWA,
    toggleSelect,
    totalBeratPOs,
  } = usePreOrderDetail(
    schedule,
    schedules,
    allPreOrders,
    setShowForm,
    setEditing,
    setConvertTarget,
    handleSubmit,
    showToast
  );

  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4 space-y-4">

        {/* ── Top Bar ── */}
        {!isRotated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {!isShareMode && (
                <>
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 font-bold text-xs transition-colors group shrink-0"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Kembali
                  </button>
                  <ChevronRight size={12} className="text-slate-300 shrink-0" />
                </>
              )}
              <span className="text-sm font-extrabold text-slate-800 truncate">{schedule.rute}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                schedule.id === "__unscheduled__"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : schedule.status === "Open"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}>
                {schedule.id === "__unscheduled__" ? "Belum Ada Jadwal" : schedule.status}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Share button — hanya tampil jika bukan share mode */}
              {!isShareMode && (
                <button
                  onClick={handleShareLink}
                  className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold transition-all active:scale-95"
                  title="Bagikan link halaman ini"
                >
                  <AnimatePresence mode="wait">
                    {linkCopied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <Check size={12} strokeWidth={3} />
                        <span className="hidden sm:inline">Tersalin!</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="share"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1"
                      >
                        <Link2 size={12} />
                        <span className="hidden sm:inline">Bagikan</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )}
              {/* Rotate Layout Button */}
              <button
                onClick={() => setIsRotated(!isRotated)}
                className={`sm:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-extrabold transition-all active:scale-95 ${isRotated
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                title="Putar Layar ke Horizontal"
              >
                <RotateCw size={12} className={isRotated ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
                <span>{isRotated ? "Vertikal" : "Putar Layar"}</span>
              </button>
              {/* Tombol Tambah — tersembunyi di share mode (muncul sebagai FAB di bawah) */}
              {!isShareMode && (
                <button
                  onClick={onOpenCreateForm}
                  className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus size={13} strokeWidth="3" />
                  <span className="hidden sm:inline">Tambah</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Content Area ── */}
        <div
          style={
            isRotated
              ? {
                position: "fixed",
                top: 0,
                left: "100%",
                width: "100vh",
                height: "100vw",
                transform: "rotate(90deg)",
                transformOrigin: "top left",
                zIndex: 9990,
                overflow: "auto",
                backgroundColor: "#f8fafc", // slate-50
                padding: "16px 16px 80px 16px",
              }
              : {}
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl h-12 border border-slate-100" />
                ))}
              </div>
            ) : pos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200/80 border-dashed">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3">
                  <Package size={24} className="text-rose-300" />
                </div>
                <p className="font-extrabold text-slate-600 text-sm mb-1">Belum Ada Booking</p>
                <p className="text-slate-400 text-xs mb-4">Tambahkan booking baru untuk jadwal ini.</p>
                <button
                  onClick={onOpenCreateForm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
                >
                  <Plus size={13} strokeWidth="3" />
                  Tambah Booking
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.id === "__unscheduled__" && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="leading-relaxed font-medium">
                        Daftar booking ini <strong>belum memiliki jadwal keberangkatan aktif</strong>. Klik ikon <strong>Pensil (Edit)</strong> pada baris pesanan untuk memasukkannya ke jadwal tujuan.
                      </span>
                    </div>
                  </div>
                )}

                <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm ${isRotated ? "" : "overflow-hidden"}`}>
                  {/* Sub-header with font size selector and stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spreadsheet</span>
                        <span className="text-[10px] text-slate-400">
                          — Klik cell untuk edit langsung
                          {!isRotated && <span className="hidden sm:inline"> · tarik batas header untuk atur kolom</span>}
                        </span>
                      </div>
                    </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] font-bold text-slate-500">
                    <button
                      type="button"
                      onClick={shareAllWA}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 transition-colors hover:bg-emerald-100"
                      title={`Bagikan seluruh ${pos.length} booking ke WhatsApp`}
                    >
                      <MessageCircle size={10} />
                      <span className="hidden sm:inline">Share Semua WA</span>
                      <span className="sm:hidden">Semua WA</span>
                    </button>
                    {!isRotated && (
                      <button
                        type="button"
                        onClick={resetAllColumnWidths}
                        className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                        title="Kembalikan semua lebar kolom"
                      >
                        Reset Kolom
                      </button>
                    )}
                    <span className="flex items-center gap-1">
                      <Weight size={10} />
                      Total: {totalBeratPOs.toFixed(1)} Kg
                    </span>
                    {schedule.id !== "__unscheduled__" && (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-extrabold ${
                        (schedule.slotBeratKg - schedule.beratTerpakai) <= 0
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : (schedule.slotBeratKg - schedule.beratTerpakai) <= 5
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}>
                        Sisa {Math.max(0, schedule.slotBeratKg - schedule.beratTerpakai).toFixed(1)} Kg
                      </span>
                    )}
                    <span>{pos.length} baris</span>
                  </div>
                </div>

                {/* Scrollable table */}
                <div className={isRotated ? "w-full" : "overflow-x-auto w-full"}>
                  <table
                    style={{
                      "--table-fs": `${tableFontSize}px`,
                      fontSize: "var(--table-fs)",
                      width: isRotated ? "100%" : `${tableWidth}px`,
                      minWidth: isRotated ? 0 : "100%",
                    } as React.CSSProperties}
                    className="table-fixed border-collapse text-left"
                  >
                    <BookingTableColGroup
                      widths={columnWidths}
                      isRotated={isRotated}
                    />
                    <ResizableBookingTableHeader
                      isRotated={isRotated}
                      onResizeStart={startResizing}
                      onResetWidth={resetColumnWidth}
                    />

                    <tbody className="divide-y divide-slate-100">
                      {pos.map((po, poIdx) => {
                        const isSelesai = po.status === "Selesai";
                        const checkedCount = po.items.filter((i) => i.checked).length;
                        const totalItems = po.items.length;
                        const isKomplit = totalItems > 0 && checkedCount === totalItems;
                        const isSaving = savingCell?.startsWith(po.id);

                        return (
                          <tr
                            key={po.id}
                            className={`group transition-colors duration-100 ${selectedIds.includes(po.id)
                              ? "bg-rose-50/50"
                              : isKomplit || isSelesai
                                ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                                : "hover:bg-slate-50/60"
                              } ${isSaving ? "opacity-70" : ""}`}
                          >
                            {/* # */}
                            <td
                              style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                              className={`border-r border-slate-100 ${isRotated ? "px-1 py-1.5" : "px-2 py-2"} text-center font-mono select-none overflow-hidden ${
                                isKomplit || isSelesai
                                  ? "bg-emerald-100/40 text-emerald-700 font-bold"
                                  : "bg-slate-50/80 text-slate-400"
                              }`}
                            >
                              {poIdx + 1}
                            </td>

                            {/* Checkbox */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1.5" : "px-2 py-2"} text-center overflow-hidden`}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(po.id)}
                                onChange={() => toggleSelect(po.id)}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>

                            {/* Pelanggan */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} align-middle overflow-hidden`}>
                              {isRotated ? (
                                <div
                                  onClick={() => !isSelesai && setCustomerPickPO(po)}
                                  className="cursor-pointer font-extrabold text-slate-800 break-words whitespace-normal leading-tight block min-h-[22px] hover:bg-rose-50 hover:ring-1 hover:ring-rose-200 rounded px-1 py-0.5 transition-all w-full"
                                  title={isSelesai ? undefined : "Klik untuk ganti pelanggan"}
                                >
                                  {po.namaPelanggan || "—"}
                                </div>
                              ) : (
                                isSelesai ? (
                                  <span
                                    style={{ fontSize: "var(--table-fs)" }}
                                    className="font-extrabold text-slate-800 truncate block"
                                  >
                                    {po.namaPelanggan || "—"}
                                  </span>
                                ) : (
                                  <CustomerDropdownCell
                                    po={po}
                                    customers={customers}
                                    onSelect={(c) => handleCustomerChange(po.id, c)}
                                    style={{ fontSize: "var(--table-fs)" }}
                                    isRotated={!isRotated}
                                  />
                                )
                              )}
                            </td>

                            {/* Total Berat */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} align-middle overflow-hidden`}>
                              <div className="flex items-center gap-1">
                                {!isRotated && <Weight size={10} className="text-slate-400 shrink-0" />}
                                {isSelesai ? (
                                  <span
                                    style={{ fontSize: "var(--table-fs)" }}
                                    className={`font-bold text-slate-700 block ${isRotated ? "break-words whitespace-normal leading-tight" : "whitespace-nowrap"}`}
                                  >
                                    {po.totalKg.toFixed(1)} Kg
                                  </span>
                                ) : (
                                  <div className="flex-1">
                                    <EditableCell
                                      value={po.totalKg.toFixed(1)}
                                      poId={po.id}
                                      field="totalKg"
                                      type="number"
                                      editingCell={editingCell}
                                      onStartEdit={setEditingCell}
                                      onSave={handleCellSave}
                                      className={isRotated ? "font-bold text-slate-700 break-words whitespace-normal leading-tight" : "font-bold text-slate-700 whitespace-nowrap"}
                                      style={{ fontSize: "var(--table-fs)" }}
                                      isRotated={!isRotated}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Barang */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} align-middle overflow-hidden`}>
                              <button
                                onClick={() => setViewItemsPO(po)}
                                className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-extrabold transition-all active:scale-95 w-full justify-center whitespace-normal ${
                                  isKomplit
                                    ? "bg-emerald-100/70 text-emerald-800 border border-emerald-200 hover:bg-emerald-200/70"
                                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600"
                                }`}
                                style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                              >
                                {!isRotated && <Package size={10} className="shrink-0" />}
                                {totalItems > 0 ? (
                                  isRotated ? (
                                    `${checkedCount}/${totalItems} ✓`
                                  ) : (
                                    `${totalItems} Barang (${checkedCount} ✓)`
                                  )
                                ) : (
                                  isRotated ? "+" : "+ Tambah Barang"
                                )}
                              </button>
                            </td>

                            {/* PIC — editable bebas */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} align-middle overflow-hidden`}>
                              {isSelesai ? (
                                <span
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  className={`font-bold text-slate-500 block ${isRotated ? "break-words whitespace-normal leading-tight" : "truncate"}`}
                                >
                                  {po.pic || "—"}
                                </span>
                              ) : (
                                <EditableCell
                                  value={po.pic || ""}
                                  poId={po.id}
                                  field="pic"
                                  editingCell={editingCell}
                                  onStartEdit={setEditingCell}
                                  onSave={handleCellSave}
                                  className={isRotated ? "font-bold text-slate-600 break-words whitespace-normal leading-tight" : "font-bold text-slate-600 truncate"}
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  isRotated={!isRotated}
                                />
                              )}
                            </td>

                            {/* Catatan */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} align-middle overflow-hidden`}>
                              {isSelesai ? (
                                po.catatan ? (
                                  <span
                                    style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                    className={`italic block ${isRotated ? "text-slate-400 break-words whitespace-normal leading-tight" : "text-slate-400 line-clamp-1"}`}
                                  >
                                    📝 {po.catatan}
                                  </span>
                                ) : null
                              ) : (
                                <EditableCell
                                  value={po.catatan || ""}
                                  poId={po.id}
                                  field="catatan"
                                  editingCell={editingCell}
                                  onStartEdit={setEditingCell}
                                  onSave={handleCellSave}
                                  className={isRotated ? "text-slate-400 italic break-words whitespace-normal leading-tight" : "text-slate-400 italic line-clamp-1"}
                                  style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                                  isRotated={!isRotated}
                                />
                              )}
                            </td>

                            {/* Status */}
                            <td className={`border-r border-slate-100 ${isRotated ? "px-1 py-1" : "px-2 py-1.5"} text-center align-middle overflow-hidden`}>
                              <span
                                style={{ fontSize: "calc(var(--table-fs) - 1.5px)" }}
                                className={`font-bold px-1 py-0.5 rounded select-none ${isRotated ? "block break-words whitespace-normal leading-tight" : "inline-block"} ${isSelesai
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  }`}
                              >
                                {po.status}
                              </span>
                            </td>

                            {/* Aksi */}
                            <td className="px-1 py-1 text-right align-middle overflow-hidden">
                              {isSelesai ? (
                                <div className="flex items-center justify-end gap-0.5">
                                  {!isShareMode && (
                                    <button
                                      onClick={() => handleDeliveryAddressShare(po)}
                                      className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100`}
                                      title="Kirim link cek alamat ke customer"
                                    >
                                      {deliveryLinkCopied === po.id
                                        ? <Check size={isRotated ? 11 : 13} strokeWidth={3} />
                                        : <Link2 size={isRotated ? 11 : 13} />}
                                    </button>
                                  )}
                                  <span
                                    style={{ fontSize: "calc(var(--table-fs) - 1.5px)" }}
                                    className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded select-none whitespace-nowrap"
                                  >
                                    Sudah dipindahkan ✓
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-0.5 flex-wrap">
                                  {!isShareMode && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditing(po);
                                          setShowForm(true);
                                        }}
                                        className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200`}
                                        title="Edit & Ubah Jadwal"
                                      >
                                        <Pencil size={isRotated ? 11 : 13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeliveryAddressShare(po)}
                                        className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100`}
                                        title="Bagikan form alamat pengiriman ke customer"
                                      >
                                        {deliveryLinkCopied === po.id
                                          ? <Check size={isRotated ? 11 : 13} strokeWidth={3} />
                                          : <Link2 size={isRotated ? 11 : 13} />}
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => shareWA(po)}
                                    className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100`}
                                    title="Share WA"
                                  >
                                    <MessageCircle size={isRotated ? 11 : 13} />
                                  </button>

                                  <button
                                    onClick={() => handleDelete(po)}
                                    className={`${isRotated ? "p-1" : "p-1.5"} rounded-lg text-rose-500 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100`}
                                    title="Hapus"
                                  >
                                    <Trash2 size={11} />
                                  </button>

                                  {!isShareMode && (
                                    <button
                                      onClick={() => setConvertTarget(po)}
                                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold transition-all active:scale-95 shrink-0"
                                      title="Pindahkan ke Pesanan"
                                    >
                                      <ArrowRight size={9} strokeWidth={3} />
                                      Pindahkan
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer total row */}
                    <tfoot>
                      <tr
                        className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-600"
                        style={{ fontSize: "calc(var(--table-fs) - 1px)" }}
                      >
                        <td colSpan={3} className={`${isRotated ? "px-1 py-1.5" : "px-3 py-2"} text-right text-slate-500`}>Total</td>
                        <td className={`border-r border-slate-200 ${isRotated ? "px-1 py-1.5" : "px-3 py-2"} font-extrabold text-rose-600 whitespace-nowrap`}>
                          {totalBeratPOs.toFixed(1)} Kg
                        </td>
                        <td colSpan={5} className={`${isRotated ? "px-1 py-1.5" : "px-3 py-2"} text-slate-400`}>{pos.length} booking</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              </div>
            )}
          </motion.div>

          {/* ── Modals ── */}
          {showForm && (
            <PreOrderFormModal
              initial={editing}
              schedules={schedules}
              customers={customers}
              preOrders={allPreOrders}
              defaultScheduleId={schedule.id}
              onClose={() => { setShowForm(false); setEditing(null); setFocusedInput(null); }}
              onSubmit={handleSubmit}
              isRotated={isRotated}
            />
          )}

          {convertTarget && (
            <ConvertPreOrderModal
              preOrder={convertTarget}
              onClose={() => { setConvertTarget(null); setFocusedInput(null); }}
              onConverted={() => {
                setConvertTarget(null);
                setFocusedInput(null);
              }}
            />
          )}

          <AnimatePresence>
            {confirmModal.isOpen && (
              <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Hapus"
                type="danger"
                onClose={() => { setConfirmModal((p) => ({ ...p, isOpen: false })); setFocusedInput(null); }}
                onConfirm={confirmModal.onConfirm}
              />
            )}
          </AnimatePresence>

          {/* ── Items Edit Modal ── */}
          <AnimatePresence>
            {viewItemsPO && (
              <ItemsEditModal
                po={viewItemsPO}
                onClose={() => { setViewItemsPO(null); setFocusedInput(null); }}
                onToggleCheck={handleToggleItemCheck}
                onSaveItems={async (poId, items) => {
                  await updatePreOrder(poId, { items });
                  // Sync viewItemsPO state
                  setViewItemsPO((prev) => prev ? { ...prev, items } : prev);
                }}
                isRotated={isRotated}
              />
            )}
          </AnimatePresence>

          {/* ── Customer Picker Modal (rotated landscape mode) ── */}
          <AnimatePresence>
            {customerPickPO && (
              <CustomerPickerModal
                po={customerPickPO}
                customers={customers}
                onSelect={(c) => { handleCustomerChange(customerPickPO.id, c); setFocusedInput(null); }}
                onClose={() => { setCustomerPickPO(null); setFocusedInput(null); }}
              />
            )}
          </AnimatePresence>

          {/* ── Bulk Action Bar ── */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="fixed bottom-20 sm:bottom-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3 z-[90]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white leading-none">{selectedIds.length} Terpilih</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {pos.filter((p) => selectedIds.includes(p.id)).reduce((sum, p) => sum + p.totalKg, 0).toFixed(1)} Kg terpilih
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={shareMultipleWA}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <MessageCircle size={13} />
                    Bagikan WA
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Custom Virtual Keyboard (rotated inside content area) ── */}
          {focusedInput && (
            <VirtualKeyboard
              inputEl={focusedInput}
              onClose={() => setFocusedInput(null)}
            />
          )}
        </div>

        {/* Cetak seluruh alamat pada batch aktif. */}
        <AnimatePresence>
          {!isRotated && !isShareMode && pos.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 18 }}
              onClick={handleDeliveryAddressBatchPrint}
              className="group fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-6 z-[80] flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950 px-3 py-2.5 text-left text-white shadow-2xl shadow-slate-950/30 transition-all hover:-translate-y-0.5 hover:bg-slate-900 active:scale-95 sm:bottom-6"
              title="Cetak seluruh alamat batch ini dalam A4 dua kolom"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
                <Printer size={19} strokeWidth={2.3} />
              </span>
              <span className="hidden min-w-0 pr-1 sm:block">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-indigo-300">
                  Batch Saat Ini
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-xs font-extrabold">
                  Cetak {pos.length} Alamat · A4 2 Kolom
                </span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Kontrol mode putar berada di overlay tersendiri agar tidak ikut scroll tabel. */}
        {isRotated && (
          <div
            className="pointer-events-none fixed z-[10010]"
            style={{
              top: 0,
              left: "100%",
              width: "100vh",
              height: "100vw",
              transform: "rotate(90deg)",
              transformOrigin: "top left",
            }}
          >
            <button
              onClick={() => setIsRotated(false)}
              className="pointer-events-auto absolute bottom-6 left-6 flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/90 backdrop-blur text-white rounded-xl text-xs font-extrabold shadow-2xl transition-all active:scale-90"
            >
              <RotateCw size={12} className="animate-spin-slow" />
              Vertikal
            </button>

            {isShareMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={onOpenCreateForm}
                className="pointer-events-auto absolute bottom-6 right-6 h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-500/40 flex items-center justify-center transition-all active:scale-90"
                title="Tambah Booking"
              >
                <Plus size={22} strokeWidth={2.5} />
              </motion.button>
            )}

            {!isShareMode && pos.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={handleDeliveryAddressBatchPrint}
                className="pointer-events-auto absolute bottom-6 right-6 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white shadow-2xl transition-all hover:bg-slate-900 active:scale-95"
                title="Cetak seluruh alamat batch ini"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                  <Printer size={16} strokeWidth={2.4} />
                </span>
                <span className="text-left">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-indigo-300">Cetak Batch</span>
                  <span className="block text-[10px] font-extrabold">{pos.length} Alamat</span>
                </span>
              </motion.button>
            )}
          </div>
        )}

        {/* Share Mode FAB pada tampilan mobile normal (belum diputar). */}
        <AnimatePresence>
          {!isRotated && isShareMode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={onOpenCreateForm}
              className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-500/40 flex items-center justify-center transition-all active:scale-90"
              title="Tambah Booking"
            >
              <Plus size={22} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
