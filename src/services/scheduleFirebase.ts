// src/services/scheduleFirebase.ts
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { JadwalKeberangkatan, JadwalRute, JadwalStatus } from "../types";

const COL = "jadwal_keberangkatan";

function mapDoc(d: any): JadwalKeberangkatan {
  const raw = d.data();
  return {
    id: d.id,
    rute: raw.rute,
    tanggal: raw.tanggal,
    keterangan: raw.keterangan ?? null,
    status: raw.status ?? "open",
    createdAt: raw.createdAt ?? undefined,
  };
}

/** Real-time subscription. Returns unsubscribe function. */
export function subscribeSchedules(
  opts: { ruteFilter?: JadwalRute | ""; fromDate?: string } = {},
  onRows: (rows: JadwalKeberangkatan[]) => void
): () => void {
  const col = collection(db, COL);
  const constraints: any[] = [];

  if (opts.ruteFilter) constraints.push(where("rute", "==", opts.ruteFilter));
  if (opts.fromDate) constraints.push(where("tanggal", ">=", opts.fromDate));
  constraints.push(orderBy("tanggal", "asc"));

  const q = query(col, ...constraints);
  return onSnapshot(q, (snap) => onRows(snap.docs.map(mapDoc)));
}

export type JadwalUpsert = Omit<JadwalKeberangkatan, "id">;

export async function createSchedule(payload: JadwalUpsert) {
  const col = collection(db, COL);
  await addDoc(col, { ...payload, createdAt: Date.now() });
}

export async function updateSchedule(id: string, payload: Partial<JadwalUpsert>) {
  const ref = doc(db, COL, id);
  await updateDoc(ref, payload as any);
}

export async function deleteSchedule(id: string) {
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
}
