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
  where,
  startAfter,
  limit as qLimit,
  documentId,
  getDocsFromServer,
  getCountFromServer,
  serverTimestamp,
  runTransaction,
  increment,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DepartureSchedule, ScheduleStatus } from "../types";

const COL = "departure_schedules";

export type SchedulesPageCursor = QueryDocumentSnapshot<DocumentData>;

export type SchedulesPageFilters = {
  status?: string;
};

function addScheduleFilters(constraints: QueryConstraint[], filters: SchedulesPageFilters) {
  if (filters.status) constraints.push(where("status", "==", filters.status));
}

function toSchedule(docSnap: { id: string; data: () => DocumentData }): DepartureSchedule {
  return { ...(docSnap.data() as DepartureSchedule), id: docSnap.id };
}

/** Fetch one server-backed page in departure-date order with an ID tie-breaker. */
export async function getSchedulesPage(
  filters: SchedulesPageFilters = {},
  pageSize = 15,
  cursor?: SchedulesPageCursor,
) {
  const constraints: QueryConstraint[] = [];
  addScheduleFilters(constraints, filters);
  constraints.push(orderBy("tanggalBerangkat", "asc"), orderBy(documentId(), "asc"));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(qLimit(pageSize + 1));

  const snap = await getDocsFromServer(query(collection(db, COL), ...constraints));
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = snap.docs.slice(0, pageSize);
  return {
    rows: pageDocs.map(toSchedule),
    hasMore,
    cursor: hasMore ? pageDocs[pageDocs.length - 1] : undefined,
  };
}

/** Full filtered set for the explicitly requested substring search only. */
export async function fetchSchedules(filters: SchedulesPageFilters = {}) {
  const constraints: QueryConstraint[] = [];
  addScheduleFilters(constraints, filters);
  constraints.push(orderBy("tanggalBerangkat", "asc"), orderBy(documentId(), "asc"));
  const snap = await getDocsFromServer(query(collection(db, COL), ...constraints));
  return snap.docs.map(toSchedule);
}

export async function getScheduleCount(filters: SchedulesPageFilters = {}) {
  const constraints: QueryConstraint[] = [];
  addScheduleFilters(constraints, filters);
  // Match the paged list's orderBy scope (documents without this field are not listed).
  constraints.push(orderBy("tanggalBerangkat", "asc"));
  const snap = await getCountFromServer(query(collection(db, COL), ...constraints));
  return snap.data().count;
}

/**
 * Mendengarkan daftar Jadwal Keberangkatan secara real-time.
 * Diurutkan berdasarkan tanggal keberangkatan terdekat (ascending).
 */
export function listenSchedules(cb: (rows: DepartureSchedule[]) => void) {
  const q = query(collection(db, COL), orderBy("tanggalBerangkat", "asc"));
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

/**
 * Menyetel ulang berat terpakai dari total booking aktual.
 * Dipakai untuk memperbaiki data lama yang pernah melepas slot saat status menjadi Selesai.
 */
export async function setScheduleUsedWeight(scheduleId: string, totalKg: number) {
  await updateDoc(doc(db, COL, scheduleId), {
    beratTerpakai: Math.max(0, Number(totalKg) || 0),
    updatedAt: serverTimestamp(),
  });
}
