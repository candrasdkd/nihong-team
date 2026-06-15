import React, { ReactNode, useEffect } from "react";

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
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative mx-auto w-full ${sizeMap[size]} max-h-[92vh] sm:max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-xl ring-1 ring-black/10`}
      >
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0">
            <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md px-2 py-1 text-neutral-600 hover:bg-neutral-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div
          className={`px-4 sm:px-6 py-4 flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}
        >
          {children}
        </div>
        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t bg-slate-50 flex-shrink-0 rounded-b-3xl sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
