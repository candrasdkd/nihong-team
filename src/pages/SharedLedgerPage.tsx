import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { subscribePublicLedgerReport, type LedgerReport } from "../services/ledgerReportsFirebase";
import { formatIDR } from "../utils/format";
import { formatLedgerDate } from "../utils/ledger";
import { Button } from "../components/ui/Button";
import { exportLedgerToExcel } from "../utils/exportExcel";

/** Public reports read exactly one scoped snapshot, never the private ledger or summary. */
export function SharedLedgerPage({ token }: { token: string }) {
  const [report, setReport] = useState<LedgerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setLoading(true); setReport(null);
    return subscribePublicLedgerReport(token, value => { setReport(value); setLoading(false); }, () => { setReport(null); setLoading(false); });
  }, [token]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const valid = report && !report.revoked && report.expiresAt > now;
  const rows = valid ? report.rows : [];
  const masuk = rows.reduce((sum, row) => sum + (row.tipe === "Masuk" ? row.jumlah : 0), 0);
  const keluar = rows.reduce((sum, row) => sum + (row.tipe === "Keluar" ? row.jumlah : 0), 0);
  return <main className="min-h-screen bg-surface-base text-brand-navy px-4 py-8 sm:py-12">
    <div className="max-w-5xl mx-auto space-y-6">
      <header><p className="text-sm font-semibold text-brand-orange">NIHONG JASTIP</p><h1 className="mt-2 text-2xl font-bold">{valid ? report.title : "Laporan Buku Kas"}</h1></header>
      {loading ? <p role="status">Memuat laporan...</p> : !valid ? <div className="bg-surface-card border border-surface-border p-6 rounded-2xl"><h2 className="font-bold">Laporan tidak tersedia</h2><p className="text-sm text-slate-600 mt-2">Link mungkin tidak valid, sudah kedaluwarsa, dicabut, atau koneksi terputus. Minta link terbaru dari pengirim dan pastikan Anda terhubung ke internet.</p></div> : <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="text-sm text-slate-600 space-y-2"><p>{report.scope}</p><p>Salinan dibuat {new Date(report.capturedAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {rows.length} transaksi</p><p>Laporan ini hanya mencakup transaksi yang dibagikan.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{ title: "Pemasukan laporan", value: masuk }, { title: "Pengeluaran laporan", value: keluar }, { title: "Selisih laporan", value: masuk - keluar }].map(stat => <div key={stat.title} className="rounded-2xl bg-surface-card border border-surface-border p-5"><p className="text-sm text-slate-500">{stat.title}</p><p className="text-xl font-bold mt-2">{formatIDR(stat.value)}</p></div>)}</div>
        <Button variant="outline" onClick={() => exportLedgerToExcel(rows.map((row, index) => ({ ...row, id: String(index), metode: null, catatan: null })), "Laporan_Kas.xlsx")}>Unduh Excel ({rows.length} transaksi)</Button>
        <div className="rounded-2xl border border-surface-border bg-surface-card divide-y divide-surface-border">{rows.map((row, index) => <article key={index} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div className="min-w-0"><p className="font-semibold break-words">{row.keterangan || "Tanpa keterangan"}</p><p className="text-sm text-slate-500 mt-1">{formatLedgerDate(row.tanggal)} · {row.kategori || "Lainnya"}</p></div><p className={`font-bold whitespace-nowrap ${row.tipe === "Masuk" ? "text-emerald-700" : "text-rose-700"}`}>{row.tipe === "Masuk" ? "+" : "−"}{formatIDR(row.jumlah)}</p></article>)}</div>
      </motion.div>}
    </div>
  </main>;
}
