import { motion } from "framer-motion";
import { LogOutIcon } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Konten Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800"
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 grid place-items-center mb-4">
            <LogOutIcon />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            Konfirmasi Logout
          </h3>
          <p className="text-sm text-neutral-500 mt-2">
            Apakah Anda yakin ingin keluar dari sesi ini? Anda harus login kembali untuk mengakses data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95"
          >
            Ya, Keluar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
