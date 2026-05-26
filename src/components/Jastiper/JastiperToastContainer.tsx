import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { ToastMsg } from "../../hooks/useJastipers";

interface JastiperToastContainerProps {
  toasts: ToastMsg[];
  remove: (id: number) => void;
}

export function JastiperToastContainer({ toasts, remove }: JastiperToastContainerProps) {
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
            t.type === "error" ? "bg-white border-red-200 text-red-700" : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {t.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className="ml-2 p-0.5 rounded-full hover:bg-black/10">
            <X size={14} />
          </button>
        </motion.div>
      ))}
    </div>
  );
}
