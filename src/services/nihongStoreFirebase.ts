// src/services/nihongStoreFirebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  getDoc,
  getDocs,
  limit,
  type Firestore,
} from "firebase/firestore";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { db } from "../lib/firebase"; // Primary Firebase DB (nihong-4b93e: ERP & Internal Operations)
import {
  NihongStoreOrder,
  NihongStoreOrderStatus,
  NihongStoreItem,
  Customer,
  DepartureSchedule,
  PreOrder,
  PreOrderItem,
} from "../types";
import { adjustScheduleWeight } from "./schedulesFirebase";
import { formatDate } from "../utils/format";

export const COL_NIHONGSTORE = "nihongstore_orders";

// ===== Secondary Firebase Instance (nihongstore-6210b: Storefront & Customer Catalog) =====
const nihongStoreConfig = {
  apiKey: (import.meta as any).env?.VITE_NIHONGSTORE_API_KEY || "AIzaSyCv-4I0QEVRF2gtwulTzL2v6hNX4ytn7fA",
  authDomain: (import.meta as any).env?.VITE_NIHONGSTORE_AUTH_DOMAIN || "nihongstore-6210b.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_NIHONGSTORE_PROJECT_ID || "nihongstore-6210b",
  storageBucket: (import.meta as any).env?.VITE_NIHONGSTORE_STORAGE_BUCKET || "nihongstore-6210b.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_NIHONGSTORE_MESSAGING_SENDER_ID || "777940685146",
  appId: (import.meta as any).env?.VITE_NIHONGSTORE_APP_ID || "1:777940685146:web:2f32875bcf7e0ed0c32363",
};

const existingStoreApp = getApps().find((a) => a.name === "nihongStoreApp");
const storeApp: FirebaseApp = existingStoreApp || initializeApp(nihongStoreConfig, "nihongStoreApp");
export const storeDb: Firestore = getFirestore(storeApp);

/**
 * Memastikan sesi anonymous auth aktif di database nihongstore-6210b
 * sebelum menjalankan operasi baca/tulis.
 */
export async function ensureStoreAuth(): Promise<Auth> {
  const storeAuth = getAuth(storeApp);
  try {
    if (!storeAuth.currentUser) {
      await signInAnonymously(storeAuth);
    }
  } catch (e) {
    console.warn("[NihongStore Auth] Anonymous sign in notice:", e);
  }
  return storeAuth;
}

// Inisialisasi awal auth
ensureStoreAuth().catch(() => {});

/**
 * Mendengarkan pesanan NihongStore secara real-time dari database nihongstore-6210b.
 * Mendukung filter status ("inbox", "assigned", "rejected", atau "" untuk semua).
 */
export function listenNihongStoreOrders(
  statusFilter: string,
  cb: (rows: NihongStoreOrder[]) => void,
  limitCount: number = 50
) {
  let q = query(
    collection(storeDb, COL_NIHONGSTORE),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  if (statusFilter) {
    q = query(
      collection(storeDb, COL_NIHONGSTORE),
      where("status", "==", statusFilter),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id, // Pastikan ID dokumen Firestore selalu dipakai sebagai primary id
      })) as NihongStoreOrder[];
      cb(rows);
    },
    (err) => {
      console.warn("[NihongStore] Error in snapshot listener:", err);
      cb([]);
    }
  );
}

/**
 * Mendengarkan jumlah pesanan berstatus 'inbox' (belum di-assign) secara real-time
 * dari database nihongstore-6210b untuk notifikasi / badge di sidebar & menu.
 */
export function listenUnassignedNihongStoreCount(cb: (count: number) => void) {
  const q = query(
    collection(storeDb, COL_NIHONGSTORE),
    where("status", "==", "inbox")
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.size);
    },
    (err) => {
      console.warn("[NihongStore] Error in count listener:", err);
      cb(0);
    }
  );
}

/**
 * Memperbarui data pesanan NihongStore di database nihongstore-6210b.
 */
export async function updateNihongStoreOrder(
  id: string,
  data: Partial<Omit<NihongStoreOrder, "id" | "createdAt">>
) {
  await ensureStoreAuth();
  const docRef = doc(storeDb, COL_NIHONGSTORE, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
}

/**
 * Menyimpan pembaruan status ketersediaan item per produk (Tersedia vs Stok Habis)
 * tanpa menghapus pesanan. Otomatis menghitung ulang berat (Kg) & total harga aktif.
 */
export async function saveManagedOrderItems(
  orderId: string,
  updatedItems: NihongStoreItem[]
) {
  await ensureStoreAuth();
  const docRef = doc(storeDb, COL_NIHONGSTORE, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Pesanan tidak ditemukan");

  const order = snap.data() as NihongStoreOrder;

  const availableItems = updatedItems.filter(
    (it) => it.status !== "Stok habis" && it.status !== "Dibatalkan"
  );
  const oosItems = updatedItems.filter((it) => it.status === "Stok habis");

  const recalculatedTotalKg = Number(
    availableItems
      .reduce((sum, it) => sum + (it.beratKg || 0.3) * (it.jumlah || 1), 0)
      .toFixed(2)
  );

  const recalculatedTotalIdr = availableItems.reduce(
    (sum, it) => sum + (it.hargaIdr || 0) * (it.jumlah || 1),
    0
  );

  const allOutOfStock = availableItems.length === 0;
  const someOutOfStock = oosItems.length > 0 && !allOutOfStock;

  let timelineNote = "";
  if (allOutOfStock) {
    timelineNote = "Semua produk dalam pesanan ditandai Stok Habis di Jepang.";
  } else if (someOutOfStock) {
    const oosNames = oosItems.map((i) => i.namaBarang).join(", ");
    timelineNote = `Sebagian produk (${oosNames}) ditandai Stok Habis. Tagihan disesuaikan.`;
  } else {
    timelineNote = "Pembaruan ketersediaan produk titipan oleh tim Nihong Jastip.";
  }

  const newTimelineEntry = {
    status: allOutOfStock
      ? "Stok Habis"
      : someOutOfStock
      ? "Sebagian Stok Habis"
      : "Ketersediaan Diperbarui",
    note: timelineNote,
    at: new Date().toISOString(),
  };

  const currentTimeline = order.timeline || [];

  await updateDoc(docRef, {
    items: updatedItems,
    totalKg: recalculatedTotalKg || 0.5,
    totalEstimasiHargaIdr: recalculatedTotalIdr,
    displayStatus: allOutOfStock
      ? "Stok Habis"
      : someOutOfStock
      ? "Sebagian Stok Habis"
      : order.displayStatus || "Menunggu Cek Stok",
    timeline: [...currentTimeline, newTimelineEntry],
    updatedAt: Date.now(),
  });
}

/**
 * Menolak / Membatalkan pesanan NihongStore di database nihongstore-6210b.
 * Otomatis menambahkan riwayat status ke timeline untuk pelacakan customer.
 */
export async function rejectNihongStoreOrder(id: string, reason?: string) {
  await ensureStoreAuth();
  const docRef = doc(storeDb, COL_NIHONGSTORE, id);

  let currentTimeline: Array<{ status: string; note: string; at: string }> = [];
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      currentTimeline = snap.data().timeline || [];
    }
  } catch (e) {
    console.warn("Could not fetch existing timeline:", e);
  }

  const newTimelineEntry = {
    status: "Dibatalkan",
    note: reason && reason.trim()
      ? `Pesanan dibatalkan: ${reason.trim()}`
      : "Pesanan dibatalkan oleh admin/konsumen.",
    at: new Date().toISOString(),
  };

  const updatePayload: Record<string, any> = {
    status: "rejected" as NihongStoreOrderStatus,
    displayStatus: "Dibatalkan",
    timeline: [...currentTimeline, newTimelineEntry],
    updatedAt: Date.now(),
  };

  if (reason && reason.trim()) {
    updatePayload.catatan = `[Ditolak: ${reason.trim()}]`;
  }

  await updateDoc(docRef, updatePayload);
}

/**
 * Menghapus pesanan dari Inbox NihongStore secara permanen di database nihongstore-6210b.
 */
export async function deleteNihongStoreOrder(id: string) {
  await ensureStoreAuth();
  const docRef = doc(storeDb, COL_NIHONGSTORE, id);
  await deleteDoc(docRef);
}

/**
 * Sinkronisasi pembaruan status dan catatan linimasa dari tahapan operasional NihongTeam
 * ke dokumen pesanan customer di database nihongstore-6210b.
 */
export async function syncNihongStoreOrderStatusAndTimeline(
  nihongStoreOrderId: string,
  status: string,
  note: string,
  additionalFields?: Record<string, any>
) {
  if (!nihongStoreOrderId) return;
  try {
    await ensureStoreAuth();
    const docRef = doc(storeDb, COL_NIHONGSTORE, nihongStoreOrderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentTimeline = snap.data().timeline || [];
    const newTimelineEntry = {
      status,
      note,
      at: new Date().toISOString(),
    };

    await updateDoc(docRef, {
      displayStatus: status,
      ...additionalFields,
      timeline: [...currentTimeline, newTimelineEntry],
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to sync NihongStore order timeline:", err);
  }
}

/**
 * Memperbarui status custom dan status pembayaran pesanan NihongStore secara manual oleh admin,
 * serta menyisipkan catatan baru ke linimasa pelacakan customer.
 */
export async function updateNihongStoreCustomStatus(
  orderId: string,
  displayStatus: string,
  paymentStatus: string,
  statusCategory: NihongStoreOrderStatus,
  note?: string
) {
  await ensureStoreAuth();
  const docRef = doc(storeDb, COL_NIHONGSTORE, orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Pesanan tidak ditemukan");

  const order = snap.data() as NihongStoreOrder;
  const currentTimeline = order.timeline || [];

  const newTimelineEntry = {
    status: displayStatus,
    note: note && note.trim() ? note.trim() : `Status pesanan diubah menjadi: ${displayStatus}`,
    at: new Date().toISOString(),
  };

  await updateDoc(docRef, {
    status: statusCategory,
    displayStatus,
    paymentStatus,
    timeline: [...currentTimeline, newTimelineEntry],
    updatedAt: Date.now(),
  });
}

/**
 * Meng-assign satu pesanan NihongStore (dari nihongstore-6210b)
 * ke Jadwal Keberangkatan & Booking Pre-Order (di nihong-4b93e).
 */
export async function assignNihongStoreOrderToSchedule(
  order: NihongStoreOrder,
  scheduleId: string,
  options?: {
    customTotalKg?: number;
    customerId?: string;
    pic?: string;
    notes?: string;
  }
) {
  // 1. Ambil data Jadwal dari DB Internal (nihong-4b93e)
  const scheduleRef = doc(db, "departure_schedules", scheduleId);
  const scheduleSnap = await getDoc(scheduleRef);
  if (!scheduleSnap.exists()) {
    throw new Error("Jadwal Keberangkatan tidak ditemukan");
  }
  const schedule = scheduleSnap.data() as DepartureSchedule;

  // 2. Resolve Customer ID di DB Internal (nihong-4b93e)
  let customerId = options?.customerId || order.idPelanggan || "";
  let customerName = order.namaPelanggan;
  let customerPhone = order.noTelponPelanggan;

  if (!customerId) {
    const customersRef = collection(db, "customers");
    const qCust = query(customersRef, where("nama", "==", customerName));
    const snapCust = await getDocs(qCust);

    if (!snapCust.empty) {
      customerId = snapCust.docs[0].id;
    } else {
      const newCustRef = await addDoc(customersRef, {
        nama: customerName,
        telpon: customerPhone || "",
        alamat: order.alamatPelanggan || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      customerId = newCustRef.id;
    }
  }

  // Filter hanya item yang masih tersedia untuk didaftarkan ke jadwal belanja jastiper
  const availableItems = order.items.filter(
    (it) => it.status !== "Stok habis" && it.status !== "Dibatalkan"
  );
  const targetItems = availableItems.length > 0 ? availableItems : order.items;

  const defaultTotalKg = Number(
    targetItems
      .reduce((sum, it) => sum + (it.beratKg || 0.3) * (it.jumlah || 1), 0)
      .toFixed(2)
  );

  const totalKg = typeof options?.customTotalKg === "number"
    ? options.customTotalKg
    : (defaultTotalKg || order.totalKg || 0.5);

  // 3. Format items ke PreOrderItem
  const preOrderItems: PreOrderItem[] = targetItems.map((it) => {
    const qty = it.jumlah || 1;
    const details = [
      it.kodeBarang ? `[${it.kodeBarang}]` : "",
      it.warna ? `Warna: ${it.warna}` : "",
      it.ukuran ? `Size: ${it.ukuran}` : "",
      it.status === "Stok habis" ? "[STOK HABIS]" : "",
    ]
      .filter(Boolean)
      .join(" - ");

    return {
      namaBarang: `${it.namaBarang} (x${qty})${details ? ` (${details})` : ""}`,
      kategori: "NihongStore",
      catatan: it.catatan || "",
      checked: false,
    };
  });

  const orderNote = [
    `[NihongStore ${order.no || ""}]`.trim(),
    order.catatan || "",
    options?.notes || "",
  ]
    .filter(Boolean)
    .join(" ");

  // 4. Buat Pre-Order (Booking Jadwal) di DB Internal (nihong-4b93e)
  const newPreOrderPayload: Omit<PreOrder, "id" | "createdAt" | "updatedAt"> = {
    idJadwal: scheduleId,
    namaJastiper: schedule.namaJastiper,
    rute: schedule.rute,
    tanggalBerangkat: schedule.tanggalBerangkat,
    idPelanggan: customerId,
    namaPelanggan: customerName,
    noTelponPelanggan: customerPhone,
    pic: options?.pic || "",
    items: preOrderItems,
    totalKg,
    status: "Pending",
    catatan: orderNote,
    nihongStoreOrderId: order.id,
    nihongStoreOrderNo: order.no || order.id,
  };

  const preOrderDocRef = await addDoc(collection(db, "pre_orders"), {
    ...newPreOrderPayload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // 5. Update berat terpakai di Jadwal Keberangkatan (nihong-4b93e)
  await adjustScheduleWeight(scheduleId, totalKg);

  // 6. Update status pesanan NihongStore & linimasa di DB Store (nihongstore-6210b)
  await ensureStoreAuth();
  const orderDocRef = doc(storeDb, COL_NIHONGSTORE, order.id);

  let currentTimeline: Array<{ status: string; note: string; at: string }> = [];
  try {
    const curSnap = await getDoc(orderDocRef);
    if (curSnap.exists()) {
      currentTimeline = curSnap.data().timeline || [];
    }
  } catch (e) {
    console.warn("Could not read current timeline:", e);
  }

  const formattedBerangkat = formatDate(schedule.tanggalBerangkat);
  const newTimelineEntry = {
    status: "Dijadwalkan Handcarry",
    note: `Pesanan telah masuk ke Jadwal Handcarry ${schedule.rute} (Keberangkatan: ${formattedBerangkat}) oleh tim Nihong Jastip.`,
    at: new Date().toISOString(),
  };

  await updateDoc(orderDocRef, {
    status: "assigned" as NihongStoreOrderStatus,
    displayStatus: "Dijadwalkan Handcarry",
    paymentStatus: "DP Terverifikasi",
    assignedScheduleId: scheduleId,
    assignedScheduleRoute: schedule.rute,
    assignedScheduleDate: formattedBerangkat,
    assignedPreOrderId: preOrderDocRef.id,
    idPelanggan: customerId,
    timeline: [...currentTimeline, newTimelineEntry],
    updatedAt: Date.now(),
  });

  return {
    preOrderId: preOrderDocRef.id,
    scheduleId,
  };
}

/**
 * Melakukan assign batch beberapa pesanan sekaligus ke satu Jadwal Keberangkatan.
 */
export async function batchAssignNihongStoreOrdersToSchedule(
  orders: NihongStoreOrder[],
  scheduleId: string
) {
  const results = [];
  for (const ord of orders) {
    const res = await assignNihongStoreOrderToSchedule(ord, scheduleId);
    results.push(res);
  }
  return results;
}
