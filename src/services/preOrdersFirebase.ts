// src/services/preOrdersFirebase.ts
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
  runTransaction,
  increment,
  getDocs,
  getDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PreOrder, PreOrderItem, PreOrderStatus } from "../types";
import { adjustScheduleWeight } from "./schedulesFirebase";

const COL = "pre_orders";

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
  const totalKg = data.items.reduce((sum, item) => sum + Number(item.jumlahKg || 0), 0);

  const payload = {
    ...data,
    totalKg,
    status: data.status || "Pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const ref = await addDoc(collection(db, COL), payload);

  // Update berat terpakai di Jadwal Keberangkatan
  await adjustScheduleWeight(data.idJadwal, totalKg);

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
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Pre Order tidak ditemukan");

  const oldData = snap.data() as PreOrder;
  const oldTotalKg = Number(oldData.totalKg || 0);
  const oldScheduleId = oldData.idJadwal;

  // Hitung totalKg baru jika ada perubahan items
  let newTotalKg = oldTotalKg;
  if (data.items) {
    newTotalKg = data.items.reduce((sum, item) => sum + Number(item.jumlahKg || 0), 0);
  }

  await updateDoc(docRef, {
    ...data,
    totalKg: newTotalKg,
    updatedAt: Date.now(),
  });

  // Sesuaikan berat terpakai di Jadwal
  const newScheduleId = data.idJadwal || oldScheduleId;
  if (newScheduleId === oldScheduleId) {
    // Jadwal sama, hanya sesuaikan selisih berat
    const delta = newTotalKg - oldTotalKg;
    if (delta !== 0) await adjustScheduleWeight(oldScheduleId, delta);
  } else {
    // Pindah jadwal: kurangi berat dari jadwal lama, tambah ke jadwal baru
    await adjustScheduleWeight(oldScheduleId, -oldTotalKg);
    await adjustScheduleWeight(newScheduleId, newTotalKg);
  }
}

/**
 * Menghapus Pre Order dan mengembalikan berat ke Jadwal Keberangkatan.
 */
export async function deletePreOrder(id: string) {
  const docRef = doc(db, COL, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as PreOrder;
  await deleteDoc(docRef);

  // Rollback berat ke Jadwal
  await adjustScheduleWeight(data.idJadwal, -Number(data.totalKg || 0));
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
  const newOrderRef = doc(collection(db, "orders"));
  const preOrderRef = doc(db, COL, preOrderId);
  const monthKey = String(orderPayload.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
  const idPelanggan = String(orderPayload.idPelanggan || "");
  const summaryRef = doc(db, "orders_monthly_summaries", monthKey);

  await runTransaction(db, async (transaction) => {
    // 1. Tulis dokumen Order baru
    transaction.set(newOrderRef, {
      ...orderPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Update status Pre Order menjadi "Selesai" secara atomik
    transaction.update(preOrderRef, {
      status: "Selesai" as PreOrderStatus,
      convertedOrderId: newOrderRef.id,
      updatedAt: Date.now(),
    });

    // 3. Update jumlah order bulanan di ringkasan (orderCount +1)
    transaction.set(summaryRef, {
      revenueIdr: increment(0),
      revenueJpy: increment(0),
      profitIdr: increment(0),
      profitJpy: increment(0),
      orderCount: increment(1)
    }, { merge: true });

    // 4. Update jumlah order milik customer terkait
    if (idPelanggan) {
      const customerRef = doc(db, "customers", idPelanggan);
      transaction.set(customerRef, {
        totalSpendIdr: increment(0),
        totalSpendJpy: increment(0),
        orderCount: increment(1)
      }, { merge: true });
    }
  });

  return newOrderRef.id;
}
