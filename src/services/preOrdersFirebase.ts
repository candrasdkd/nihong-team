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
  const totalKg = Number(data.totalKg) || 0;

  const payload = {
    ...data,
    totalKg,
    status: data.status || "Pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const ref = await addDoc(collection(db, COL), payload);

  // Update berat terpakai di Jadwal Keberangkatan (hanya jika aktif/Pending)
  if (payload.status === "Pending") {
    await adjustScheduleWeight(data.idJadwal, totalKg);
  }

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
  const oldStatus = oldData.status;

  // Hitung totalKg baru jika ada perubahan items
  const newTotalKg = typeof data.totalKg === "number" ? data.totalKg : oldTotalKg;
  const newStatus = data.status || oldStatus;
  const newScheduleId = data.idJadwal || oldScheduleId;

  await updateDoc(docRef, {
    ...data,
    totalKg: newTotalKg,
    updatedAt: Date.now(),
  });

  // Hitung kontribusi berat ke jadwal
  const oldContribution = oldStatus === "Pending" ? oldTotalKg : 0;
  const newContribution = newStatus === "Pending" ? newTotalKg : 0;

  // Sesuaikan berat terpakai di Jadwal
  if (newScheduleId === oldScheduleId) {
    const delta = newContribution - oldContribution;
    if (delta !== 0) await adjustScheduleWeight(oldScheduleId, delta);
  } else {
    if (oldContribution > 0) await adjustScheduleWeight(oldScheduleId, -oldContribution);
    if (newContribution > 0) await adjustScheduleWeight(newScheduleId, newContribution);
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

  // Rollback berat ke Jadwal (hanya jika aktif/Pending)
  if (data.status === "Pending") {
    await adjustScheduleWeight(data.idJadwal, -Number(data.totalKg || 0));
  }
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
    const preOrderSnap = await transaction.get(preOrderRef);
    if (!preOrderSnap.exists()) throw new Error("Pre Order tidak ditemukan");
    const preOrderData = preOrderSnap.data() as PreOrder;

    if (preOrderData.status === "Selesai") {
      throw new Error("Pre Order sudah dipindahkan ke Pesanan");
    }

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

    // Sesuaikan berat terpakai di Jadwal Keberangkatan jika pre-order tadinya Pending
    if (preOrderData.status === "Pending") {
      const scheduleRef = doc(db, "departure_schedules", preOrderData.idJadwal);
      transaction.update(scheduleRef, {
        beratTerpakai: increment(-Number(preOrderData.totalKg || 0)),
        updatedAt: serverTimestamp(),
      });
    }

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

/**
 * Memeriksa dan memproses jadwal keberangkatan yang telah kadaluarsa.
 * Jadwal yang tanggal keberangkatannya < hari ini (lokal) akan ditutup,
 * dan pre-orders milik jadwal tersebut yang masih Pending akan dipindahkan ke Pesanan.
 */
export async function checkAndProcessExpiredSchedules() {
  const d = new Date();
  const todayYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
      const namaBarang = poData.items.map((i) => i.namaBarang).join(", ");

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
        catatan: `Otomatis dikonversi dari Pre Order karena jadwal telah berangkat. Items: ${namaBarang}`,
      });
      convertedCount++;
    }
  }

  return { closed: closedCount, converted: convertedCount };
}
