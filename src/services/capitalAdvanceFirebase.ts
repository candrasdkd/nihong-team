import { collection, getDocs, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { recordCapitalReturn, type CapitalReturnInput } from "./ledgerFirebase";

export type CapitalAdvance = {
  id: string;
  ledgerEntryIdKeluar: string;
  tanggalKeluar: string;
  jumlah: number;
  returnedAmount?: number;
  keterangan: string | null;
  status: "belum_kembali" | "sudah_kembali" | "dibatalkan";
  tanggalKembali?: string | null;
  ledgerEntryIdMasuk?: string | null;
  createdAt: number;
  updatedAt?: number;
};
function advanceQuery(status?: CapitalAdvance["status"]) {
  return query(collection(db, "capitalAdvances"), ...(status ? [where("status", "==", status)] : []), orderBy("tanggalKeluar", "desc"));
}
export async function fetchCapitalAdvances(status?: CapitalAdvance["status"]) {
  const snap = await getDocs(advanceQuery(status));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as CapitalAdvance));
}
export function subscribeCapitalAdvances(status: CapitalAdvance["status"] | undefined, onRows: (rows: CapitalAdvance[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(advanceQuery(status), snap => onRows(snap.docs.map(d => ({ ...d.data(), id: d.id } as CapitalAdvance))), onError);
}
/** The ledger service keeps the expense, partial return, audit and balance atomic. */
export async function returnCapitalAdvance(advanceId: string, input?: CapitalReturnInput) {
  return recordCapitalReturn(advanceId, input);
}
