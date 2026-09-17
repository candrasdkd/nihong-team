import React, { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { createLedgerReport, describeLedgerScope, publicLedgerReportsEnabled, revokeLedgerReport, subscribeLedgerReports, type LedgerReport } from "../services/ledgerReportsFirebase";
import { buildPublicUrl } from "../utils/publicUrl";
import type { LedgerFilters } from "../utils/ledger";

export function LedgerShareModal({ filters, onClose }: { filters: LedgerFilters; onClose: () => void }) {
  const [title, setTitle] = useState("Laporan Buku Kas");
  const [days, setDays] = useState(7);
  const [reports, setReports] = useState<LedgerReport[]>([]);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!publicLedgerReportsEnabled) return;
    return subscribeLedgerReports(setReports, () => setError("Daftar link gagal dimuat. Periksa koneksi atau akses akun."));
  }, []);
  const url = (id: string) => buildPublicUrl(window.location.origin, `/?share_ledger=${id}`, import.meta.env.VITE_PUBLIC_APP_URL);
  async function create() {
    setBusy(true); setError(""); setCopied(false);
    try { setLink(url(await createLedgerReport(filters, title, days))); }
    catch (error) { setError(error instanceof Error ? error.message : "Link gagal dibuat."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError("");
    try { await revokeLedgerReport(id); if (link === url(id)) setLink(""); }
    catch { setError("Akses gagal dicabut. Coba lagi."); }
    finally { setBusy(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(true); }
    catch { setLink(value); setError("Tidak bisa menyalin otomatis. Salin tautan dari kolom di bawah."); }
  }
  return <Modal title="Bagikan Laporan Kas" size="xl" onClose={() => { if (!busy) onClose(); }}>
    {!publicLedgerReportsEnabled ? <p className="text-sm text-slate-600">Laporan publik belum tersedia. Anda tetap bisa mengunduh Excel dari halaman kas.</p> : <div className="space-y-4">
      <p className="text-sm text-slate-600">Penerima melihat salinan transaksi sesuai filter saat link dibuat. Perubahan kas berikutnya tidak mengubah salinan ini. Catatan internal dan saldo keseluruhan tidak ikut dibagikan.</p>
      <div className="rounded-xl bg-surface-base p-3 text-sm">{describeLedgerScope(filters)}</div>
      <Input label="Judul laporan" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} className="min-h-11 text-base" />
      <label className="block text-sm">Masa berlaku<select className="w-full min-h-11 rounded-xl border border-surface-border mt-1 px-3 text-base bg-white" value={days} onChange={e => setDays(Number(e.target.value))}><option value={1}>1 hari</option><option value={7}>7 hari</option><option value={30}>30 hari</option></select></label>
      <Button disabled={busy} onClick={create}>{busy ? "Memproses..." : "Buat Link Laporan"}</Button>
      {link && <div className="space-y-2"><Input aria-label="Link laporan" readOnly value={link} onFocus={e => e.target.select()} className="min-h-11 text-base" /><Button variant="outline" onClick={() => copy(link)}>{copied ? "Link disalin" : "Salin Link"}</Button></div>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="border-t border-surface-border pt-4 space-y-3"><p className="font-semibold text-brand-navy">Link laporan terbaru</p>
        {!reports.length && <p className="text-sm text-slate-500">Belum ada link laporan.</p>}
        {reports.map(report => { const active = !report.revoked && report.expiresAt > Date.now(); return <div key={report.id} className="rounded-xl border border-surface-border p-3 text-sm space-y-2"><p className="font-semibold">{report.title}</p><p className="text-slate-500">{report.scope}</p><p>{report.revoked ? "Akses dicabut" : !active ? "Kedaluwarsa" : `Berlaku sampai ${new Date(report.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}</p>{active && <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => copy(url(report.id))}>Salin</Button><Button variant="outline" disabled={busy} onClick={() => revoke(report.id)}>Cabut Akses</Button></div>}</div>; })}
      </div>
    </div>}
  </Modal>;
}
