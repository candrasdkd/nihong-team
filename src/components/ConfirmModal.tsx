import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Trash2, Info } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  type = "danger",
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: Trash2,
      iconClass: "bg-red-50 text-red-600",
      btnClass: "bg-red-600 hover:bg-red-700 shadow-sm",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "bg-amber-50 text-amber-600",
      btnClass: "bg-amber-600 hover:bg-amber-700 shadow-sm",
    },
    info: {
      icon: Info,
      iconClass: "bg-blue-50 text-blue-600",
      btnClass: "bg-brand-navy hover:bg-brand-navyLight shadow-sm",
    },
  };

  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isLoading ? undefined : onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-sm bg-surface-card rounded-card p-6 shadow-lg border border-surface-border z-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className={`h-14 w-14 rounded-2xl ${config.iconClass} grid place-items-center mb-4 shadow-sm`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
            {title}
          </h3>
          <div className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
            {message}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-input text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              try {
                await onConfirm();
                onClose();
              } catch (err) {
                console.error("Confirmation action failed:", err);
              } finally {
                setIsLoading(false);
              }
            }}
            className={`px-4 py-2.5 rounded-input text-sm font-bold text-white ${config.btnClass} transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            )}
            <span>{isLoading ? "Memproses..." : confirmText}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
