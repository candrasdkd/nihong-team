// src/services/ordersFirebase.ts
import {
  collection,
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
  WithFieldValue,
  where,
  runTransaction,
  increment,
  getDoc,
  writeBatch,
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

// Referensi ke koleksi utama 'orders' di Firestore
const ORDERS = collection(db, "orders");

/**
 * Menyiapkan payload data pesanan sebelum disimpan (write) ke database Firestore.
 * Melakukan kalkulasi berat pembulatan (ceil), menghitung base ongkir, 
 * total pembayaran, total keuntungan, dan membersihkan teks input.
 * 
 * @param raw - Data input pesanan parsial dari user.
 * @param unitPrice - Tarif dasar jastip per Kg (IDR).
 */
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
    updatedAt: serverTimestamp(), // Menggunakan timestamp server untuk audit log
    // createdAt di-set saat create pertama kali
  };
}

/* ===================== CRUD dengan Firestore Transactions & Aggregates ===================== */

/**
 * Membuat pesanan baru secara ATOMIK menggunakan runTransaction.
 * Menjamin konsistensi data karena proses ini menulis dokumen order, memperbarui ringkasan penjualan bulanan
 * (orders_monthly_summaries), dan mengupdate total belanja customer secara bersamaan.
 * 
 * @param raw - Data pesanan baru.
 * @param unitPrice - Harga jastip per Kg.
 */
export async function createOrder(raw: Partial<OrderDoc>, unitPrice: number) {
  const colRef = collection(db, "orders");
  const payload = prepareForWrite(raw, unitPrice);
  const isJpy = payload.tipeNominal === "JPY";
  const rev = Number(payload.totalPembayaran || 0);
  const prof = Number(payload.totalKeuntungan || 0);
  // Mendapatkan Key Bulan (misal: "2026-05") dari tanggal pesanan
  const monthKey = String(payload.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
  const idPelanggan = String(payload.idPelanggan || "");
  
  let newId = "";
  await runTransaction(db, async (transaction) => {
    const newDocRef = doc(colRef);
    newId = newDocRef.id;
    
    // Set timestamp pembuatan
    (payload as any).createdAt = serverTimestamp();
    
    // 1. Simpan dokumen pesanan utama
    transaction.set(newDocRef, payload);
    
    // 2. Update ringkasan bulanan (Monthly Summary) secara atomik menggunakan increment
    const summaryRef = doc(db, "orders_monthly_summaries", monthKey);
    transaction.set(summaryRef, {
      revenueIdr: increment(isJpy ? 0 : rev),
      revenueJpy: increment(isJpy ? rev : 0),
      profitIdr: increment(isJpy ? 0 : prof),
      profitJpy: increment(isJpy ? prof : 0),
      orderCount: increment(1)
    }, { merge: true });
    
    // 3. Update total belanja & jumlah order pada dokumen customer terkait
    if (idPelanggan) {
      const customerRef = doc(db, "customers", idPelanggan);
      transaction.set(customerRef, {
        totalSpendIdr: increment(isJpy ? 0 : rev),
        totalSpendJpy: increment(isJpy ? rev : 0),
        orderCount: increment(1)
      }, { merge: true });
    }
  });
  return newId;
}

/**
 * Memperbarui pesanan secara ATOMIK menggunakan runTransaction.
 * Menghitung selisih (diff) nominal baru dan lama untuk menyesuaikan ringkasan bulanan
 * serta data pengeluaran customer secara akurat.
 * 
 * @param id - ID dokumen order yang diubah.
 * @param raw - Payload data baru.
 * @param unitPrice - Harga jastip per Kg.
 */
export async function updateOrder(
  id: string,
  raw: Partial<OrderDoc>,
  unitPrice: number,
) {
  const docRef = doc(db, "orders", id);
  const payload = prepareForWrite(raw, unitPrice);
  
  await runTransaction(db, async (transaction) => {
    // Ambil data lama order untuk perbandingan nominal
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      throw new Error("Order tidak ditemukan");
    }
    
    const oldData = snap.data();
    const oldIsJpy = oldData.tipeNominal === "JPY";
    const oldRev = Number(oldData.totalPembayaran || 0);
    const oldProf = Number(oldData.totalKeuntungan || 0);
    const oldMonthKey = String(oldData.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const oldIdPelanggan = String(oldData.idPelanggan || "");
    
    const newIsJpy = payload.tipeNominal === "JPY";
    const newRev = Number(payload.totalPembayaran || 0);
    const newProf = Number(payload.totalKeuntungan || 0);
    const newMonthKey = String(payload.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const newIdPelanggan = String(payload.idPelanggan || "");
    
    // 1. Update dokumen pesanan utama
    transaction.update(docRef, payload);
    
    // 2. Sesuaikan ringkasan bulanan (Monthly Summary)
    if (oldMonthKey === newMonthKey) {
      // Jika pesanan diubah dalam bulan yang sama, hitung selisih nominalnya
      const summaryRef = doc(db, "orders_monthly_summaries", oldMonthKey);
      
      const diffRevIdr = (newIsJpy ? 0 : newRev) - (oldIsJpy ? 0 : oldRev);
      const diffRevJpy = (newIsJpy ? newRev : 0) - (oldIsJpy ? oldRev : 0);
      const diffProfIdr = (newIsJpy ? 0 : newProf) - (oldIsJpy ? 0 : oldProf);
      const diffProfJpy = (newIsJpy ? newProf : 0) - (oldIsJpy ? oldProf : 0);
      
      transaction.set(summaryRef, {
        revenueIdr: increment(diffRevIdr),
        revenueJpy: increment(diffRevJpy),
        profitIdr: increment(diffProfIdr),
        profitJpy: increment(diffProfJpy)
      }, { merge: true });
    } else {
      // Jika pesanan digeser ke bulan lain, kurangi dari bulan lama dan tambahkan ke bulan baru
      const oldSummaryRef = doc(db, "orders_monthly_summaries", oldMonthKey);
      transaction.set(oldSummaryRef, {
        revenueIdr: increment(oldIsJpy ? 0 : -oldRev),
        revenueJpy: increment(oldIsJpy ? -oldRev : 0),
        profitIdr: increment(oldIsJpy ? 0 : -oldProf),
        profitJpy: increment(oldIsJpy ? -oldProf : 0),
        orderCount: increment(-1)
      }, { merge: true });
      
      const newSummaryRef = doc(db, "orders_monthly_summaries", newMonthKey);
      transaction.set(newSummaryRef, {
        revenueIdr: increment(newIsJpy ? 0 : newRev),
        revenueJpy: increment(newIsJpy ? newRev : 0),
        profitIdr: increment(newIsJpy ? 0 : newProf),
        profitJpy: increment(newIsJpy ? newProf : 0),
        orderCount: increment(1)
      }, { merge: true });
    }
    
    // 3. Sesuaikan statistik total belanja customer
    if (oldIdPelanggan === newIdPelanggan) {
      if (oldIdPelanggan) {
        const customerRef = doc(db, "customers", oldIdPelanggan);
        const diffRevIdr = (newIsJpy ? 0 : newRev) - (oldIsJpy ? 0 : oldRev);
        const diffRevJpy = (newIsJpy ? newRev : 0) - (oldIsJpy ? oldRev : 0);
        
        transaction.set(customerRef, {
          totalSpendIdr: increment(diffRevIdr),
          totalSpendJpy: increment(diffRevJpy)
        }, { merge: true });
      }
    } else {
      // Jika pesanan dipindahkan ke customer lain
      if (oldIdPelanggan) {
        const oldCustomerRef = doc(db, "customers", oldIdPelanggan);
        transaction.set(oldCustomerRef, {
          totalSpendIdr: increment(oldIsJpy ? 0 : -oldRev),
          totalSpendJpy: increment(oldIsJpy ? -oldRev : 0),
          orderCount: increment(-1)
        }, { merge: true });
      }
      if (newIdPelanggan) {
        const newCustomerRef = doc(db, "customers", newIdPelanggan);
        transaction.set(newCustomerRef, {
          totalSpendIdr: increment(newIsJpy ? 0 : newRev),
          totalSpendJpy: increment(newIsJpy ? newRev : 0),
          orderCount: increment(1)
        }, { merge: true });
      }
    }
  });
}

/**
 * Menyimpan data pesanan (Insert jika baru, Update jika sudah memiliki ID).
 */
export async function upsertOrder(
  id: string | undefined,
  raw: Partial<OrderDoc>,
  unitPrice: number,
) {
  if (!id) return createOrder(raw, unitPrice);
  await updateOrder(id, raw, unitPrice);
  return id;
}

/**
 * Menghapus pesanan secara ATOMIK menggunakan runTransaction.
 * Otomatis mengurangi nominal order terhapus dari ringkasan bulanan dan statistik customer terkait.
 * 
 * @param id - ID dokumen order yang dihapus.
 */
export async function deleteOrder(id: string) {
  const docRef = doc(db, "orders", id);
  const ordersSummaryRef = collection(db, "orders_monthly_summaries");
  
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const isJpy = data.tipeNominal === "JPY";
    const rev = Number(data.totalPembayaran || 0);
    const prof = Number(data.totalKeuntungan || 0);
    const monthKey = String(data.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const idPelanggan = String(data.idPelanggan || "");
    
    // 1. Hapus dokumen order utama
    transaction.delete(docRef);
    
    // 2. Kurangi nominal pada ringkasan bulanan
    const summaryRef = doc(ordersSummaryRef, monthKey);
    transaction.set(summaryRef, {
      revenueIdr: increment(isJpy ? 0 : -rev),
      revenueJpy: increment(isJpy ? -rev : 0),
      profitIdr: increment(isJpy ? 0 : -prof),
      profitJpy: increment(isJpy ? -prof : 0),
      orderCount: increment(-1)
    }, { merge: true });
    
    // 3. Kurangi total belanja customer
    if (idPelanggan) {
      const customerRef = doc(db, "customers", idPelanggan);
      transaction.set(customerRef, {
        totalSpendIdr: increment(isJpy ? 0 : -rev),
        totalSpendJpy: increment(isJpy ? -rev : 0),
        orderCount: increment(-1)
      }, { merge: true });
    }
  });
}

/* ===================== Realtime Subscriptions & Pagination ===================== */

// Overload function signature untuk kompabilitas kode lama dan baru
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
    q, // tidak digunakan langsung di query server (di-filter client-side untuk kecocokan substring)
    status,
    fromInput = defaultFrom,
    toInput = defaultTo,
    sort = "desc",
    limit = 250,
  } = (hasOpts ? (optsOrCb as SubscribeOpts) : {}) as SubscribeOpts;

  const cons: QueryConstraint[] = [];

  // Filter Status
  if (status) cons.push(where("status", "==", status));

  // Filter Rentang Tanggal (lexicographical range 'yyyy-MM-dd')
  if (fromInput) cons.push(where("tanggal", ">=", fromInput));
  if (toInput) cons.push(where("tanggal", "<=", toInput));

  // Pengurutan tanggal
  cons.push(orderBy("tanggal", sort));

  // Limit limit query untuk hemat kuota baca Firestore
  if (Number.isFinite(limit)) cons.push(qLimit(limit));

  const qy = query(ORDERS, ...cons);
  return onSnapshot(qy, (snap) => {
    const rows: OrderDoc[] = snap.docs.map((d) => ({
      ...(d.data() as OrderDoc),
      id: d.id,
    }));
    cb(rows);
  });
}

/**
 * Mengambil data pesanan dalam bentuk lembaran/batch (Pagination) menggunakan cursor penunjuk.
 * Berguna saat membuat fitur infinite scroll atau tombol "Load More".
 * 
 * @param pageSize - Jumlah dokumen yang dimuat per halaman.
 * @param cursor - Penanda batas dokumen terakhir di halaman sebelumnya (startAfter).
 */
export async function getOrdersPage(pageSize = 25, cursor?: any) {
  const q1 = cursor
    ? query(
      ORDERS,
      orderBy("tanggal", "desc"),
      startAfter(cursor), // Lanjutkan setelah dokumen cursor
      qLimit(pageSize),
    )
    : query(ORDERS, orderBy("tanggal", "desc"), qLimit(pageSize));

  const snap = await getDocs(q1);
  const rows: OrderDoc[] = snap.docs.map((d) => ({
    ...(d.data() as OrderDoc),
    id: d.id,
  }));
  const last =
    snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return { rows, cursor: last };
}

/* ===================== ADAPTERS & MIGRATIONS ===================== */

// Tipe data pesanan tambahan untuk keperluan render UI
export type ExtendedOrder = OrderDoc & {
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

/**
 * Utilitas migrasi untuk menambahkan default field 'tipeNominal' pada semua data pesanan lama.
 */
export async function addTipeNominalToAllOrders(tipeNominal: string) {
  const snap = await getDocs(ORDERS);
  const docs = snap.docs;
  const BATCH_LIMIT = 500;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_LIMIT);

    chunk.forEach((d) => {
      const ref = doc(db, "orders", d.id);
      batch.set(ref, {
        tipeNominal,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
  }

  console.log(`✔ ${snap.size} orders berhasil ditambahkan tipeNominal`);
}

/* ===================== Aggregation Helpers & Queries ===================== */

/**
 * Menghitung ulang seluruh total penjualan bulanan dan total belanja setiap customer
 * dengan memindai total koleksi orders. Digunakan untuk sinkronisasi awal dashboard (Sync).
 */
export async function recalculateAllStats() {
  const ordersSnap = await getDocs(ORDERS);
  
  const monthlyStats: Record<string, { revenueIdr: number; revenueJpy: number; profitIdr: number; profitJpy: number; orderCount: number }> = {};
  const customerStats: Record<string, { totalSpendIdr: number; totalSpendJpy: number; orderCount: number }> = {};
  
  // Melakukan pengelompokan (grouping) dan akumulasi data order di memori
  ordersSnap.forEach((d) => {
    const data = d.data();
    const isJpy = data.tipeNominal === "JPY";
    const rev = Number(data.totalPembayaran || 0);
    const prof = Number(data.totalKeuntungan || 0);
    const monthKey = String(data.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const idPelanggan = String(data.idPelanggan || "");
    
    // Kelompokkan data per Bulan
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { revenueIdr: 0, revenueJpy: 0, profitIdr: 0, profitJpy: 0, orderCount: 0 };
    }
    monthlyStats[monthKey].orderCount += 1;
    if (isJpy) {
      monthlyStats[monthKey].revenueJpy += rev;
      monthlyStats[monthKey].profitJpy += prof;
    } else {
      monthlyStats[monthKey].revenueIdr += rev;
      monthlyStats[monthKey].profitIdr += prof;
    }
    
    // Kelompokkan data per Customer
    if (idPelanggan) {
      if (!customerStats[idPelanggan]) {
        customerStats[idPelanggan] = { totalSpendIdr: 0, totalSpendJpy: 0, orderCount: 0 };
      }
      customerStats[idPelanggan].orderCount += 1;
      if (isJpy) {
        customerStats[idPelanggan].totalSpendJpy += rev;
      } else {
        customerStats[idPelanggan].totalSpendIdr += rev;
      }
    }
  });
  
  // Satukan semua operasi tulis ke dalam flat array
  const ops: Array<{ ref: any; data: any; options?: { merge: boolean } }> = [];
  
  // 1. Tambahkan ringkasan bulanan ke operasi batch
  Object.entries(monthlyStats).forEach(([month, stats]) => {
    const ref = doc(db, "orders_monthly_summaries", month);
    ops.push({ ref, data: { ...stats, lastUpdated: Date.now() } });
  });
  
  // 2. Tambahkan belanja customer ke operasi batch
  Object.entries(customerStats).forEach(([custId, stats]) => {
    const ref = doc(db, "customers", custId);
    ops.push({ ref, data: stats, options: { merge: true } });
  });

  // Commit batch per 500 operasi sekaligus
  const BATCH_LIMIT = 500;
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = ops.slice(i, i + BATCH_LIMIT);
    
    chunk.forEach((op) => {
      if (op.options) {
        batch.set(op.ref, op.data, op.options);
      } else {
        batch.set(op.ref, op.data);
      }
    });
    
    await batch.commit();
  }
  
  console.log("✔ Statistik Dashboard dan data belanja Pelanggan berhasil disinkronisasi.");
}

export function subscribeMonthlySummaries(onData: (rows: any[]) => void) {
  const colRef = collection(db, "orders_monthly_summaries");
  const qy = query(colRef, orderBy("__name__", "asc"));
  return onSnapshot(qy, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    onData(rows);

    // Jika data ringkasan kosong tetapi data order di database ada, lakukan inisialisasi sync otomatis
    if (snap.empty) {
      const ordersCol = collection(db, "orders");
      getDocs(query(ordersCol, qLimit(1))).then((ordersSnap) => {
        if (!ordersSnap.empty) {
          console.log("[Dashboard] Menginisialisasi statistik bulanan secara otomatis...");
          recalculateAllStats();
        }
      });
    }
  });
}


/**
 * Mendengarkan pesanan aktif saja (status "Belum Membayar") secara real-time.
 * Digunakan pada boot-up aplikasi (App.tsx) untuk notifikasi lokal.
 */
export function subscribeActiveOrders(cb: (rows: OrderDoc[]) => void): Unsubscribe {
  const qy = query(ORDERS, where("status", "==", "Belum Membayar"));
  return onSnapshot(qy, (snap) => {
    const rows: OrderDoc[] = snap.docs.map((d) => ({
      ...(d.data() as OrderDoc),
      id: d.id,
    }));
    cb(rows);
  });
}
