import { useState } from "react";

import { Input } from "./ui/Input";
import { TextArea } from "./ui/TextArea";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

export interface CustomerFormValues {
  id?: string;
  nama: string;
  alamat?: string;
  telpon?: string;
}

interface CustomerFormModalProps {
  initial?: CustomerFormValues;
  onClose: () => void;
  onSubmit: (c: CustomerFormValues) => Promise<void> | void;
}

export function CustomerFormModal({ initial, onClose, onSubmit }: CustomerFormModalProps) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [alamat, setAlamat] = useState(initial?.alamat ?? "");
  const [telpon, setTelpon] = useState(initial?.telpon ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status and Style Helpers for Inputs (Required vs Optional, Empty vs Filled)
  const renderLabel = (text: string, value: any, isRequired: boolean = false) => {
    const isEmpty = value === undefined || value === null || value === "";
    return (
      <div className="flex justify-between items-center mb-1.5 select-none">
        <span className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 transition-colors duration-300 ${
          isRequired
            ? isEmpty
              ? "text-amber-700 font-bold animate-pulse"
              : "text-slate-600"
            : "text-slate-500"
        }`}>
          <span>{text}</span>
          {isRequired && <span className="text-rose-500 font-extrabold">*</span>}
        </span>
        {isRequired ? (
          isEmpty ? (
            <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none animate-pulse">
              <span className="w-1 h-1 rounded-full bg-amber-500"></span>
              ⚠️ WAJIB DIISI
            </span>
          ) : (
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ✓ TERISI
            </span>
          )
        ) : (
          isEmpty ? (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-lg select-none">
              OPSIONAL
            </span>
          ) : (
            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              ✓ TERISI (OPSIONAL)
            </span>
          )
        )}
      </div>
    );
  };

  const getInputClass = (value: any, isRequired: boolean = false, extraClasses: string = "") => {
    const isEmpty = value === undefined || value === null || value === "";
    
    let borderStyle = "";
    let backgroundStyle = "";
    let focusStyle = "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500";
    
    if (isRequired) {
      if (isEmpty) {
        borderStyle = "border-dashed border-amber-300 hover:border-amber-400";
        backgroundStyle = "bg-amber-50/15 text-slate-800 placeholder:text-amber-400/70";
        focusStyle = "focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/25";
      } else {
        borderStyle = "border-solid border-emerald-300/80 hover:border-emerald-400";
        backgroundStyle = "bg-emerald-50/5 text-slate-800 shadow-sm";
      }
    } else {
      if (isEmpty) {
        borderStyle = "border-solid border-slate-200 hover:border-slate-300";
        backgroundStyle = "bg-slate-50/40 text-slate-400 placeholder:text-slate-400";
      } else {
        borderStyle = "border-solid border-slate-300 hover:border-slate-400";
        backgroundStyle = "bg-white text-slate-800 shadow-xs";
      }
    }
    
    return `${borderStyle} ${backgroundStyle} ${focusStyle} ${extraClasses}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg("Nama pelanggan wajib diisi.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onSubmit({
        id: initial?.id,
        nama: nama.trim().toUpperCase(),
        alamat: alamat.trim(),
        telpon: telpon.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={submitting ? () => {} : onClose}
      title={initial?.id ? "Edit Konsumen" : "Tambah Konsumen"}
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 py-2">
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700 flex items-center gap-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <div>
          {renderLabel("Nama Pelanggan", nama, true)}
          <Input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            disabled={submitting}
            placeholder="Contoh: BUDI SANTOSO"
            className={getInputClass(nama, true, "transition-all duration-300 rounded-xl uppercase")}
          />
        </div>

        <div>
          {renderLabel("No Telepon / WhatsApp", telpon, false)}
          <Input
            value={telpon}
            onChange={(e) => setTelpon(e.target.value)}
            disabled={submitting}
            placeholder="Contoh: 081234567890 atau +62..."
            className={getInputClass(telpon, false, "transition-all duration-300 font-mono text-sm rounded-xl")}
          />
        </div>

        <div>
          {renderLabel("Alamat Lengkap", alamat, false)}
          <TextArea
            rows={3}
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            disabled={submitting}
            placeholder="Masukkan alamat pengiriman lengkap..."
            className={getInputClass(alamat, false, "transition-all duration-300 rounded-xl")}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 active:scale-95 transition-all px-4 h-11 rounded-xl"
          >
            Batal
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 active:scale-95 transition-all px-6 h-11 rounded-xl font-semibold"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Menyimpan...
              </span>
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

