import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { Customer } from "../types";

const COL = "customer";

// ─── Listener Real-time ───────────────────────────────────────
export function listenCustomers(cb: (rows: Customer[]) => void) {
  const q = query(collection(db, COL), orderBy("nama"));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as DocumentData),
    })) as Customer[];
    cb(rows);
  });
}

// ─── CRUD ────────────────────────────────────────────────────
export async function addCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">,
) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data } as Customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, "id" | "createdAt">>,
) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, COL, id));
}
