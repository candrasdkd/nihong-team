// src/services/customersFirebase.ts
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

// Nama koleksi di Firestore untuk menyimpan data pelanggan
const COL = "customer";

/**
 * Mendengarkan data pelanggan secara real-time dari Firestore.
 * Data diurutkan berdasarkan alfabet nama pelanggan (A-Z).
 * 
 * @param cb - Callback function yang menerima list data pelanggan terupdate.
 */
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

/**
 * Menambahkan data pelanggan baru ke Firestore.
 * Nama pelanggan otomatis dikonversi menjadi HURUF KAPITAL (Uppercase) untuk standarisasi pencarian.
 * 
 * @param data - Object data pelanggan tanpa field ID dan timestamps.
 */
export async function addCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">,
) {
  const cleanData = {
    ...data,
    nama: data.nama.toUpperCase().trim(), // Standarisasi nama agar seragam
  } as any;

  // Hapus properti bernilai undefined agar tidak menyebabkan error di Firestore
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });

  const ref = await addDoc(collection(db, COL), {
    ...cleanData,
    createdAt: serverTimestamp(), // Menggunakan timestamp server agar presisi
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...cleanData } as Customer;
}

/**
 * Memperbarui data profil pelanggan yang sudah ada di Firestore.
 * 
 * @param id - ID dokumen pelanggan yang akan diperbarui.
 * @param data - Data parsial pelanggan yang diubah.
 */
export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, "id" | "createdAt">>,
) {
  const cleanData = { ...data } as any;
  if (cleanData.nama) {
    cleanData.nama = cleanData.nama.toUpperCase().trim();
  }

  // Hapus properti bernilai undefined agar tidak menyebabkan error di Firestore
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });

  await updateDoc(doc(db, COL, id), { ...cleanData, updatedAt: serverTimestamp() });
}

/**
 * Menghapus data pelanggan dari database Firestore.
 * 
 * @param id - ID dokumen pelanggan yang akan dihapus.
 */
export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, COL, id));
}

/**
 * Utilitas Migrasi Data untuk mengubah semua nama pelanggan (customer)
 * dan nama pelanggan di data pesanan (orders) menjadi HURUF KAPITAL.
 * Berguna untuk menstandarkan data lama yang diinput sebelum standarisasi huruf kapital diterapkan.
 */
export async function migrateCustomersAndOrdersToUppercase() {
  // 1. Migrasi Koleksi Customer
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

  // 2. Migrasi Koleksi Orders (Nama pelanggan di order juga disesuaikan)
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

  // Menjalankan semua proses migrasi secara paralel
  await Promise.all([...customerPromises, ...orderPromises]);
}
