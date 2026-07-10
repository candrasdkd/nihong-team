import React, { useEffect, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = {
  message: string;
  type: "success" | "error" | "info" | "warning";
  id: number;
};

interface ToastContainerProps {
  toasts: ToastType[];
  removeToast: (id: number) => void;
  position?: "top-right" | "bottom-right" | "top-center" | "bottom-center";
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const positionClasses = {
  "top-right": "top-4 right-4",
  "bottom-right": "bottom-4 right-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: () => void }) {
  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-card shadow-lg border ${styles[toast.type]} min-w-[300px] max-w-[420px]`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="text-sm font-semibold flex-1">{toast.message}</span>
      <button
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-black/5 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer({
  toasts,
  removeToast,
  position = "bottom-right",
}: ToastContainerProps) {
  return (
    <div className={`fixed ${positionClasses[position]} z-[100] flex flex-col gap-2 pointer-events-none`}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToastManager() {
  const [toasts, setToasts] = React.useState<ToastType[]>([]);

  const showToast = useCallback((message: string, type: ToastType["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
