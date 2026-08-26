import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPinned, UserRound, X } from "lucide-react";
import { Jastiper } from "../../types";
import { Button } from "../ui/Button";

interface JastiperFormModalProps {
  initial?: Jastiper | null;
  onClose: () => void;
  onSubmit: (data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

export function JastiperFormModal({ initial, onClose, onSubmit }: JastiperFormModalProps) {
  const [nama, setNama] = useState(initial?.nama || "");
  const [noTelpon, setNoTelpon] = useState(initial?.noTelpon || "");
  const [alamat, setAlamat] = useState(initial?.alamat || "");
  const [shareLocationUrl, setShareLocationUrl] = useState(initial?.shareLocationUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama Jastiper wajib diisi.");
      return;
    }
    if (!noTelpon.trim()) {
      setError("No. Telpon / WhatsApp wajib diisi.");
      return;
    }
    if (!alamat.trim()) {
      setError("Alamat wajib diisi.");
      return;
    }

    const locationValue = shareLocationUrl.trim();
    const normalizedLocationUrl = locationValue && !/^https?:\/\//i.test(locationValue)
      ? `https://${locationValue}`
      : locationValue;
    if (normalizedLocationUrl) {
      try {
        const parsedUrl = new URL(normalizedLocationUrl);
        if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error();
      } catch {
        setError("Link Share Location tidak valid.");
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        nama: nama.trim().toUpperCase(),
        noTelpon: noTelpon.trim(),
        alamat: alamat.trim(),
        shareLocationUrl: normalizedLocationUrl,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";
  const fieldClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold text-slate-800 transition-all";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t-4 border-t-violet-500 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl z-10 custom-scrollbar"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <UserRound size={18} className="text-violet-600" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {initial ? "Edit Jastiper" : "Tambah Jastiper Baru"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className={labelClass}>Nama Jastiper *</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                placeholder="Contoh: BUDI SANTOSO"
                style={{ textTransform: "uppercase" }}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>No. Telpon / WhatsApp *</label>
              <input
                value={noTelpon}
                onChange={(e) => setNoTelpon(e.target.value)}
                placeholder="08xxxxxxxxxx"
                type="tel"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Alamat *</label>
              <textarea
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat lengkap Jastiper..."
                rows={3}
                className={`${fieldClass} resize-none`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className={labelClass}>Share Location</label>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Opsional</span>
              </div>
              <div className="relative">
                <MapPinned className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
                <input
                  value={shareLocationUrl}
                  onChange={(e) => setShareLocationUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  type="text"
                  inputMode="url"
                  className={`${fieldClass} pl-10`}
                />
              </div>
              <p className="text-[10px] font-medium leading-relaxed text-slate-400">
                Tempel link dari menu Share/Bagi di Google Maps.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Batal
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-md shadow-violet-600/20"
              >
                {initial ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
