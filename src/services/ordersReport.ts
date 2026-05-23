// src/services/ordersReport.ts
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Menghitung total keuntungan dari koleksi 'orders' berdasarkan rentang tanggal tertentu.
 * Fungsi ini digunakan untuk membuat rekap laporan keuntungan manual di periode tertentu.
 * 
 * @param from - Tanggal mulai filter dalam format string 'YYYY-MM-DD'
 * @param to - Tanggal selesai filter dalam format string 'YYYY-MM-DD'
 * @returns {Promise<number>} Jumlah total keuntungan (profit) dari seluruh order dalam periode.
 */
export async function calculateProfitFromOrders(
  from: string,
  to: string,
): Promise<number> {
  // Validasi input agar query range di Firestore tidak error
  if (!from || !to) {
    throw new Error("Tanggal mulai dan selesai harus diisi.");
  }

  const ordersRef = collection(db, "orders");
  // Membuat query dengan filter range tanggal inklusif (lexicographical comparison)
  const q = query(
    ordersRef,
    where("tanggal", ">=", from),
    where("tanggal", "<=", to),
  );

  const querySnapshot = await getDocs(q);
  let totalProfit = 0;
  
  // Melakukan perulangan di setiap dokumen order yang terfilter
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Memastikan field 'totalKeuntungan' ada dan merupakan tipe angka sebelum ditambahkan ke total
    if (data.totalKeuntungan && typeof data.totalKeuntungan === "number") {
      totalProfit += data.totalKeuntungan;
    }
  });

  return totalProfit;
}
