import type { Customer, ExtendedOrder } from "../types";
import { resolveOrderCustomer } from "./orders";

// Legacy rows missing source prices require review instead of inventing a zero bill.
export function storedOrderTotals(row: Record<string, any>) {
  const valid = (key: string) => typeof row[key] === "number" && Number.isFinite(row[key]) && row[key] >= 0;
  const hasBill = valid("hargaJastipMarkup") && valid("hargaOngkirMarkup");
  const totalPembayaran = hasBill ? row.hargaJastipMarkup + row.hargaOngkirMarkup : Number(row.totalPembayaran || 0);
  const totalKeuntungan = hasBill && valid("hargaJastip") && valid("hargaOngkir")
    ? totalPembayaran - row.hargaJastip - row.hargaOngkir : Number(row.totalKeuntungan || 0);
  return { hasBill, totalPembayaran, totalKeuntungan };
}

export function planOrderRepair(row: Record<string, any>, customers: Customer[]) {
  const totals = storedOrderTotals(row);
  const patch: Record<string, any> = {};
  const warnings: string[] = [];
  if (totals.hasBill) {
    if (row.totalPembayaran !== totals.totalPembayaran) patch.totalPembayaran = totals.totalPembayaran;
    if (row.totalKeuntungan !== totals.totalKeuntungan) patch.totalKeuntungan = totals.totalKeuntungan;
  } else warnings.push("Harga markup tidak lengkap; nominal perlu diperiksa manual.");
  const customer = resolveOrderCustomer(row as ExtendedOrder, customers);
  if (!row.idPelanggan && customer?.id) patch.idPelanggan = customer.id;
  if (!customer) warnings.push("Pelanggan tidak ditemukan atau namanya ganda; ID tidak diubah otomatis.");
  return { patch, warnings };
}
