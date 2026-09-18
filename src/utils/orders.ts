import type { Customer, ExtendedOrder } from "../types";
import { compute, formatAndAddYear } from "./helpers";
import { formatCurrency } from "./format";
import { getPaymentSummary } from "./payment";

const customerName = (name?: string) => (name || "").trim().toLocaleUpperCase("id-ID");

// A name is a legacy fallback only when it identifies exactly one customer.
export function resolveOrderCustomer(order: Pick<ExtendedOrder, "idPelanggan" | "namaPelanggan">, customers: Customer[]) {
  if (order.idPelanggan) return customers.find(customer => customer.id === order.idPelanggan);
  const matches = customers.filter(customer => customerName(customer.nama) === customerName(order.namaPelanggan));
  return matches.length === 1 ? matches[0] : undefined;
}

export function invoiceSelectionError(items: ExtendedOrder[], customers: Customer[] = []): string | null {
  if (!items.length) return "Pilih minimal satu pesanan untuk membuat invoice.";
  if (new Set(items.map(item => item.tipeNominal || "IDR")).size > 1) return "Pisahkan invoice rupiah dan yen. Mata uang pesanan harus sama.";
  if (items.length > 1) {
    const ids = items.map(item => item.idPelanggan || resolveOrderCustomer(item, customers)?.id);
    if (ids.some(id => !id)) return "Pilih ulang pelanggan pada pesanan lama sebelum menggabungkan invoice.";
    if (new Set(ids).size !== 1) return "Pesanan harus dari pelanggan yang sama.";
  }
  return null;
}

export function summarizeInvoice(items: ExtendedOrder[], unitPrice: number) {
  if (new Set(items.map(item => item.tipeNominal || "IDR")).size > 1) throw new Error("Mata uang invoice harus sama.");
  return items.reduce((sum, item) => {
    const total = compute(item, unitPrice).totalPembayaran;
    const payment = getPaymentSummary(item, total);
    sum.subtotal += total;
    sum.dp += payment.dp;
    sum.settlement += payment.settlement;
    // An excess payment on one order must not silently settle another order.
    sum.remaining += payment.remaining;
    return sum;
  }, { subtotal: 0, dp: 0, settlement: 0, remaining: 0, currency: items[0]?.tipeNominal || "IDR" });
}

export type OrderFilters = { q?: string; status?: string; from?: string; to?: string };
export function filterOrders(orders: ExtendedOrder[], filters: OrderFilters) {
  const text = (filters.q || "").trim().toLocaleLowerCase("id-ID");
  return orders.filter(order => (!filters.status || order.status === filters.status)
    && (!filters.from || order.tanggal >= filters.from)
    && (!filters.to || order.tanggal <= filters.to)
    && (!text || [order.no, order.namaBarang, order.namaPelanggan, order.catatan].some(value => String(value || "").toLocaleLowerCase("id-ID").includes(text))));
}

export function buildUnpaidRecap(orders: ExtendedOrder[], unitPrice: number, date = new Date()): string | null {
  const unpaid = orders.filter(order => order.status !== "Selesai");
  if (!unpaid.length) return null;
  const totals = new Map<string, number>();
  const lines = unpaid.map((order, index) => {
    const bill = compute(order, unitPrice);
    const payment = getPaymentSummary(order, bill.totalPembayaran);
    totals.set(bill.currency, (totals.get(bill.currency) || 0) + payment.remaining);
    return `${index + 1}. *${order.namaPelanggan}* (${formatAndAddYear(order.tanggal)}) — Total: ${formatCurrency(bill.totalPembayaran, bill.currency)}, Terbayar: ${formatCurrency(payment.paid, bill.currency)}, Sisa: ${formatCurrency(payment.remaining, bill.currency)} (${order.namaBarang})`;
  });
  const totalLines = [...totals].map(([currency, amount]) => `• ${currency}: ${formatCurrency(amount, currency)}`).join("\n");
  return `*REKAP JASTIP BELUM LUNAS* 📦\nTanggal: ${date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}\n\n${lines.join("\n")}\n\n*Total Tagihan Belum Lunas per Mata Uang:*\n${totalLines}`;
}
