import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type CapitalAdvance = {
  id: string;
  ledgerEntryIdKeluar: string;        // ref ke ledger doc (Keluar) asal
  tanggalKeluar: string;              // 'YYYY-MM-DD'
  jumlah: number;
  keterangan: string | null;
  status: "belum_kembali" | "sudah_kembali";
  tanggalKembali?: string | null;
  ledgerEntryIdMasuk?: string | null; // ref ke ledger doc (Masuk) saat balik
  createdAt: number;
  updatedAt?: number;
};

function mapAdvance(d: any): CapitalAdvance {
  const raw = d.data();
  return {
    id: d.id,
    ledgerEntryIdKeluar: raw.ledgerEntryIdKeluar,
    tanggalKeluar: raw.tanggalKeluar,
    jumlah: Number(raw.jumlah || 0),
    keterangan: raw.keterangan ?? null,
    status: raw.status,
    tanggalKembali: raw.tanggalKembali ?? null,
    ledgerEntryIdMasuk: raw.ledgerEntryIdMasuk ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function fetchCapitalAdvances(status?: CapitalAdvance["status"]) {
  const col = collection(db, "capitalAdvances");
  const constraints = status ? [where("status", "==", status)] : [];
  const qy = query(col, ...constraints, orderBy("tanggalKeluar", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map(mapAdvance);
}

export function subscribeCapitalAdvances(
  status: CapitalAdvance["status"] | undefined,
  onRows: (rows: CapitalAdvance[]) => void,
) {
  const col = collection(db, "capitalAdvances");
  const constraints = status ? [where("status", "==", status)] : [];
  const qy = query(col, ...constraints, orderBy("tanggalKeluar", "desc"));
  return onSnapshot(qy, (snap) => onRows(snap.docs.map(mapAdvance)));
}

/**
 * Tandai modal sudah kembali. Bikin ledger entry Masuk baru + update
 * saldo global + update status advance, semua dalam 1 transaction atomik.
 */
export async function returnCapitalAdvance(advanceId: string) {
  const advRef = doc(db, "capitalAdvances", advanceId);
  const ledgerColRef = collection(db, "ledger");
  const summaryRef = doc(db, "metadata", "ledger_summary");

  await runTransaction(db, async (transaction) => {
    const advSnap = await transaction.get(advRef);
    if (!advSnap.exists()) throw new Error("Modal tidak ditemukan");

    const adv = advSnap.data() as CapitalAdvance;
    if (adv.status === "sudah_kembali") {
      throw new Error("Modal ini sudah ditandai kembali sebelumnya");
    }

    const newLedgerRef = doc(ledgerColRef);
    const today = new Date().toISOString().slice(0, 10);

    // 1. Ledger entry baru (Masuk)
    transaction.set(newLedgerRef, {
      tanggal: today,
      tipe: "Masuk",
      kategori: "Pengembalian Modal",
      keterangan: `Pengembalian modal: ${adv.keterangan ?? "-"}`,
      metode: null,
      jumlah: adv.jumlah,
      catatan: null,
      createdAt: Date.now(),
    });

    // 2. Update saldo global
    transaction.set(summaryRef, {
      totalMasuk: increment(adv.jumlah),
      totalSaldo: increment(adv.jumlah),
      lastUpdated: Date.now(),
    }, { merge: true });

    // 3. Update status advance
    transaction.update(advRef, {
      status: "sudah_kembali",
      tanggalKembali: today,
      ledgerEntryIdMasuk: newLedgerRef.id,
      updatedAt: Date.now(),
    });
  });
}
