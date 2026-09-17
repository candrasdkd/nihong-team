// Transactions, their capital records, audit events and the cash summary commit together.
import {
  collection, query, where, orderBy, limit as qLimit, onSnapshot,
  getDocsFromServer, getDocFromServer, doc, runTransaction, increment,
  type QueryConstraint, type Transaction, type DocumentData,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getReturnedAmount, localDateInput, summarizeLedger, validateAmount, validateLedgerDate } from "../utils/ledger";

export type LedgerEntry = {
  id: string;
  tanggal: string; // YYYY-MM-DD, local calendar date (never a UTC timestamp).
  tipe: "Masuk" | "Keluar";
  kategori: string | null;
  keterangan: string | null;
  metode: string | null;
  rekening?: string | null;
  jumlah: number; // Positive whole rupiah.
  catatan: string | null;
  createdAt?: number;
  updatedAt?: number;
  revision?: number;
  capitalAdvanceId?: string | null;
  capitalRole?: "expense" | "return" | null;
  voidedAt?: number | null;
  voidedBy?: string | null;
};
export type LedgerUpsert = Pick<LedgerEntry, "tanggal" | "tipe" | "kategori" | "keterangan" | "metode" | "jumlah" | "catatan" | "createdAt">;
export type LedgerSummary = { totalSaldo: number; totalMasuk: number; totalKeluar: number; lastUpdated: number; revision?: number };
export type FetchParams = {
  from?: string; to?: string; type?: "Masuk" | "Keluar"; category?: string;
  order?: { field: keyof LedgerEntry; direction: "asc" | "desc" }; limit?: number;
};
export type LedgerAudit = {
  id: string; entryId: string; action: "create" | "update" | "void" | "restore";
  before: LedgerEntry | null; after: LedgerEntry; at: number; actor: string;
};

function buildConstraints(p: FetchParams): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (p.from) constraints.push(where("tanggal", ">=", p.from));
  if (p.to) constraints.push(where("tanggal", "<=", p.to));
  if (p.type) constraints.push(where("tipe", "==", p.type));
  if (p.category) constraints.push(where("kategori", "==", p.category));
  constraints.push(orderBy(p.order?.field || "tanggal", p.order?.direction || "desc"));
  if (p.limit) constraints.push(qLimit(p.limit));
  return constraints;
}
function mapDoc(d: { id: string; data(): DocumentData }): LedgerEntry {
  const raw = d.data();
  return { ...raw, id: d.id, jumlah: Number(raw.jumlah || 0), kategori: raw.kategori ?? null,
    keterangan: raw.keterangan ?? null, metode: raw.metode ?? null, catatan: raw.catatan ?? null,
  } as LedgerEntry;
}
export async function fetchLedger(p: FetchParams = {}): Promise<LedgerEntry[]> {
  const snap = await getDocsFromServer(query(collection(db, "ledger"), ...buildConstraints(p)));
  return snap.docs.map(mapDoc);
}
export function subscribeLedger(p: FetchParams, onRows: (rows: LedgerEntry[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(query(collection(db, "ledger"), ...buildConstraints(p)), snap => onRows(snap.docs.map(mapDoc)), onError);
}

const summaryRef = () => doc(db, "metadata", "ledger_summary");
const summarySignature = (value: DocumentData | undefined) => JSON.stringify(value ? [value.revision || 0, value.totalMasuk, value.totalKeluar, value.totalSaldo, value.lastUpdated] : null);

/** Server reads plus a compare-and-set guard prevent a concurrent write from being lost.
 * Retry the entire scan, not only the final transaction, when the ledger changes. */
export async function recalculateLedgerSummary(): Promise<LedgerSummary> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const before = await getDocFromServer(summaryRef());
    const baseline = summarySignature(before.data());
    const summary = summarizeLedger(await fetchLedger());
    try {
      await runTransaction(db, async transaction => {
        const current = await transaction.get(summaryRef());
        if (summarySignature(current.data()) !== baseline) throw new Error("LEDGER_CHANGED");
        transaction.set(summaryRef(), { ...summary, revision: (current.data()?.revision || 0) + 1 });
      });
      return summary;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "LEDGER_CHANGED") throw error;
    }
  }
  throw new Error("Kas sedang diperbarui perangkat lain. Coba sinkronisasi lagi.");
}
export async function fetchLedgerSummary(): Promise<LedgerSummary> {
  const snap = await getDocFromServer(summaryRef());
  return snap.exists() ? snap.data() as LedgerSummary : recalculateLedgerSummary();
}
export function subscribeLedgerSummary(onSummary: (summary: LedgerSummary) => void, onError?: (error: Error) => void) {
  return onSnapshot(summaryRef(), snap => {
    if (snap.exists()) onSummary(snap.data() as LedgerSummary);
  }, onError);
}
function actor() {
  if (!auth.currentUser) throw new Error("Silakan masuk kembali untuk mengubah kas.");
  return auth.currentUser.email || auth.currentUser.uid;
}
function cleanPayload(payload: LedgerUpsert): LedgerUpsert {
  validateAmount(payload.jumlah);
  validateLedgerDate(payload.tanggal);
  if (payload.tipe !== "Masuk" && payload.tipe !== "Keluar") throw new Error("Jenis transaksi tidak valid.");
  const clean = (value: string | null | undefined) => value?.trim() || null;
  // Explicit whitelist: callers cannot assign revisions, capital links or cancellation status.
  return {
    tanggal: payload.tanggal, tipe: payload.tipe, jumlah: payload.jumlah,
    kategori: clean(payload.kategori), keterangan: clean(payload.keterangan),
    metode: clean(payload.metode), catatan: clean(payload.catatan),
  };
}
function audit(transaction: Transaction, action: LedgerAudit["action"], id: string, before: DocumentData | null, after: DocumentData, by: string) {
  transaction.set(doc(collection(db, "ledger_audit")), {
    action, entryId: id, before: before ? { ...before, id } : null, after: { ...after, id }, actor: by, at: Date.now(),
  });
}
function summaryDelta(transaction: Transaction, masuk: number, keluar: number) {
  transaction.set(summaryRef(), {
    totalMasuk: increment(masuk), totalKeluar: increment(keluar), totalSaldo: increment(masuk - keluar),
    revision: increment(1), lastUpdated: Date.now(),
  }, { merge: true });
}
function amounts(row: DocumentData | null) {
  if (!row || row.voidedAt) return { masuk: 0, keluar: 0 };
  return { masuk: row.tipe === "Masuk" ? Number(row.jumlah) : 0, keluar: row.tipe === "Keluar" ? Number(row.jumlah) : 0 };
}

// Legacy advances stored only a reverse link; discover it without modifying existing data.
async function legacyLink(id: string) {
  const [outgoing, incoming] = await Promise.all([
    getDocsFromServer(query(collection(db, "capitalAdvances"), where("ledgerEntryIdKeluar", "==", id))),
    getDocsFromServer(query(collection(db, "capitalAdvances"), where("ledgerEntryIdMasuk", "==", id))),
  ]);
  if (outgoing.docs.length > 1 || incoming.docs.length > 1) throw new Error("Terdapat catatan modal ganda. Periksa modal sebelum mengubah transaksi.");
  if (outgoing.docs[0]) return { id: outgoing.docs[0].id, role: "expense" as const };
  if (incoming.docs[0]) return { id: incoming.docs[0].id, role: "return" as const };
  return null;
}
async function readCapital(transaction: Transaction, row: DocumentData, legacy: Awaited<ReturnType<typeof legacyLink>>) {
  const link = row.capitalAdvanceId ? { id: row.capitalAdvanceId as string, role: row.capitalRole as "expense" | "return" } : legacy;
  if (!link) return null;
  const ref = doc(db, "capitalAdvances", link.id);
  const snap = await transaction.get(ref);
  if (!snap.exists()) throw new Error("Catatan modal terkait tidak ditemukan. Periksa riwayat kas.");
  return { ...link, ref, data: snap.data() };
}

/** Entry, initial capital and global totals are created atomically. */
export async function createLedgerEntry(payload: LedgerUpsert, opts?: { trackAsCapital?: boolean }) {
  const by = actor();
  const clean = cleanPayload(payload);
  if (opts?.trackAsCapital && clean.tipe !== "Keluar") throw new Error("Modal belanja harus berupa pengeluaran.");
  await fetchLedgerSummary();
  const ref = doc(collection(db, "ledger"));
  const capitalId = opts?.trackAsCapital ? ref.id : null;
  const row = { ...clean, createdAt: Date.now(), revision: 1, capitalAdvanceId: capitalId, capitalRole: capitalId ? "expense" : null, voidedAt: null };
  await runTransaction(db, async transaction => {
    transaction.set(ref, row);
    if (capitalId) transaction.set(doc(db, "capitalAdvances", capitalId), {
      ledgerEntryIdKeluar: ref.id, tanggalKeluar: clean.tanggal, jumlah: clean.jumlah,
      keterangan: clean.keterangan, status: "belum_kembali", returnedAmount: 0,
      tanggalKembali: null, ledgerEntryIdMasuk: null, createdAt: Date.now(),
    });
    const delta = amounts(row);
    summaryDelta(transaction, delta.masuk, delta.keluar);
    audit(transaction, "create", ref.id, null, row, by);
  });
  return ref.id;
}

/** Read the latest entry and capital record before calculating any delta. */
export async function updateLedgerEntry(id: string, payload: Partial<LedgerUpsert>, opts?: { trackAsCapital?: boolean; expectedRevision?: number }) {
  const by = actor();
  await fetchLedgerSummary();
  const legacy = await legacyLink(id);
  await runTransaction(db, async transaction => {
    const ref = doc(db, "ledger", id);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Transaksi tidak ditemukan.");
    const before = snap.data();
    if (before.voidedAt) throw new Error("Transaksi sudah dibatalkan.");
    if (opts?.expectedRevision !== undefined && (before.revision || 0) !== opts.expectedRevision) throw new Error("Transaksi berubah di perangkat lain. Tutup lalu buka ulang formulir.");
    const clean = cleanPayload({ ...before, ...payload } as LedgerUpsert);
    const capital = await readCapital(transaction, before, legacy);
    if (capital?.role === "return") throw new Error("Batalkan pengembalian modal melalui riwayat, lalu catat ulang untuk mengoreksinya.");
    if ((capital || opts?.trackAsCapital) && clean.tipe !== "Keluar") throw new Error("Transaksi modal harus tetap berupa pengeluaran.");
    if (capital && clean.jumlah < getReturnedAmount(capital.data as any)) throw new Error("Nominal modal tidak boleh kurang dari jumlah yang sudah kembali.");
    const capitalId = capital?.id || (opts?.trackAsCapital ? id : null);
    const after = { ...before, ...clean, updatedAt: Date.now(), revision: (before.revision || 0) + 1, capitalAdvanceId: capitalId, capitalRole: capitalId ? "expense" : null };
    if (capital) {
      const returnedAmount = getReturnedAmount(capital.data as any);
      transaction.update(capital.ref, {
        jumlah: clean.jumlah, tanggalKeluar: clean.tanggal, keterangan: clean.keterangan,
        returnedAmount, status: returnedAmount === clean.jumlah ? "sudah_kembali" : "belum_kembali", updatedAt: Date.now(),
      });
    } else if (capitalId) {
      transaction.set(doc(db, "capitalAdvances", capitalId), {
        ledgerEntryIdKeluar: id, tanggalKeluar: clean.tanggal, jumlah: clean.jumlah, keterangan: clean.keterangan,
        returnedAmount: 0, status: "belum_kembali", tanggalKembali: null, ledgerEntryIdMasuk: null, createdAt: Date.now(),
      });
    }
    transaction.update(ref, after);
    const old = amounts(before), next = amounts(after);
    summaryDelta(transaction, next.masuk - old.masuk, next.keluar - old.keluar);
    audit(transaction, "update", id, before, after, by);
  });
}

/** Cancellation retains the transaction and records an audit event; it is never a hard delete.
 * A selected batch is all-or-nothing, including all capital and balance changes. */
export async function voidLedgerEntries(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  if (unique.length > 100) throw new Error("Batalkan maksimal 100 transaksi sekaligus.");
  const by = actor();
  await fetchLedgerSummary();
  const links = await Promise.all(unique.map(legacyLink));
  await runTransaction(db, async transaction => {
    const entries = [];
    for (let i = 0; i < unique.length; i++) {
      const ref = doc(db, "ledger", unique[i]);
      const snap = await transaction.get(ref);
      if (!snap.exists() || snap.data().voidedAt) continue;
      const before = snap.data();
      const capital = await readCapital(transaction, before, links[i]);
      entries.push({ ref, before, capital });
    }
    const capitalUpdates = new Map<string, { ref: NonNullable<typeof entries[number]["capital"]>["ref"]; data: DocumentData }>();
    for (const { before, capital } of entries) {
      if (!capital) continue;
      const data = capitalUpdates.get(capital.id)?.data || { ...capital.data, returnedAmount: getReturnedAmount(capital.data as any) };
      if (capital.role === "return") data.returnedAmount -= before.jumlah;
      capitalUpdates.set(capital.id, { ref: capital.ref, data });
    }
    for (const { capital } of entries) {
      if (!capital || capital.role !== "expense") continue;
      const data = capitalUpdates.get(capital.id)!.data;
      if (data.returnedAmount > 0) throw new Error("Batalkan pengembalian modal terkait terlebih dahulu, atau pilih bersama pengeluaran asalnya.");
      data.status = "dibatalkan";
    }
    let masuk = 0, keluar = 0;
    for (const { ref, before, capital } of entries) {
      const after = { ...before, voidedAt: Date.now(), voidedBy: by, revision: (before.revision || 0) + 1,
        ...(capital ? { capitalAdvanceId: capital.id, capitalRole: capital.role } : {}),
      };
      transaction.update(ref, after);
      const delta = amounts(before); masuk -= delta.masuk; keluar -= delta.keluar;
      audit(transaction, "void", ref.id, before, after, by);
    }
    for (const { ref, data } of capitalUpdates.values()) {
      if (data.returnedAmount < 0) throw new Error("Riwayat pengembalian modal tidak konsisten. Periksa transaksi terkait.");
      transaction.update(ref, { returnedAmount: data.returnedAmount, status: data.status === "dibatalkan" ? "dibatalkan" : data.returnedAmount >= data.jumlah ? "sudah_kembali" : "belum_kembali", updatedAt: Date.now() });
    }
    if (entries.length) summaryDelta(transaction, masuk, keluar);
  });
}
export async function deleteLedgerEntry(id: string) { return voidLedgerEntries([id]); }

export async function restoreLedgerEntry(id: string) {
  const by = actor();
  await fetchLedgerSummary();
  const legacy = await legacyLink(id);
  await runTransaction(db, async transaction => {
    const ref = doc(db, "ledger", id);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Transaksi tidak ditemukan.");
    const before = snap.data();
    if (!before.voidedAt) return;
    const capital = await readCapital(transaction, before, legacy);
    let returnedAmount = capital ? getReturnedAmount(capital.data as any) : 0;
    if (capital?.role === "return") {
      const original = await transaction.get(doc(db, "ledger", capital.data.ledgerEntryIdKeluar));
      if (!original.exists() || original.data().voidedAt) throw new Error("Pulihkan pengeluaran modal asal terlebih dahulu.");
      returnedAmount += before.jumlah;
      if (returnedAmount > capital.data.jumlah) throw new Error("Pemulihan melebihi sisa modal. Periksa pengembalian lain.");
    }
    const after = { ...before, voidedAt: null, voidedBy: null, updatedAt: Date.now(), revision: (before.revision || 0) + 1 };
    transaction.update(ref, after);
    if (capital) transaction.update(capital.ref, { returnedAmount, status: returnedAmount >= capital.data.jumlah ? "sudah_kembali" : "belum_kembali", updatedAt: Date.now() });
    const delta = amounts(after);
    summaryDelta(transaction, delta.masuk, delta.keluar);
    audit(transaction, "restore", id, before, after, by);
  });
}

export type CapitalReturnInput = { jumlah: number; tanggal: string; metode: string; requestId?: string };
export async function recordCapitalReturn(advanceId: string, input?: CapitalReturnInput) {
  const by = actor();
  await fetchLedgerSummary();
  // Reuse a request ID across retries from the same dialog to avoid a duplicate partial return.
  const ref = input?.requestId ? doc(db, "ledger", input.requestId) : doc(collection(db, "ledger"));
  await runTransaction(db, async transaction => {
    const advRef = doc(db, "capitalAdvances", advanceId);
    const [snap, existing] = await Promise.all([transaction.get(advRef), transaction.get(ref)]);
    if (existing.exists()) {
      if (existing.data().capitalAdvanceId !== advanceId) throw new Error("Referensi pengembalian tidak valid.");
      return;
    }
    if (!snap.exists() || snap.data().status === "dibatalkan") throw new Error("Modal tidak tersedia atau sudah dibatalkan.");
    const advance = snap.data();
    const originalRef = doc(db, "ledger", advance.ledgerEntryIdKeluar);
    const original = await transaction.get(originalRef);
    if (!original.exists() || original.data().voidedAt || original.data().tipe !== "Keluar") throw new Error("Pengeluaran modal asal tidak aktif. Periksa riwayat kas.");
    if (original.data().jumlah !== advance.jumlah) throw new Error("Nominal modal berbeda dengan pengeluaran asal. Edit transaksi asal untuk menyelaraskannya.");
    const returned = getReturnedAmount(advance as any);
    const amount = input?.jumlah ?? advance.jumlah - returned;
    validateAmount(amount);
    if (amount > advance.jumlah - returned) throw new Error("Pengembalian melebihi sisa modal yang belum kembali.");
    const tanggal = input?.tanggal || localDateInput();
    validateLedgerDate(tanggal);
    const row = { tanggal, tipe: "Masuk", kategori: "Pengembalian Modal", keterangan: `Pengembalian modal: ${advance.keterangan || "-"}`,
      jumlah: amount, metode: input?.metode || original.data().metode || null,
      catatan: null, createdAt: Date.now(), revision: 1, voidedAt: null, capitalAdvanceId: advanceId, capitalRole: "return" };
    transaction.set(ref, row);
    // Backfill the link on legacy expenses in the same atomic write.
    transaction.update(originalRef, { capitalAdvanceId: advanceId, capitalRole: "expense" });
    transaction.update(advRef, { returnedAmount: returned + amount, status: returned + amount === advance.jumlah ? "sudah_kembali" : "belum_kembali",
      tanggalKembali: tanggal, ledgerEntryIdMasuk: ref.id, updatedAt: Date.now() });
    summaryDelta(transaction, amount, 0);
    audit(transaction, "create", ref.id, null, row, by);
  });
}
export function subscribeLedgerAudit(onRows: (rows: LedgerAudit[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, "ledger_audit"), orderBy("at", "desc"), qLimit(100)), snap => {
    onRows(snap.docs.map(d => ({ ...d.data(), id: d.id } as LedgerAudit)));
  }, onError);
}
