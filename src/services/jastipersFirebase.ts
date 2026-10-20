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
  getCountFromServer,
  getDocsFromServer,
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Jastiper } from "../types";

// Nama koleksi Firestore untuk data Jastiper
const COL = "jastipers";

export type JastiperProfileFilter = "all" | "complete" | "needs";
export type JastiperPageCursor = QueryDocumentSnapshot<DocumentData>;

const isProfileComplete = (jastiper: Jastiper) =>
  Boolean(jastiper.noTelpon?.trim()) && Boolean(jastiper.alamat?.trim());

function matchesProfileFilter(jastiper: Jastiper, profileFilter: JastiperProfileFilter) {
  if (profileFilter === "complete") return isProfileComplete(jastiper);
  if (profileFilter === "needs") return !isProfileComplete(jastiper);
  return true;
}

function buildJastiperListQuery() {
  // Firestore uses the document ID as a stable tie-breaker for equal names.
  return query(collection(db, COL), orderBy("nama"));
}

/** Fetch one server page in stable name order, scanning candidates for profile filters. */
export async function getJastipersPage(
  profileFilter: JastiperProfileFilter = "all",
  pageSize = 15,
  cursor?: JastiperPageCursor,
) {
  const matches: Array<{ row: Jastiper; snapshot: JastiperPageCursor }> = [];
  let scanCursor = cursor;
  let exhausted = false;

  while (!exhausted && matches.length <= pageSize) {
    const constraints = [];
    if (scanCursor) constraints.push(startAfter(scanCursor));
    constraints.push(limit(pageSize + 1));
    const snapshot = await getDocsFromServer(query(buildJastiperListQuery(), ...constraints));

    if (snapshot.empty) {
      exhausted = true;
      break;
    }

    for (const item of snapshot.docs) {
      const row = { id: item.id, ...item.data() } as Jastiper;
      if (matchesProfileFilter(row, profileFilter)) matches.push({ row, snapshot: item });
      if (matches.length > pageSize) break;
    }

    scanCursor = snapshot.docs[snapshot.docs.length - 1];
    exhausted = snapshot.docs.length < pageSize + 1;
  }

  const hasMore = matches.length > pageSize;
  const pageMatches = matches.slice(0, pageSize);
  return {
    rows: pageMatches.map(({ row }) => row),
    cursor: hasMore ? pageMatches[pageMatches.length - 1]?.snapshot : undefined,
    hasMore,
  };
}

/** Full active profile scope for substring search, which Firestore cannot query directly. */
export async function fetchJastipers(profileFilter: JastiperProfileFilter = "all") {
  const snapshot = await getDocsFromServer(buildJastiperListQuery());
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Jastiper)
    .filter((jastiper) => matchesProfileFilter(jastiper, profileFilter));
}

/** Keep summary cards accurate without downloading the entire jastiper collection. */
export async function getJastiperMetrics() {
  const collectionRef = collection(db, COL);
  const [total, contact, complete] = await Promise.all([
    getCountFromServer(collectionRef),
    getCountFromServer(query(collectionRef, where("noTelpon", ">", ""))),
    getCountFromServer(query(
      collectionRef,
      where("noTelpon", ">", ""),
      where("alamat", ">", ""),
    )),
  ]);

  return {
    total: total.data().count,
    contact: contact.data().count,
    complete: complete.data().count,
  };
}

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
