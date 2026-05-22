import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
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
  const cleanData = {
    ...data,
    nama: data.nama.toUpperCase().trim(),
  };
  const ref = await addDoc(collection(db, COL), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...cleanData } as Customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, "id" | "createdAt">>,
) {
  const cleanData = { ...data };
  if (cleanData.nama) {
    cleanData.nama = cleanData.nama.toUpperCase().trim();
  }
  await updateDoc(doc(db, COL, id), { ...cleanData, updatedAt: serverTimestamp() });
}

export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, COL, id));
}

// ─── Migration ────────────────────────────────────────────────
export async function migrateCustomersAndOrdersToUppercase() {
  // 1. Migrate Customers
  const customerCol = collection(db, COL);
  const customerSnap = await getDocs(customerCol);
  const customerPromises = customerSnap.docs.map((d) => {
    const data = d.data();
    const cleanNama = String(data.nama ?? "").toUpperCase().trim();
    if (data.nama !== cleanNama) {
      return updateDoc(doc(db, COL, d.id), {
        nama: cleanNama,
        updatedAt: serverTimestamp(),
      });
    }
    return Promise.resolve();
  });

  // 2. Migrate Orders
  const orderCol = collection(db, "orders");
  const orderSnap = await getDocs(orderCol);
  const orderPromises = orderSnap.docs.map((d) => {
    const data = d.data();
    const cleanNamaPelanggan = String(data.namaPelanggan ?? "").toUpperCase().trim();
    if (data.namaPelanggan !== cleanNamaPelanggan) {
      return updateDoc(doc(db, "orders", d.id), {
        namaPelanggan: cleanNamaPelanggan,
        updatedAt: serverTimestamp(),
      });
    }
    return Promise.resolve();
  });

  await Promise.all([...customerPromises, ...orderPromises]);
}
