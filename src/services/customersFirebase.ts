// src/services/customersFirebase.ts
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  QueryConstraint,
  QueryDocumentSnapshot,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { Customer } from "../types";

// Nama koleksi di Firestore untuk menyimpan data pelanggan
const COL = "customer";
const CUSTOMER_NAME_SEARCH_FIELD = "namaSearchSubstrings";
const CUSTOMER_MIGRATION_PAGE_SIZE = 400;

/** Store each normalized name substring so Firestore can do case-insensitive contains search. */
function buildNameSearchSubstrings(name: string): string[] {
  const characters = Array.from(name.trim().toUpperCase());
  const substrings = new Set<string>();

  for (let start = 0; start < characters.length; start += 1) {
    for (let end = start + 1; end <= characters.length; end += 1) {
      substrings.add(characters.slice(start, end).join(""));
    }
  }

  return [...substrings];
}

export type CustomerProfileFilter = "all" | "wa" | "complete";

export interface CustomerPageOptions {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData>;
  search?: string;
  profileFilter?: CustomerProfileFilter;
}

export interface CustomerPageResult {
  rows: Customer[];
  cursor?: QueryDocumentSnapshot<DocumentData>;
  hasMore: boolean;
}

/** Load a single customer page. Search matches any case-insensitive name substring. */
export async function getCustomersPage({
  pageSize = 15,
  cursor,
  search = "",
  profileFilter = "all",
}: CustomerPageOptions = {}): Promise<CustomerPageResult> {
  const constraints: QueryConstraint[] = [];
  const keyword = search.trim().toUpperCase();

  if (profileFilter === "wa" || profileFilter === "complete") {
    constraints.push(where("telpon", ">", ""));
  }
  if (profileFilter === "complete") {
    constraints.push(where("alamat", ">", ""));
  }
  if (keyword) {
    constraints.push(where(CUSTOMER_NAME_SEARCH_FIELD, "array-contains", keyword));
  }

  // Inequality filters must lead the ordering; name is the final stable sort.
  if (profileFilter === "complete") {
    constraints.push(orderBy("telpon"), orderBy("alamat"), orderBy("nama"));
  } else if (profileFilter === "wa") {
    constraints.push(orderBy("telpon"), orderBy("nama"));
  } else {
    constraints.push(orderBy("nama"));
  }

  if (cursor) constraints.push(startAfter(cursor));
  // Fetch one look-ahead document so the UI can disable Next on the last page.
  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, COL), ...constraints));
  const pageDocs = snapshot.docs.slice(0, pageSize);
  return {
    rows: pageDocs.map((item) => ({ ...item.data(), id: item.id }) as Customer),
    cursor: pageDocs[pageDocs.length - 1],
    hasMore: snapshot.docs.length > pageSize,
  };
}

/** Aggregate counts keep the CRM summary accurate without downloading every customer. */
export async function getCustomerMetrics() {
  const customers = collection(db, COL);
  const [total, wa, complete] = await Promise.all([
    getCountFromServer(customers),
    getCountFromServer(query(customers, where("telpon", ">", ""))),
    getCountFromServer(query(
      customers,
      where("telpon", ">", ""),
      where("alamat", ">", ""),
    )),
  ]);

  return {
    total: total.data().count,
    wa: wa.data().count,
    complete: complete.data().count,
  };
}

/** Check duplicate names in Firestore, independent of the currently loaded page. */
export async function customerNameExists(name: string, excludeId?: string) {
  const normalizedName = name.trim().toUpperCase();
  if (!normalizedName) return false;

  const snapshot = await getDocs(query(
    collection(db, COL),
    where("nama", "==", normalizedName),
    limit(2),
  ));
  return snapshot.docs.some((item) => item.id !== excludeId);
}

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
  cleanData[CUSTOMER_NAME_SEARCH_FIELD] = buildNameSearchSubstrings(cleanData.nama);

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
    cleanData[CUSTOMER_NAME_SEARCH_FIELD] = buildNameSearchSubstrings(cleanData.nama);
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
 * Menghapus data alamat pengiriman (Jepang atau Indonesia) dari profil pelanggan.
 *
 * @param id - ID dokumen pelanggan.
 * @param country - Negara tujuan pengiriman yang akan dihapus: 'japan' atau 'indonesia'.
 */
export async function clearCustomerDeliveryAddress(
  id: string,
  country: "japan" | "indonesia",
) {
  const field =
    country === "japan"
      ? "alamatPengirimanJepang"
      : "alamatPengirimanIndonesia";
  await updateDoc(doc(db, COL, id), {
    [field]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Utilitas Migrasi Data untuk mengubah semua nama pelanggan (customer)
 * dan nama pelanggan di data pesanan (orders) menjadi HURUF KAPITAL.
 * Berguna untuk menstandarkan data lama yang diinput sebelum standarisasi huruf kapital diterapkan.
 */
export async function migrateCustomersAndOrdersToUppercase() {
  // 1. Migrasi Koleksi Customer
  const customerCol = collection(db, COL);
  let customerCursor: QueryDocumentSnapshot<DocumentData> | undefined;
  let hasMoreCustomers = true;

  while (hasMoreCustomers) {
    const constraints: QueryConstraint[] = [orderBy(documentId()), limit(CUSTOMER_MIGRATION_PAGE_SIZE)];
    if (customerCursor) constraints.push(startAfter(customerCursor));

    const customerSnap = await getDocs(query(customerCol, ...constraints));
    if (customerSnap.empty) break;

    const batch = writeBatch(db);
    let customerUpdateCount = 0;
    customerSnap.docs.forEach((customerDoc) => {
      const data = customerDoc.data();
      const cleanNama = String(data.nama ?? "").toUpperCase().trim();
      const searchSubstrings = buildNameSearchSubstrings(cleanNama);
      const existingSearchSubstrings = data[CUSTOMER_NAME_SEARCH_FIELD];
      const searchIndexIsCurrent = Array.isArray(existingSearchSubstrings)
        && existingSearchSubstrings.length === searchSubstrings.length
        && searchSubstrings.every((value, index) => existingSearchSubstrings[index] === value);

      if (data.nama === cleanNama && searchIndexIsCurrent) return;

      batch.update(customerDoc.ref, {
        nama: cleanNama,
        [CUSTOMER_NAME_SEARCH_FIELD]: searchSubstrings,
        ...(data.nama !== cleanNama ? { updatedAt: serverTimestamp() } : {}),
      });
      customerUpdateCount += 1;
    });
    if (customerUpdateCount > 0) await batch.commit();

    customerCursor = customerSnap.docs[customerSnap.docs.length - 1];
    hasMoreCustomers = customerSnap.size === CUSTOMER_MIGRATION_PAGE_SIZE;
  }

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

  await Promise.all(orderPromises);
}
