import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { restoreLedgerEntry, subscribeLedgerAudit, type LedgerAudit, type LedgerEntry } from "../services/ledgerFirebase";
import { formatIDR } from "../utils/format";
import { formatLedgerDate } from "../utils/ledger";

const actions = { create: "Dicatat", update: "Diubah", void: "Dibatalkan", restore: "Dipulihkan" };
export function LedgerHistoryModal({ rows, onClose }: { rows: LedgerEntry[]; onClose: () => void }) {
  const [tab, setTab] = useState<"activity" | "cancelled">("activity");
  const [events, setEvents] = useState<LedgerAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  useEffect(() => subscribeLedgerAudit(events => { setEvents(events); setLoading(false); }, () => { setError("Riwayat gagal dimuat. Periksa koneksi atau akses akun."); setLoading(false); }), []);
  async function restore(id: string) {
    setBusy(id); setError("");
    try { await restoreLedgerEntry(id); setRestoreTarget(null); }
    catch (error) { setError(error instanceof Error ? error.message : "Pemulihan gagal."); }
    finally { setBusy(null); }
  }
  const cancelled = rows.filter(row => row.voidedAt).sort((a, b) => (b.voidedAt || 0) - (a.voidedAt || 0));
  return <Modal title="Riwayat Kas" onClose={() => { if (!busy) onClose(); }} size="2xl">
    <div className="flex gap-2 mb-4">
      <Button variant={tab === "activity" ? "primary" : "outline"} onClick={() => setTab("activity")}>Aktivitas</Button>
      <Button variant={tab === "cancelled" ? "primary" : "outline"} onClick={() => setTab("cancelled")}>Dibatalkan ({cancelled.length})</Button>
    </div>
    {error && <p role="alert" className="text-sm text-rose-700 mb-4">{error}</p>}
    {tab === "activity" ? <>
      <p className="text-sm text-slate-500 mb-4">100 perubahan terbaru sejak pencatatan riwayat diaktifkan.</p>
      {loading ? <p>Memuat riwayat...</p> : !events.length ? <p className="text-sm text-slate-500">Belum ada aktivitas tercatat.</p> : events.map(event => <motion.details initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={event.id} className="border-b border-surface-border py-3">
        <summary className="cursor-pointer min-h-11 text-sm space-y-1">
          <span className="font-semibold text-brand-navy">{actions[event.action]} · {event.after.keterangan || "Tanpa keterangan"} · {formatIDR(event.after.jumlah)}</span>
          <span className="block text-xs text-slate-500">{new Date(event.at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {event.actor}</span>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
          {[{ label: "Sebelum", row: event.before }, { label: "Sesudah", row: event.after }].map(({ label, row }) => <div key={label} className="p-3 rounded-xl bg-surface-base">
            <p className="font-bold mb-2">{label}</p>{row ? <><p>{row.tipe} · {formatIDR(row.jumlah)}</p><p>{formatLedgerDate(row.tanggal)}</p><p>{row.metode || "-"}</p><p>{row.kategori || "Tanpa kategori"}</p><p className="break-words">{row.keterangan}</p><p className="break-words">{row.catatan}</p><p>{row.voidedAt ? "Dibatalkan" : "Aktif"}</p></> : <p>Belum ada transaksi</p>}
          </div>)}
        </div>
      </motion.details>)}
    </> : <div className="space-y-3">{!cancelled.length && <p className="text-sm text-slate-500">Tidak ada transaksi yang dibatalkan.</p>}{cancelled.map(row => <div key={row.id} className="rounded-xl border border-surface-border p-4 space-y-2">
      <p className="font-semibold text-sm">{row.keterangan || "Tanpa keterangan"}</p>
      <p className="text-sm text-slate-500">{formatLedgerDate(row.tanggal)} · {row.tipe} · {formatIDR(row.jumlah)}</p>
      {restoreTarget === row.id ? <div className="space-y-2"><p className="text-sm">Pulihkan transaksi ini dan masukkan kembali ke saldo kas?</p><div className="flex gap-2"><Button disabled={!!busy} onClick={() => restore(row.id)}>{busy === row.id ? "Memulihkan..." : "Ya, pulihkan"}</Button><Button variant="outline" disabled={!!busy} onClick={() => setRestoreTarget(null)}>Batal</Button></div></div> : <Button variant="outline" disabled={!!busy} onClick={() => setRestoreTarget(row.id)}>Pulihkan</Button>}
    </div>)}</div>}
  </Modal>;
}
