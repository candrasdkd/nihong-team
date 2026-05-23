// src/services/ledgerFirebase.ts
import {
  collection,
  query,
  where,
  orderBy,
  limit as qLimit,
  onSnapshot,
  getDocs,
  doc,
  QueryConstraint,
  runTransaction,
  increment,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// Struktur data satu baris riwayat transaksi kas (LedgerEntry)
export type LedgerEntry = {
  id: string;
  tanggal: string; // Format 'YYYY-MM-DD' (menggunakan string untuk menghindari perbedaan zona waktu lokal browser)
  tipe: "Masuk" | "Keluar"; // Jenis transaksi: Pemasukan atau Pengeluaran
  kategori: string | null; // Kategori pengelompokan kas (misal: Ongkir, Pajak, Jastip)
  keterangan: string | null; // Rincian transaksi
  metode: string | null; // Metode pembayaran (misal: Transfer BCA, Cash, dll)
  jumlah: number; // Nominal uang (selalu bernilai positif)
  catatan: string | null; // Informasi tambahan
  createdAt?: number; // Waktu pembuatan dalam bentuk Epoch Milliseconds
};

// Parameter pencarian & filter untuk query kas
type FetchParams = {
  from?: string; // Batas tanggal awal filter
  to?: string; // Batas tanggal akhir filter
  type?: "Masuk" | "Keluar"; // Batasi hanya tipe Pemasukan/Pengeluaran
  category?: string; // Batasi hanya kategori tertentu
  order?: { field: keyof LedgerEntry; direction: "asc" | "desc" }; // Aturan pengurutan
  limit?: number; // Batasan jumlah dokumen yang diambil (untuk pagination scroll)
};

/**
 * Menyusun batasan (Query Constraints) untuk query Firestore berdasarkan parameter filter yang aktif.
 * 
 * @param p - Parameter pencarian dari pengguna.
 */
function buildConstraints(p: FetchParams): QueryConstraint[] {
  const c: QueryConstraint[] = [];
  if (p.from) c.push(where("tanggal", ">=", p.from));
  if (p.to) c.push(where("tanggal", "<=", p.to));
  if (p.type) c.push(where("tipe", "==", p.type));
  if (p.category) c.push(where("kategori", "==", p.category));
  const field = p.order?.field || "tanggal";
  const dir = p.order?.direction || "desc";
  c.push(orderBy(field as string, dir));
  if (p.limit) c.push(qLimit(p.limit));
  return c;
}

/**
 * Mengonversi dokumen mentah (DocumentSnapshot) dari Firestore ke object bertipe LedgerEntry.
 */
function mapDoc(d: any): LedgerEntry {
  const raw = d.data();
  return {
    id: d.id,
    tanggal: raw.tanggal,
    tipe: raw.tipe,
    kategori: raw.kategori ?? null,
    keterangan: raw.keterangan ?? null,
    metode: raw.metode ?? null,
    jumlah: Number(raw.jumlah || 0),
    catatan: raw.catatan ?? null,
    createdAt: raw.createdAt ?? undefined,
  };
}

/**
 * Mengambil (fetch) data riwayat kas satu kali dari Firestore berdasarkan filter.
 */
export async function fetchLedger(p: FetchParams): Promise<LedgerEntry[]> {
  const col = collection(db, "ledger");
  const qy = query(col, ...buildConstraints(p));
  const snap = await getDocs(qy);
  return snap.docs.map(mapDoc);
}

/**
 * Mendengarkan (subscribe) perubahan data riwayat kas secara real-time dari Firestore.
 * 
 * @param p - Parameter pencarian / filter.
 * @param onRows - Callback yang terpanggil ketika data di database berubah.
 */
export function subscribeLedger(
  p: FetchParams,
  onRows: (rows: LedgerEntry[]) => void,
) {
  const col = collection(db, "ledger");
  const qy = query(col, ...buildConstraints(p));
  const unsub = onSnapshot(qy, (snap) => onRows(snap.docs.map(mapDoc)));
  return unsub;
}

/* ===================== CRUD & Summary Sync ===================== */

// Tipe data untuk menambah/mengedit transaksi kas (tanpa field ID)
export type LedgerUpsert = Omit<LedgerEntry, "id">;

// Tipe data ringkasan total saldo kas global
export type LedgerSummary = {
  totalSaldo: number; // Saldo akhir = totalMasuk - totalKeluar
  totalMasuk: number; // Akumulasi seluruh kas masuk
  totalKeluar: number; // Akumulasi seluruh kas keluar
  lastUpdated: number; // Waktu terakhir disinkronkan
};

/**
 * Menghitung ulang saldo kas global (recalculation) dengan memindai seluruh dokumen riwayat kas.
 * Operasi ini menjamin data saldo global di metadata sinkron 100% dengan total transaksi di database.
 */
export async function recalculateLedgerSummary(): Promise<LedgerSummary> {
  const colRef = collection(db, "ledger");
  const summaryRef = doc(db, "metadata", "ledger_summary");
  
  const snap = await getDocs(colRef);
  let totalMasuk = 0;
  let totalKeluar = 0;
  
  // Melakukan akumulasi manual dari seluruh riwayat kas
  snap.forEach((d) => {
    const data = d.data();
    const amount = Number(data.jumlah || 0);
    if (data.tipe === "Masuk") {
      totalMasuk += amount;
    } else {
      totalKeluar += amount;
    }
  });
  
  const summary: LedgerSummary = {
    totalMasuk,
    totalKeluar,
    totalSaldo: totalMasuk - totalKeluar,
    lastUpdated: Date.now(),
  };
  
  // Menyimpan hasil kalkulasi ke dokumen metadata tunggal
  await setDoc(summaryRef, summary);
  return summary;
}

/**
 * Mengambil ringkasan saldo kas global tunggal dari metadata.
 * Jika dokumen metadata belum ada di database, otomatis memicu hitung ulang (recalculate).
 */
export async function fetchLedgerSummary(): Promise<LedgerSummary> {
  const ref = doc(db, "metadata", "ledger_summary");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as LedgerSummary;
  }
  return recalculateLedgerSummary();
}

/**
 * Mendengarkan saldo kas global secara real-time.
 * Digunakan agar kartu saldo di UI langsung berganti saat ada transaksi kas baru dibuat/dihapus.
 */
export function subscribeLedgerSummary(onSummary: (summary: LedgerSummary) => void) {
  const ref = doc(db, "metadata", "ledger_summary");
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onSummary(snap.data() as LedgerSummary);
    } else {
      // Jika kosong, inisialisasi dengan hitung ulang
      const summary = await recalculateLedgerSummary();
      onSummary(summary);
    }
  });
}

/**
 * Menambahkan riwayat transaksi kas baru menggunakan FIRESTORE TRANSACTION.
 * Proses ini menjamin penulisan dokumen kas baru dan penambahan saldo global berjalan ATOMIK (bersamaan).
 * Jika salah satu gagal (misal: koneksi terputus di tengah jalan), seluruh operasi dibatalkan untuk menghindari selisih kas.
 */
export async function createLedgerEntry(payload: LedgerUpsert) {
  const colRef = collection(db, "ledger");
  const summaryRef = doc(db, "metadata", "ledger_summary");
  
  await runTransaction(db, async (transaction) => {
    const newDocRef = doc(colRef);
    const amount = Number(payload.jumlah || 0);
    const isMasuk = payload.tipe === "Masuk";
    
    // 1. Menulis dokumen transaksi baru
    transaction.set(newDocRef, {
      ...payload,
      jumlah: amount,
      createdAt: payload.createdAt ?? Date.now(),
    });
    
    // 2. Memperbarui total saldo global menggunakan increment atomik
    transaction.set(summaryRef, {
      totalMasuk: increment(isMasuk ? amount : 0),
      totalKeluar: increment(isMasuk ? 0 : amount),
      totalSaldo: increment(isMasuk ? amount : -amount),
      lastUpdated: Date.now(),
    }, { merge: true });
  });
}

/**
 * Memperbarui transaksi kas yang sudah ada menggunakan FIRESTORE TRANSACTION.
 * Menghitung selisih nominal baru & lama untuk menyesuaikan total saldo global secara atomik.
 */
export async function updateLedgerEntry(
  id: string,
  payload: Partial<LedgerUpsert>,
) {
  const docRef = doc(db, "ledger", id);
  const summaryRef = doc(db, "metadata", "ledger_summary");
  
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      throw new Error("Transaksi tidak ditemukan");
    }
    
    const oldData = snap.data();
    const oldAmount = Number(oldData.jumlah || 0);
    const oldIsMasuk = oldData.tipe === "Masuk";
    
    const newTipe = payload.tipe ?? oldData.tipe;
    const newAmount = payload.jumlah !== undefined ? Number(payload.jumlah || 0) : oldAmount;
    const newIsMasuk = newTipe === "Masuk";
    
    let diffMasuk = 0;
    let diffKeluar = 0;
    
    // 1. Membalikkan/mengurangi nilai lama dari akumulasi saldo global
    if (oldIsMasuk) {
      diffMasuk -= oldAmount;
    } else {
      diffKeluar -= oldAmount;
    }
    
    // 2. Menambahkan nilai baru ke dalam akumulasi saldo global
    if (newIsMasuk) {
      diffMasuk += newAmount;
    } else {
      diffKeluar += newAmount;
    }
    
    const diffSaldo = diffMasuk - diffKeluar;
    
    // 3. Update dokumen transaksi kas
    transaction.update(docRef, {
      ...payload,
      jumlah: newAmount,
    });
    
    // 4. Update ringkasan saldo global dengan nilai selisihnya
    transaction.set(summaryRef, {
      totalMasuk: increment(diffMasuk),
      totalKeluar: increment(diffKeluar),
      totalSaldo: increment(diffSaldo),
      lastUpdated: Date.now(),
    }, { merge: true });
  });
}

/**
 * Menghapus transaksi kas secara permanen menggunakan FIRESTORE TRANSACTION.
 * Otomatis mengurangi nominal transaksi yang terhapus dari ringkasan saldo kas global.
 */
export async function deleteLedgerEntry(id: string) {
  const docRef = doc(db, "ledger", id);
  const summaryRef = doc(db, "metadata", "ledger_summary");
  
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const amount = Number(data.jumlah || 0);
    const isMasuk = data.tipe === "Masuk";
    
    // 1. Menghapus dokumen kas
    transaction.delete(docRef);
    
    // 2. Mengurangi nilai total saldo global
    transaction.set(summaryRef, {
      totalMasuk: increment(isMasuk ? -amount : 0),
      totalKeluar: increment(isMasuk ? 0 : -amount),
      totalSaldo: increment(isMasuk ? -amount : amount),
      lastUpdated: Date.now(),
    }, { merge: true });
  });
}
