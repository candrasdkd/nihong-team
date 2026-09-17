import { collection, doc, getDocFromServer, onSnapshot, orderBy, query, limit, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { fetchLedger } from "./ledgerFirebase";
import { filterLedger, formatLedgerDate, validateLedgerDate, type LedgerFilters } from "../utils/ledger";

// Enable only after applying the scoped Firestore rules in firestore/ledger.rules.
export const publicLedgerReportsEnabled = import.meta.env.VITE_ENABLE_PUBLIC_LEDGER_REPORTS === "true";
export const isLedgerReportToken = (value: string) => /^[a-f0-9]{48}$/.test(value);
export type PublicLedgerRow = { tanggal: string; tipe: "Masuk" | "Keluar"; kategori: string | null; keterangan: string | null; jumlah: number };
export type LedgerReport = {
  id: string; title: string; scope: string; rows: PublicLedgerRow[];
  capturedAt: number; expiresAt: number; revoked: boolean;
};
export function describeLedgerScope(filters: LedgerFilters) {
  return [
    filters.from && `Dari ${formatLedgerDate(filters.from)}`,
    filters.to && `Sampai ${formatLedgerDate(filters.to)}`,
    filters.type, filters.category,
    filters.q?.trim() && `Pencarian: ${filters.q.trim()}`,
  ].filter(Boolean).join(" · ") || "Semua transaksi aktif";
}
export function publicLedgerRows(rows: ReturnType<typeof filterLedger>): PublicLedgerRow[] {
  // Do not copy internal notes, account names, audit data or global balances to public reports.
  return rows.map(row => ({ tanggal: row.tanggal, tipe: row.tipe, kategori: row.kategori, keterangan: row.keterangan, jumlah: row.jumlah }));
}
function requireAdminSession() {
  if (!auth.currentUser) throw new Error("Silakan masuk kembali.");
  if (!publicLedgerReportsEnabled) throw new Error("Laporan publik belum tersedia. Anda tetap bisa mengunduh Excel.");
}
export async function createLedgerReport(filters: LedgerFilters, title: string, days: number): Promise<string> {
  requireAdminSession();
  if (filters.from) validateLedgerDate(filters.from);
  if (filters.to) validateLedgerDate(filters.to);
  if (filters.from && filters.to && filters.from > filters.to) throw new Error("Tanggal awal tidak boleh melebihi tanggal akhir.");
  if (![1, 7, 30].includes(days)) throw new Error("Masa berlaku laporan tidak valid.");
  const rows = publicLedgerRows(filterLedger(await fetchLedger(), filters));
  if (!rows.length) throw new Error("Tidak ada transaksi untuk dibagikan.");
  const capturedAt = Date.now();
  const report = { title: title.trim().slice(0, 120) || "Laporan Buku Kas", scope: describeLedgerScope(filters), rows,
    capturedAt, expiresAt: capturedAt + days * 86400000, revoked: false };
  if (new TextEncoder().encode(JSON.stringify(report)).length > 850000) throw new Error("Laporan terlalu besar. Pilih periode yang lebih pendek.");
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, "0")).join("");
  await setDoc(doc(db, "ledger_reports", token), report);
  return token;
}
export async function revokeLedgerReport(token: string) {
  requireAdminSession();
  if (!isLedgerReportToken(token)) throw new Error("Link laporan tidak valid.");
  await updateDoc(doc(db, "ledger_reports", token), { revoked: true });
}
export function subscribeLedgerReports(onReports: (reports: LedgerReport[]) => void, onError: (error: Error) => void) {
  requireAdminSession();
  return onSnapshot(query(collection(db, "ledger_reports"), orderBy("capturedAt", "desc"), limit(100)), snap => {
    onReports(snap.docs.map(d => ({ ...d.data(), id: d.id } as LedgerReport)));
  }, onError);
}
export function subscribePublicLedgerReport(token: string, onReport: (report: LedgerReport | null) => void, onError: (error: Error) => void) {
  if (!publicLedgerReportsEnabled || !isLedgerReportToken(token)) { onReport(null); return () => {}; }
  const ref = doc(db, "ledger_reports", token);
  let cancelled = false;
  let unsubscribe: (() => void) | undefined;
  // Validate with the server first. Never reveal a cached report before checking revocation.
  getDocFromServer(ref).then(snap => {
    if (cancelled) return;
    if (!snap.exists() || snap.data().revoked || snap.data().expiresAt <= Date.now()) { onReport(null); return; }
    unsubscribe = onSnapshot(ref, { includeMetadataChanges: true }, live => {
      if (cancelled) return;
      // A disconnected listener must not keep serving a possibly revoked snapshot.
      if (live.metadata.fromCache || !live.exists() || live.data().revoked || live.data().expiresAt <= Date.now()) onReport(null);
      else onReport({ ...live.data(), id: live.id } as LedgerReport);
    }, onError);
  }).catch(error => { if (!cancelled) onError(error); });
  return () => { cancelled = true; unsubscribe?.(); };
}
