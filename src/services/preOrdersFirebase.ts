// src/services/preOrdersFirebase.ts
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
  increment,
  getDocs,
  getDoc,
  where,
  getDocsFromServer,
  getCountFromServer,
  startAfter,
  limit as qLimit,
  documentId,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PreOrder, PreOrderItem, PreOrderStatus } from "../types";
import { storeDb } from "./nihongStoreFirebase";

const COL = "pre_orders";

export type PreOrdersPageCursor = QueryDocumentSnapshot<DocumentData>;

function buildPreOrderListQuery(status?: string) {
  const constraints: QueryConstraint[] = [];
  if (status) constraints.push(where("status", "==", status));
  constraints.push(orderBy("createdAt", "desc"), orderBy(documentId(), "desc"));
  return constraints;
}

/** Fetch one server-backed booking page; a lookahead document determines hasMore. */
export async function getPreOrdersPage(
  status: string,
  pageSize = 15,
  cursor?: PreOrdersPageCursor,
) {
  const constraints = buildPreOrderListQuery(status);
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(qLimit(pageSize + 1));

  const snap = await getDocsFromServer(query(collection(db, COL), ...constraints));
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = snap.docs.slice(0, pageSize);
  return {
    rows: pageDocs.map((d) => ({ id: d.id, ...d.data() }) as PreOrder),
    hasMore,
    cursor: hasMore ? pageDocs[pageDocs.length - 1] : undefined,
  };
}

/** Full status-scoped booking set for explicitly requested substring searches. */
export async function fetchPreOrders(status?: string) {
  const snap = await getDocsFromServer(query(collection(db, COL), ...buildPreOrderListQuery(status)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PreOrder);
}

export async function getPreOrderCounts() {
  const [pending, selesai] = await Promise.all([
    getCountFromServer(query(collection(db, COL), where("status", "==", "Pending"), orderBy("createdAt", "desc"))),
    getCountFromServer(query(collection(db, COL), where("status", "==", "Selesai"), orderBy("createdAt", "desc"))),
  ]);
  return { pending: pending.data().count, selesai: selesai.data().count };
}

/**
 * Mendengarkan semua Pre Order secara real-time.
 * Diurutkan berdasarkan tanggal pembuatan terbaru.
 */
export function listenPreOrders(cb: (rows: PreOrder[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PreOrder[];
    cb(rows);
  });
}

/**
 * Mendengarkan Pre Order berdasarkan ID Jadwal tertentu.
 */
export function listenPreOrdersBySchedule(scheduleId: string, cb: (rows: PreOrder[]) => void) {
  const q = query(
    collection(db, COL),
    where("idJadwal", "==", scheduleId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PreOrder[];
    cb(rows);
  });
}

/**
 * Membuat Pre Order baru dan memperbarui berat terpakai di Jadwal secara atomik.
 * 
 * @param data - Data Pre Order baru tanpa ID dan timestamps.
 */
export async function addPreOrder(
  data: Omit<PreOrder, "id" | "createdAt" | "updatedAt">,
) {
  const totalKg = Number(data.totalKg ?? 0);
  if (!Number.isFinite(totalKg) || totalKg < 0) {
    throw new Error("Berat booking harus nol atau lebih");
  }

  const payload = {
    ...data,
    totalKg,
    status: "Pending" as PreOrderStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const ref = doc(collection(db, COL));
  const scheduleRef = doc(db, "departure_schedules", data.idJadwal);

  await runTransaction(db, async (transaction) => {
    const scheduleSnap = await transaction.get(scheduleRef);
    if (!scheduleSnap.exists()) throw new Error("Jadwal keberangkatan tidak ditemukan");

    transaction.set(ref, payload);
    transaction.update(scheduleRef, {
      beratTerpakai: increment(totalKg),
      updatedAt: serverTimestamp(),
    });
  });

  return ref.id;
}

/**
 * Memperbarui Pre Order. Menghitung selisih berat lama vs baru untuk re-sync Jadwal.
 */
export async function updatePreOrder(
  id: string,
  data: Partial<Omit<PreOrder, "id" | "createdAt">>,
) {
  const docRef = doc(db, COL, id);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("Pre Order tidak ditemukan");

    const oldData = snap.data() as PreOrder;
    const oldTotalKg = Number(oldData.totalKg || 0);
    const oldScheduleId = oldData.idJadwal;
    const newTotalKg = typeof data.totalKg === "number" ? data.totalKg : oldTotalKg;
    const newScheduleId = data.idJadwal || oldScheduleId;
    if (!Number.isFinite(newTotalKg) || newTotalKg < 0) {
      throw new Error("Berat booking harus nol atau lebih");
    }

    const oldScheduleRef = doc(db, "departure_schedules", oldScheduleId);
    const newScheduleRef = doc(db, "departure_schedules", newScheduleId);
    const oldScheduleSnap = await transaction.get(oldScheduleRef);
    const newScheduleSnap = oldScheduleId === newScheduleId
      ? oldScheduleSnap
      : await transaction.get(newScheduleRef);
    if (!oldScheduleSnap.exists() || !newScheduleSnap.exists()) {
      throw new Error("Jadwal booking tidak ditemukan");
    }

    transaction.update(docRef, {
      ...data,
      totalKg: newTotalKg,
      updatedAt: Date.now(),
    });

    // Status Pending/Selesai tidak mengubah kapasitas; hanya perubahan booking yang dihitung.
    if (oldScheduleId === newScheduleId) {
      const delta = newTotalKg - oldTotalKg;
      if (delta !== 0) {
        transaction.update(oldScheduleRef, {
          beratTerpakai: increment(delta),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      transaction.update(oldScheduleRef, {
        beratTerpakai: increment(-oldTotalKg),
        updatedAt: serverTimestamp(),
      });
      transaction.update(newScheduleRef, {
        beratTerpakai: increment(newTotalKg),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

/**
 * Menghapus Pre Order dan mengembalikan berat ke Jadwal Keberangkatan.
 */
export async function deletePreOrder(id: string) {
  const docRef = doc(db, COL, id);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as PreOrder;
    const scheduleRef = doc(db, "departure_schedules", data.idJadwal);
    const scheduleSnap = await transaction.get(scheduleRef);
    if (!scheduleSnap.exists()) throw new Error("Jadwal booking tidak ditemukan");

    transaction.delete(docRef);
    transaction.update(scheduleRef, {
      beratTerpakai: increment(-Number(data.totalKg || 0)),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Mengkonversi satu Pre Order menjadi satu Pesanan resmi (Order) di koleksi 'orders'.
 * 
 * Semua barang dalam Pre Order digabung menjadi satu Order:
 * - namaBarang = semua nama barang digabung dengan koma
 * - jumlahKg = total Kg seluruh items
 * - Harga (hargaJastip, ongkir, dll) perlu diisi admin saat konversi lewat OrderFormModal
 * 
 * Setelah konversi berhasil, status Pre Order berubah menjadi "Selesai".
 * 
 * @param preOrderId - ID Pre Order yang dikonversi
 * @param orderPayload - Data Order lengkap termasuk harga (diisi admin saat konversi)
 */
export async function convertPreOrderToOrder(
  preOrderId: string,
  orderPayload: Record<string, any>,
) {
  const totalPembayaran = Number(orderPayload.hargaJastipMarkup || 0) + Number(orderPayload.hargaOngkirMarkup || 0);
  const totalKeuntungan = totalPembayaran - Number(orderPayload.hargaJastip || 0) - Number(orderPayload.hargaOngkir || 0);
  const isJpy = orderPayload.tipeNominal === "JPY";
  const newOrderRef = doc(collection(db, "orders"));
  const preOrderRef = doc(db, COL, preOrderId);
  const monthKey = String(orderPayload.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
  const idPelanggan = String(orderPayload.idPelanggan || "");
  const summaryRef = doc(db, "orders_monthly_summaries", monthKey);

  const conversion = await runTransaction(db, async (transaction) => {
    const preOrderSnap = await transaction.get(preOrderRef);
    if (!preOrderSnap.exists()) throw new Error("Pre Order tidak ditemukan");
    const preOrderData = preOrderSnap.data() as PreOrder;

    if (preOrderData.status === "Selesai") {
      if (preOrderData.convertedOrderId) {
        return { orderId: preOrderData.convertedOrderId, created: false };
      }
      throw new Error("Pre Order sudah dipindahkan ke Pesanan");
    }

    // 1. Tulis dokumen Order baru
    transaction.set(newOrderRef, {
      ...orderPayload,
      totalPembayaran, totalKeuntungan, revision: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });

    // 2. Centang semua barang dan update status Pre Order menjadi "Selesai" secara atomik
    const updatedItems = (preOrderData.items || []).map((item) => ({
      ...item,
      checked: true,
    }));

    transaction.update(preOrderRef, {
      status: "Selesai" as PreOrderStatus,
      items: updatedItems,
      convertedOrderId: newOrderRef.id,
      updatedAt: Date.now(),
    });

    // beratTerpakai di jadwal TIDAK dikurangi saat pre-order dikonversi ke pesanan,
    // karena barang tetap ada dan kapasitas jadwal harus tetap terhitung.

    // 3. Update jumlah order bulanan di ringkasan (orderCount +1)
    transaction.set(summaryRef, {
      revenueIdr: increment(isJpy ? 0 : totalPembayaran),
      revenueJpy: increment(isJpy ? totalPembayaran : 0),
      profitIdr: increment(isJpy ? 0 : totalKeuntungan),
      profitJpy: increment(isJpy ? totalKeuntungan : 0),
      orderCount: increment(1)
    }, { merge: true });

    // 4. Update jumlah order milik customer terkait
    if (idPelanggan) {
      const customerRef = doc(db, "customer", idPelanggan);
      transaction.set(customerRef, {
        totalSpendIdr: increment(isJpy ? 0 : totalPembayaran),
        totalSpendJpy: increment(isJpy ? totalPembayaran : 0),
        orderCount: increment(1)
      }, { merge: true });
    }

    return { orderId: newOrderRef.id, created: true };
  });

  // 5. Sinkronkan status linimasa NihongStore jika PreOrder berasal dari NihongStore
  try {
    if (!conversion.created) return conversion.orderId;
    const preOrderSnap = await getDoc(preOrderRef);
    if (preOrderSnap.exists()) {
      const data = preOrderSnap.data() as PreOrder;
      if (data.nihongStoreOrderId) {
        const storeOrderRef = doc(storeDb, "nihongstore_orders", data.nihongStoreOrderId);
        const storeSnap = await getDoc(storeOrderRef);
        if (storeSnap.exists()) {
          const curTimeline = storeSnap.data().timeline || [];
          await updateDoc(storeOrderRef, {
            displayStatus: "Diproses di Jepang",
            assignedOrderId: conversion.orderId,
            timeline: [
              ...curTimeline,
              {
                status: "Diproses di Jepang",
                note: "Booking telah dikonversi menjadi pesanan resmi & sedang dibelanjakan oleh jastiper di Tokyo.",
                at: new Date().toISOString(),
              },
            ],
            updatedAt: Date.now(),
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not sync NihongStore timeline on preorder conversion:", err);
  }

  return conversion.orderId;
}

/**
 * Memeriksa dan memproses jadwal keberangkatan yang telah kadaluarsa.
 * Jadwal yang tanggal keberangkatannya < hari ini (lokal) akan ditutup,
 * dan pre-orders milik jadwal tersebut yang masih Pending akan dipindahkan ke Pesanan.
 */
export async function checkAndProcessExpiredSchedules() {
  const d = new Date();
  const todayYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // 🔒 Distributed Lock: Pastikan hanya berjalan sekali sehari di seluruh perangkat admin
  const cronRef = doc(db, "settings", "global");
  let shouldRun = false;

  await runTransaction(db, async (transaction) => {
    const cronSnap = await transaction.get(cronRef);
    const data = cronSnap.exists() ? cronSnap.data() : {};

    if (data.lastCronRunDate !== todayYmd) {
      shouldRun = true;
      transaction.set(cronRef, {
        lastCronRunDate: todayYmd,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  });

  if (!shouldRun) {
    console.log("[Auto-Close] Proses kadaluarsa sudah dijalankan hari ini oleh admin lain.");
    return { closed: 0, converted: 0 };
  }

  // 1. Ambil jadwal yang statusnya Open dan tanggalBerangkat < hari ini
  const schedulesRef = collection(db, "departure_schedules");
  const qSchedules = query(
    schedulesRef,
    where("status", "==", "Open"),
    where("tanggalBerangkat", "<", todayYmd)
  );

  const schedulesSnap = await getDocs(qSchedules);
  if (schedulesSnap.empty) return { closed: 0, converted: 0 };

  let closedCount = 0;
  let convertedCount = 0;

  for (const schDoc of schedulesSnap.docs) {
    const schId = schDoc.id;

    // Tutup jadwal
    await updateDoc(doc(db, "departure_schedules", schId), {
      status: "Closed",
      updatedAt: serverTimestamp(),
    });
    closedCount++;

    // 2. Cari pre-orders untuk jadwal ini yang masih Pending
    const preOrdersRef = collection(db, "pre_orders");
    const qPreOrders = query(
      preOrdersRef,
      where("idJadwal", "==", schId),
      where("status", "==", "Pending")
    );
    const preOrdersSnap = await getDocs(qPreOrders);

    for (const poDoc of preOrdersSnap.docs) {
      const poId = poDoc.id;
      const poData = poDoc.data() as PreOrder;
      const namaBarang = poData.items.map((i) => i.namaBarang).join("\n");

      await convertPreOrderToOrder(poId, {
        no: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tanggal: todayYmd,
        idPelanggan: poData.idPelanggan,
        namaPelanggan: poData.namaPelanggan,
        namaBarang,
        kategori: "",
        pengiriman: poData.rute,
        jumlahKg: poData.totalKg,
        kgCeil: Math.ceil(poData.totalKg),
        hargaJastip: 0,
        hargaJastipMarkup: 0,
        hargaOngkir: 0,
        hargaOngkirMarkup: 0,
        totalPembayaran: 0,
        totalKeuntungan: 0,
        status: "Belum Membayar",
        catatan: poData.catatan || "",
      });
      convertedCount++;
    }
  }

  return { closed: closedCount, converted: convertedCount };
}
