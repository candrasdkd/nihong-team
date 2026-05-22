// src/services/ordersFirebase.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  WithFieldValue,
  where,
  type Unsubscribe,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { OrderDoc, OrderStatus, SubscribeOpts } from "../types";
import {
  computeDerived,
  endOfMonth,
  normalizeTanggalString,
  startOfMonth,
  toInputDate,
} from "../utils/helpers";

const ORDERS = collection(db, "orders");

// Normalize + compute before write
function prepareForWrite(
  raw: Partial<OrderDoc>,
  unitPrice: number,
): WithFieldValue<DocumentData> {
  const d = computeDerived(raw, unitPrice);
  return {
    no: String(raw.no ?? ""),
    tanggal: normalizeTanggalString(raw.tanggal ?? ""),
    idPelanggan: String(raw.idPelanggan ?? ""),
    namaPelanggan: String(raw.namaPelanggan ?? "").toUpperCase().trim(),
    namaBarang: String(raw.namaBarang ?? ""),
    kategori: String(raw.kategori ?? ""),
    pengiriman: raw.pengiriman ?? "",
    jumlahKg: Number(raw.jumlahKg ?? 0),
    kgCeil: d.kgCeil,
    hargaJastip: Number(raw.hargaJastip ?? 0),
    hargaJastipMarkup: Number(raw.hargaJastipMarkup ?? 0),
    hargaOngkir: d.baseOngkir,
    hargaOngkirMarkup: Number(raw.hargaOngkirMarkup ?? 0),
    totalPembayaran: d.totalPembayaran,
    totalKeuntungan: d.totalKeuntungan,
    status: String(raw.status ?? "Belum Membayar"),
    catatan: raw.catatan ?? "",
    tipeNominal: raw.tipeNominal ?? "IDR",
    imageUrl: raw.imageUrl ?? "",
    updatedAt: serverTimestamp(),
    // createdAt di-set saat create
  };
}

// ---- CRUD -----------------------------------------------------------------
export async function createOrder(raw: Partial<OrderDoc>, unitPrice: number) {
  const payload = prepareForWrite(raw, unitPrice);
  (payload as any).createdAt = serverTimestamp();
  const ref = await addDoc(ORDERS, payload);
  return ref.id;
}

export async function updateOrder(
  id: string,
  raw: Partial<OrderDoc>,
  unitPrice: number,
) {
  console.log("raw", raw);

  const ref = doc(db, "orders", id);
  const payload = prepareForWrite(raw, unitPrice);
  await updateDoc(ref, payload);
}

export async function upsertOrder(
  id: string | undefined,
  raw: Partial<OrderDoc>,
  unitPrice: number,
) {
  if (!id) return createOrder(raw, unitPrice);
  const ref = doc(db, "orders", id);
  const payload = prepareForWrite(raw, unitPrice);
  await setDoc(
    ref,
    { ...payload, createdAt: serverTimestamp() },
    { merge: true },
  );
  return id;
}

export async function deleteOrder(id: string) {
  const ref = doc(db, "orders", id);
  await deleteDoc(ref);
}

// ---- Realtime subscription -------------------------------------------------

// Overload: kompatibel lama (tanpa opts) & baru (dengan opts)
export function subscribeOrders(cb: (rows: OrderDoc[]) => void): Unsubscribe;
export function subscribeOrders(
  opts: SubscribeOpts,
  cb: (rows: OrderDoc[]) => void,
): Unsubscribe;
export function subscribeOrders(
  optsOrCb: SubscribeOpts | ((rows: OrderDoc[]) => void),
  maybeCb?: (rows: OrderDoc[]) => void,
): Unsubscribe {
  const now = new Date();
  const defaultFrom = toInputDate(
    startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
  );
  const defaultTo = toInputDate(endOfMonth(now));

  const hasOpts = typeof optsOrCb === "object";
  const cb = (hasOpts ? maybeCb : optsOrCb) as (rows: OrderDoc[]) => void;

  const {
    q, // tidak dipakai di server-side
    status,
    fromInput = defaultFrom,
    toInput = defaultTo,
    sort = "desc",
    limit = 250,
  } = (hasOpts ? (optsOrCb as SubscribeOpts) : {}) as SubscribeOpts;

  const cons: QueryConstraint[] = [];

  // Filter status (opsional)
  if (status) cons.push(where("status", "==", status));

  // Filter tanggal (inklusif): gunakan lexicographic range di 'yyyy-MM-dd'
  if (fromInput) cons.push(where("tanggal", ">=", fromInput));
  if (toInput) cons.push(where("tanggal", "<=", toInput));

  // Urutkan berdasarkan tanggal (harus orderBy field yang sama dengan range)
  cons.push(orderBy("tanggal", sort));

  // Batas hasil
  if (Number.isFinite(limit)) cons.push(qLimit(limit));

  const qy = query(ORDERS, ...cons);
  return onSnapshot(qy, (snap) => {
    const rows: OrderDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as OrderDoc),
    }));
    cb(rows);
  });
}

// ---- Pagination (manual fetch) --------------------------------------------
export async function getOrdersPage(pageSize = 25, cursor?: any) {
  const q1 = cursor
    ? query(
      ORDERS,
      orderBy("tanggal", "desc"),
      startAfter(cursor),
      qLimit(pageSize),
    )
    : query(ORDERS, orderBy("tanggal", "desc"), qLimit(pageSize));

  const snap = await getDocs(q1);
  const rows: OrderDoc[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as OrderDoc),
  }));
  const last =
    snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return { rows, cursor: last };
}

// ---- Adapters: Firestore <-> your existing UI types -----------------------
export type ExtendedOrder = OrderDoc & {
  // alias utk konsistensi UI
  tanggal?: string;
  namaPelanggan?: string;
};

export function toExtended(doc: OrderDoc): ExtendedOrder {
  return {
    ...doc,
    tanggal: doc.tanggal,
    namaPelanggan: doc.namaPelanggan,
  };
}

export function fromExtended(ui: ExtendedOrder): OrderDoc {
  return {
    id: ui.id,
    no: ui.no,
    tanggal: ui.tanggal ?? "",
    idPelanggan: ui.idPelanggan,
    namaPelanggan: ui.namaPelanggan ?? "",
    namaBarang: ui.namaBarang,
    kategori: ui.kategori,
    pengiriman: ui.pengiriman,
    jumlahKg: ui.jumlahKg,
    kgCeil: ui.kgCeil ?? (Math.ceil(Number(ui.jumlahKg ?? 0) * 2) / 2),
    hargaJastip: ui.hargaJastip,
    hargaJastipMarkup: ui.hargaJastipMarkup,
    hargaOngkir: ui.hargaOngkir,
    hargaOngkirMarkup: ui.hargaOngkirMarkup,
    totalPembayaran: ui.totalPembayaran,
    totalKeuntungan: ui.totalKeuntungan,
    status: ui.status as OrderStatus,
    catatan: ui.catatan,
    tipeNominal: ui.tipeNominal,
    imageUrl: ui.imageUrl,
  };
}

export async function addTipeNominalToAllOrders(tipeNominal: string) {
  const snap = await getDocs(ORDERS);

  const promises: Promise<void>[] = [];

  snap.forEach((d) => {
    const ref = doc(db, "orders", d.id);

    promises.push(
      updateDoc(ref, {
        tipeNominal,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  await Promise.all(promises);

  console.log(`✔ ${snap.size} orders berhasil ditambahkan tipeNominal`);
}
