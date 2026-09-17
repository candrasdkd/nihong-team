import React, { useState } from "react";
import { motion } from "framer-motion";
import { Modal } from "./ui/Modal";
import { RupiahInput } from "./ui/RupiahInput";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { returnCapitalAdvance, type CapitalAdvance } from "../services/capitalAdvanceFirebase";
import { formatIDR } from "../utils/format";
import { getReturnedAmount, localDateInput } from "../utils/ledger";

export function CapitalReturnModal({ advance, onClose }: {
  advance: CapitalAdvance; onClose: () => void;
}) {
  const remaining = advance.jumlah - getReturnedAmount(advance);
  const [jumlah, setJumlah] = useState(remaining);
  const [tanggal, setTanggal] = useState(localDateInput);
  const [metode, setMetode] = useState("Transfer");
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    if (jumlah <= 0 || jumlah > remaining) { setError("Nominal harus lebih dari nol dan tidak melebihi sisa modal."); return; }
    setBusy(true); setError("");
    try {
      await returnCapitalAdvance(advance.id, { jumlah, tanggal, metode, requestId });
      onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "Pengembalian gagal disimpan."); }
    finally { setBusy(false); }
  }
  return <Modal title="Catat Pengembalian Modal" onClose={() => { if (!busy) onClose(); }} size="md" footer={
    <Button className="w-full min-h-11" disabled={busy} onClick={submit}>{busy ? "Menyimpan..." : "Simpan Pengembalian"}</Button>
  }>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <p className="text-sm text-brand-navy">{advance.keterangan || "Modal belanja"}</p>
      <div className="rounded-xl bg-surface-base p-4 text-sm space-y-1">
        <p>Modal awal: <strong>{formatIDR(advance.jumlah)}</strong></p>
        <p>Sudah kembali: <strong>{formatIDR(getReturnedAmount(advance))}</strong></p>
        <p>Sisa: <strong>{formatIDR(remaining)}</strong></p>
      </div>
      <RupiahInput label="Nominal yang kembali" value={jumlah} onChange={setJumlah} disabled={busy} className="min-h-11 text-base" />
      <p className="text-sm text-slate-500">Isi nominal yang benar-benar sudah diterima. Sisa modal tetap tercatat sampai lunas.</p>
      <Input label="Tanggal kembali" type="date" value={tanggal} disabled={busy} onChange={e => setTanggal(e.target.value)} className="min-h-11 text-base" />
      <label className="block text-sm">Metode penerimaan<select value={metode} disabled={busy} onChange={e => setMetode(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-surface-border px-3 text-base bg-white"><option>Transfer</option><option>Cash</option><option>E-Wallet</option></select></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </motion.div>
  </Modal>;
}
