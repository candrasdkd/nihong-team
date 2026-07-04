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
      iconClass: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      btnClass: "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20 dark:shadow-rose-900/30",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      btnClass: "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20 dark:shadow-amber-900/30",
    },
    info: {
      icon: Info,
      iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
      btnClass: "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30",
    },
  };

  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isLoading ? undefined : onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-neutral-800 z-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className={`h-14 w-14 rounded-2xl ${config.iconClass} grid place-items-center mb-4 shadow-sm`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
            {title}
          </h3>
          <div className="text-sm text-slate-500 dark:text-neutral-400 mt-2 font-medium leading-relaxed">
            {message}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white ${config.btnClass} transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
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
