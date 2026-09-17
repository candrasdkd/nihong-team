import type { LedgerEntry, LedgerSummary } from "../services/ledgerFirebase";

export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatLedgerDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function validateLedgerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Tanggal transaksi tidak valid.");
  const [year, month, day] = value.split("-").map(Number);
  if (localDateInput(new Date(year, month - 1, day)) !== value) throw new Error("Tanggal transaksi tidak valid.");
}

export function validateAmount(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Nominal harus berupa rupiah bulat lebih dari nol.");
}

export function summarizeLedger(rows: LedgerEntry[]): LedgerSummary {
  let totalMasuk = 0, totalKeluar = 0;
  for (const row of rows) {
    if (row.voidedAt) continue;
    if (row.tipe === "Masuk") totalMasuk += row.jumlah;
    else totalKeluar += row.jumlah;
  }
  return { totalMasuk, totalKeluar, totalSaldo: totalMasuk - totalKeluar, lastUpdated: Date.now() };
}

export type LedgerFilters = { q?: string; type?: string; category?: string; from?: string; to?: string };

export function filterLedger(rows: LedgerEntry[], filters: LedgerFilters): LedgerEntry[] {
  const text = (filters.q || "").trim().toLocaleLowerCase("id-ID");
  return rows.filter(row => !row.voidedAt
    && (!filters.type || row.tipe === filters.type)
    && (!filters.category || row.kategori === filters.category)
    && (!filters.from || row.tanggal >= filters.from)
    && (!filters.to || row.tanggal <= filters.to)
    && (!text || [row.keterangan, row.kategori, row.metode, row.catatan, row.tanggal].some(value => (value || "").toLocaleLowerCase("id-ID").includes(text))))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (b.createdAt || 0) - (a.createdAt || 0) || a.id.localeCompare(b.id));
}

export function visibleSelectedIds(rows: LedgerEntry[], selectedIds: Set<string>): string[] {
  return rows.filter(row => !row.voidedAt && selectedIds.has(row.id)).map(row => row.id);
}

export function getReturnedAmount(advance: { returnedAmount?: number; status: string; jumlah: number }): number {
  return advance.returnedAmount ?? (advance.status === "sudah_kembali" ? advance.jumlah : 0);
}
