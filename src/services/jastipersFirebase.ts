// src/services/jastipersFirebase.ts
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
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Jastiper } from "../types";

// Nama koleksi Firestore untuk data Jastiper
const COL = "jastipers";

/**
 * Mendengarkan daftar Jastiper secara real-time dari Firestore.
 * Diurutkan berdasarkan alfabet nama.
 */
export function listenJastipers(cb: (rows: Jastiper[]) => void) {
  const q = query(collection(db, COL), orderBy("nama"));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Jastiper[];
    cb(rows);
  });
}

/**
 * Menambahkan data Jastiper baru ke Firestore.
 * Nama dikonversi menjadi HURUF KAPITAL untuk konsistensi.
 */
export async function addJastiper(
  data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">,
) {
  const payload = {
    ...data,
    nama: data.nama.toUpperCase().trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

/**
 * Memperbarui data profil Jastiper yang sudah ada.
 */
export async function updateJastiper(
  id: string,
  data: Partial<Omit<Jastiper, "id" | "createdAt">>,
) {
  const payload: any = { ...data, updatedAt: serverTimestamp() };
  if (payload.nama) {
    payload.nama = payload.nama.toUpperCase().trim();
  }
  await updateDoc(doc(db, COL, id), payload);
}

/**
 * Menghapus data Jastiper secara permanen dari database.
 */
export async function deleteJastiper(id: string) {
  await deleteDoc(doc(db, COL, id));
}
