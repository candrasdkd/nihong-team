// src/services/ordersFirebase.ts
import {
  collection,
  doc,
  DocumentData,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
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

import { storedOrderTotals } from "../utils/orderRepairs";
import { getPaymentSummary } from "../utils/payment";

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
    dpNominal: Number(raw.dpNominal ?? 0),
    dpTanggal: raw.dpTanggal ?? "",
    dpMetode: raw.dpMetode ?? "",
    dpCatatan: raw.dpCatatan ?? "",
    pelunasanNominal: Number(raw.pelunasanNominal ?? 0),
    pelunasanTanggal: raw.pelunasanTanggal ?? "",
    pelunasanMetode: raw.pelunasanMetode ?? "",
    pelunasanCatatan: raw.pelunasanCatatan ?? "",
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
  
  const newDocRef = doc(colRef);
  const newId = newDocRef.id;
  payload.revision = 1;
  await runTransaction(db, async (transaction) => {
    
    // Set timestamp pembuatan
    (payload as any).createdAt = serverTimestamp();
    
    // 1. Simpan dokumen pesanan utama
    transaction.set(newDocRef, payload);
    transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });
    
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
      const customerRef = doc(db, "customer", idPelanggan);
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
  opts?: { expectedRevision?: number; expectedSnapshot?: string },
) {
  const docRef = doc(db, "orders", id);
  
  await runTransaction(db, async (transaction) => {
    // Ambil data lama order untuk perbandingan nominal
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      throw new Error("Order tidak ditemukan");
    }
    
    const oldData = snap.data();
    if (opts?.expectedRevision !== undefined && (oldData.revision || 0) !== opts.expectedRevision) {
      throw new Error("Pesanan berubah di perangkat lain. Tutup lalu buka ulang formulir.");
    }
    if (opts?.expectedSnapshot !== undefined && JSON.stringify(oldData) !== opts.expectedSnapshot) {
      throw new Error("Data pesanan berubah sejak pratinjau. Buat pratinjau perbaikan ulang.");
    }
    // General order edits must never replace payment records from a stale form.
    const merged = { ...oldData, ...raw };
    for (const field of PAYMENT_FIELDS) merged[field] = oldData[field];
    if ((Number(oldData.dpNominal) > 0 || Number(oldData.pelunasanNominal) > 0) && merged.tipeNominal !== oldData.tipeNominal) {
      throw new Error("Mata uang tidak dapat diubah setelah pembayaran dicatat.");
    }
    const payload = prepareForWrite(merged, unitPrice);
    if (Number(oldData.dpNominal) > 0 || Number(oldData.pelunasanNominal) > 0) {
      payload.status = getPaymentSummary(oldData, Number(payload.totalPembayaran)).status;
    }
    payload.revision = (oldData.revision || 0) + 1;
    const oldIsJpy = oldData.tipeNominal === "JPY";
    const canonicalOld = storedOrderTotals(oldData);
    const oldMonthKey = String(oldData.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const oldIdPelanggan = String(oldData.idPelanggan || "");
    const oldMonth = await transaction.get(doc(db, "orders_monthly_summaries", oldMonthKey));
    const oldCustomer = oldIdPelanggan ? await transaction.get(doc(db, "customer", oldIdPelanggan)) : null;
    const oldRev = oldMonth.data()?.calculationVersion === 2 ? canonicalOld.totalPembayaran : Number(oldData.totalPembayaran || 0);
    const oldProf = oldMonth.data()?.calculationVersion === 2 ? canonicalOld.totalKeuntungan : Number(oldData.totalKeuntungan || 0);
    const customerOldRev = oldCustomer?.data()?.calculationVersion === 2 ? canonicalOld.totalPembayaran : Number(oldData.totalPembayaran || 0);
    
    const newIsJpy = payload.tipeNominal === "JPY";
    const newRev = Number(payload.totalPembayaran || 0);
    const newProf = Number(payload.totalKeuntungan || 0);
    const newMonthKey = String(payload.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const newIdPelanggan = String(payload.idPelanggan || "");
    
    // 1. Update dokumen pesanan utama
    transaction.update(docRef, payload);
    transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });
    
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
        const customerRef = doc(db, "customer", oldIdPelanggan);
        const diffRevIdr = (newIsJpy ? 0 : newRev) - (oldIsJpy ? 0 : customerOldRev);
        const diffRevJpy = (newIsJpy ? newRev : 0) - (oldIsJpy ? customerOldRev : 0);
        
        transaction.set(customerRef, {
          totalSpendIdr: increment(diffRevIdr),
          totalSpendJpy: increment(diffRevJpy)
        }, { merge: true });
      }
    } else {
      // Jika pesanan dipindahkan ke customer lain
      if (oldIdPelanggan) {
        const oldCustomerRef = doc(db, "customer", oldIdPelanggan);
        transaction.set(oldCustomerRef, {
          totalSpendIdr: increment(oldIsJpy ? 0 : -customerOldRev),
          totalSpendJpy: increment(oldIsJpy ? -customerOldRev : 0),
          orderCount: increment(-1)
        }, { merge: true });
      }
      if (newIdPelanggan) {
        const newCustomerRef = doc(db, "customer", newIdPelanggan);
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
    const canonical = storedOrderTotals(data);
    const monthKey = String(data.tanggal || "").substring(0, 7) || new Date().toISOString().substring(0, 7);
    const idPelanggan = String(data.idPelanggan || "");
    const month = await transaction.get(doc(db, "orders_monthly_summaries", monthKey));
    const customer = idPelanggan ? await transaction.get(doc(db, "customer", idPelanggan)) : null;
    const rev = month.data()?.calculationVersion === 2 ? canonical.totalPembayaran : Number(data.totalPembayaran || 0);
    const prof = month.data()?.calculationVersion === 2 ? canonical.totalKeuntungan : Number(data.totalKeuntungan || 0);
    const customerRev = customer?.data()?.calculationVersion === 2 ? canonical.totalPembayaran : Number(data.totalPembayaran || 0);
    
    // 1. Hapus dokumen order utama
    transaction.delete(docRef);
    transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });
    
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
      const customerRef = doc(db, "customer", idPelanggan);
      transaction.set(customerRef, {
        totalSpendIdr: increment(isJpy ? 0 : -customerRev),
        totalSpendJpy: increment(isJpy ? -customerRev : 0),
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
  onError?: (error: Error) => void,
): Unsubscribe;
export function subscribeOrders(
  optsOrCb: SubscribeOpts | ((rows: OrderDoc[]) => void),
  maybeCb?: (rows: OrderDoc[]) => void,
  onError?: (error: Error) => void,
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
  if (typeof limit === "number" && Number.isFinite(limit)) cons.push(qLimit(limit));

  const qy = query(ORDERS, ...cons);
  return onSnapshot(qy, (snap) => {
    const rows: OrderDoc[] = snap.docs.map((d) => ({
      ...(d.data() as OrderDoc),
      id: d.id,
    }));
    cb(rows);
  }, onError);
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
  let status = doc.status;
  if ((status as any) === "Menunggu Pelunasan") {
    status = "DP Terbayar";
  }
  return {
    ...doc,
    status,
    tanggal: doc.tanggal,
    namaPelanggan: doc.namaPelanggan,
  };
}

export function fromExtended(ui: ExtendedOrder): OrderDoc {
  return {
    id: ui.id,
    revision: ui.revision,
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
    dpNominal: ui.dpNominal,
    dpTanggal: ui.dpTanggal,
    dpMetode: ui.dpMetode,
    dpCatatan: ui.dpCatatan,
    pelunasanNominal: ui.pelunasanNominal,
    pelunasanTanggal: ui.pelunasanTanggal,
    pelunasanMetode: ui.pelunasanMetode,
    pelunasanCatatan: ui.pelunasanCatatan,
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
  const revisionRef = doc(db, "metadata", "orders_revision");
  // Every order mutation increments this revision. A scan can only publish
  // aggregates while its source revision still matches the server.
  for (let attempt = 0; attempt < 5; attempt++) {
    const baseline = await getDocFromServer(revisionRef);
    const revision = baseline.data()?.revision || 0;
    const [ordersSnap, monthsSnap, customersSnap] = await Promise.all([
      getDocsFromServer(ORDERS),
      getDocsFromServer(collection(db, "orders_monthly_summaries")),
      getDocsFromServer(collection(db, "customer")),
    ]);
    const monthly = new Map<string, { revenueIdr: number; revenueJpy: number; profitIdr: number; profitJpy: number; orderCount: number }>();
    const customers = new Map<string, { totalSpendIdr: number; totalSpendJpy: number; orderCount: number }>();
    const emptyMonth = () => ({ revenueIdr: 0, revenueJpy: 0, profitIdr: 0, profitJpy: 0, orderCount: 0 });
    monthsSnap.docs.forEach(item => monthly.set(item.id, emptyMonth()));
    customersSnap.docs.forEach(item => customers.set(item.id, { totalSpendIdr: 0, totalSpendJpy: 0, orderCount: 0 }));
    for (const item of ordersSnap.docs) {
      const row = item.data();
      const month = String(row.tanggal || "").slice(0, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`Tanggal pesanan ${item.id} tidak valid. Perbaiki tanggal sebelum sinkronisasi.`);
      const totals = storedOrderTotals(row);
      if (!Number.isFinite(totals.totalPembayaran) || !Number.isFinite(totals.totalKeuntungan)) throw new Error(`Nominal pesanan ${item.id} tidak valid.`);
      const stats = monthly.get(month) || emptyMonth();
      stats.orderCount++;
      if (row.tipeNominal === "JPY") { stats.revenueJpy += totals.totalPembayaran; stats.profitJpy += totals.totalKeuntungan; }
      else { stats.revenueIdr += totals.totalPembayaran; stats.profitIdr += totals.totalKeuntungan; }
      monthly.set(month, stats);
      const customer = customers.get(row.idPelanggan);
      if (customer) {
        customer.orderCount++;
        if (row.tipeNominal === "JPY") customer.totalSpendJpy += totals.totalPembayaran;
        else customer.totalSpendIdr += totals.totalPembayaran;
      }
    }
    const operations = [
      ...[...monthly].map(([id, data]) => ({ ref: doc(db, "orders_monthly_summaries", id), data: { ...data, lastUpdated: Date.now() } })),
      ...[...customers].map(([id, data]) => ({ ref: doc(db, "customer", id), data })),
    ];
    try {
      for (let index = 0; index < Math.max(operations.length, 1); index += 400) {
        await runTransaction(db, async transaction => {
          const current = await transaction.get(revisionRef);
          if ((current.data()?.revision || 0) !== revision) throw new Error("ORDER_SCAN_CHANGED");
          for (const operation of operations.slice(index, index + 400)) transaction.set(operation.ref, { ...operation.data, calculationVersion: 2 }, { merge: true });
        });
      }
      return;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "ORDER_SCAN_CHANGED") throw error;
    }
  }
  throw new Error("Pesanan sedang berubah. Coba sinkronisasi lagi setelah aktivitas penyimpanan selesai.");
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
 * Mendengarkan pesanan aktif saja (status "Belum Membayar", "DP Terbayar") secara real-time.
 * Digunakan pada boot-up aplikasi (App.tsx) untuk notifikasi lokal.
 */
export function subscribeActiveOrders(cb: (rows: OrderDoc[]) => void): Unsubscribe {
  const qy = query(
    ORDERS,
    where("status", "in", ["Belum Membayar", "DP Terbayar"])
  );
  return onSnapshot(qy, (snap) => {
    const rows: OrderDoc[] = snap.docs.map((d) => ({
      ...(d.data() as OrderDoc),
      id: d.id,
    }));
    cb(rows);
  });
}

/**
 * Memperbarui status pembayaran pesanan (DP & Pelunasan) secara fleksibel.
 */
const PAYMENT_FIELDS = ["dpNominal", "dpTanggal", "dpMetode", "dpCatatan", "pelunasanNominal", "pelunasanTanggal", "pelunasanMetode", "pelunasanCatatan"] as const;

export async function updateOrderPayment(
  orderId: string,
  data: Partial<Pick<OrderDoc, typeof PAYMENT_FIELDS[number]>> & { status?: OrderStatus },
  expectedRevision?: number,
) {
  const docRef = doc(db, "orders", orderId);
  for (const field of ["dpNominal", "pelunasanNominal"] as const) {
    const amount = data[field];
    if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) throw new Error("Nominal pembayaran harus berupa bilangan bulat nol atau lebih.");
  }
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("Pesanan tidak ditemukan.");
    const current = snap.data();
    if (expectedRevision !== undefined && (current.revision || 0) !== expectedRevision) {
      throw new Error("Pembayaran atau pesanan telah berubah. Tutup lalu buka ulang formulir.");
    }
    const update: Record<string, any> = { updatedAt: serverTimestamp(), revision: (current.revision || 0) + 1 };
    for (const field of PAYMENT_FIELDS) if (data[field] !== undefined) update[field] = data[field];
    const total = Number(current.hargaJastipMarkup || 0) + Number(current.hargaOngkirMarkup || 0);
    update.status = getPaymentSummary({ ...current, ...update }, total).status;
    transaction.update(docRef, update);
    transaction.set(doc(db, "metadata", "orders_revision"), { revision: increment(1) }, { merge: true });
  });
}
