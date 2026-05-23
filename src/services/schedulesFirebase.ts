// src/services/schedulesFirebase.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DepartureSchedule, ScheduleStatus } from "../types";

const COL = "departure_schedules";

/**
 * Mendengarkan daftar Jadwal Keberangkatan secara real-time.
 * Diurutkan berdasarkan tanggal keberangkatan terbaru.
 */
export function listenSchedules(cb: (rows: DepartureSchedule[]) => void) {
  const q = query(collection(db, COL), orderBy("tanggalBerangkat", "desc"));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as DepartureSchedule[];
    cb(rows);
  });
}

/**
 * Membuat Jadwal Keberangkatan baru.
 */
export async function addSchedule(
  data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">,
) {
  const payload = {
    ...data,
    beratTerpakai: 0, // Dimulai dari 0, akan terupdate saat Pre Order ditambahkan
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

/**
 * Memperbarui data Jadwal Keberangkatan.
 */
export async function updateSchedule(
  id: string,
  data: Partial<Omit<DepartureSchedule, "id" | "createdAt">>,
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Menghapus Jadwal Keberangkatan secara permanen.
 */
export async function deleteSchedule(id: string) {
  await deleteDoc(doc(db, COL, id));
}

/**
 * Memperbarui berat terpakai di Jadwal saat Pre Order dibuat/diubah/dihapus.
 * Menggunakan Firestore increment atomik agar tidak ada race condition.
 * 
 * @param scheduleId - ID Jadwal yang diperbarui
 * @param delta - Perubahan berat dalam Kg (positif = tambah, negatif = kurang)
 */
export async function adjustScheduleWeight(scheduleId: string, delta: number) {
  await updateDoc(doc(db, COL, scheduleId), {
    beratTerpakai: increment(delta),
    updatedAt: serverTimestamp(),
  });
}
