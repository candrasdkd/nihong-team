import * as XLSX from "xlsx";
import { LedgerEntry } from "../services/ledgerFirebase";
import { ExtendedOrder } from "../types";
import { formatLedgerDate } from "./ledger";
import { compute } from "./helpers";

export function exportLedgerToExcel(data: LedgerEntry[], filename: string = "Laporan_Kas.xlsx") {
  // Map data to the desired format for Excel
  const exportData = data.filter(entry => !entry.voidedAt).map((entry) => ({
    Tanggal: formatLedgerDate(entry.tanggal),
    Keterangan: entry.keterangan || "Tanpa Keterangan",
    Kategori: entry.kategori || "-",
    "Tipe Transaksi": entry.tipe === "Masuk" ? "Pemasukan" : "Pengeluaran",
    "Metode": entry.metode || "-",
    "Nominal Masuk (Rp)": entry.tipe === "Masuk" ? Number(entry.jumlah || 0) : 0,
    "Nominal Keluar (Rp)": entry.tipe === "Keluar" ? Number(entry.jumlah || 0) : 0,
    Catatan: entry.catatan || "-",
  }));

  // Create a new workbook and add a worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths for better visibility
  const wscols = [
    { wch: 23 }, // Tanggal
    { wch: 30 }, // Keterangan
    { wch: 15 }, // Kategori
    { wch: 15 }, // Tipe
    { wch: 15 }, // Metode
    { wch: 20 }, // Masuk
    { wch: 20 }, // Keluar
    { wch: 40 }, // Catatan
  ];
  worksheet["!cols"] = wscols;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Buku Kas");

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

export function exportOrdersToExcel(orders: ExtendedOrder[], unitPrice: number, filename: string = "Laporan_Pesanan.xlsx") {
  const exportData = orders.map((o) => {
    const d = compute(o, unitPrice);
    return {
      "Nama Pelanggan": o.namaPelanggan,
      "Nama Barang": o.namaBarang,
      "Berat (Kg)": d.kg,
      Status: o.status,
      Tagihan: d.totalPembayaran,
      Profit: d.totalKeuntungan,
      Currency: d.currency,
      Tanggal: o.tanggal,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();

  const wscols = [
    { wch: 25 }, // Nama Pelanggan
    { wch: 30 }, // Nama Barang
    { wch: 10 }, // Berat
    { wch: 15 }, // Status
    { wch: 15 }, // Tagihan
    { wch: 15 }, // Profit
    { wch: 10 }, // Currency
    { wch: 23 }, // Tanggal
  ];
  worksheet["!cols"] = wscols;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Pesanan");
  XLSX.writeFile(workbook, filename);
}
