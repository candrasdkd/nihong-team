import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  contentClassName?: string;
}

const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-[98vw] w-[98vw] md:max-w-[90vw]",
};

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "lg",
  contentClassName = "",
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative mx-auto w-full ${sizeMap[size]} max-h-[92vh] sm:max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-card bg-surface-card shadow-modal border border-surface-border`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-surface-border flex-shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-input p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div
          className={`px-5 sm:px-6 py-5 flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}
        >
          {children}
        </div>
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-surface-border bg-slate-50 flex-shrink-0 rounded-b-3xl sm:rounded-b-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
