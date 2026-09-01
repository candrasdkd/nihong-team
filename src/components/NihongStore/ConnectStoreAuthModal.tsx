// src/components/NihongStore/ConnectStoreAuthModal.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  ExternalLink,
} from "lucide-react";
import { loginNihongStoreAdmin } from "../../services/nihongStoreFirebase";
import { Button } from "../ui/Button";

interface ConnectStoreAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultEmail?: string;
}

export function ConnectStoreAuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultEmail = "",
}: ConnectStoreAuthModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password harus diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginNihongStoreAdmin(email.trim(), password);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[NihongStore Login Error]", err);
      setError(err?.message || "Gagal menghubungkan akun admin NihongStore.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 m-0 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                Hubungkan Sesi NihongStore
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Otentikasi admin ke database toko (nihongstore-6210b)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="font-bold leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700">
              Email Admin NihongStore
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nihongstore.com"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700">
              Password Admin
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold px-4 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold px-5 py-2 rounded-xl shadow-md shadow-brand-orange/20 flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <KeyRound size={14} />
              )}
              <span>{loading ? "Menghubungkan…" : "Masuk ke NihongStore"}</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
