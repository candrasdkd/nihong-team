import type { OrderDoc, OrderStatus, PeriodType } from "../types";
import { storedOrderTotals } from "./orderRepairs";
import { formatCurrency } from "./format";

export function dashboardDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dashboardRange(period: PeriodType, today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const from = period === "30d"
    ? new Date(year, month - 1, day - 29)
    : new Date(year, month - 1 - (period === "3m" ? 2 : 11), 1);
  return { from: dashboardDateKey(from), to: today };
}

export function dashboardRangeLabel(range: { from: string; to: string }) {
  const format = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };
  return `${format(range.from)} – ${format(range.to)}`;
}

export function summarizeDashboard(orders: OrderDoc[], range: { from: string; to: string }) {
  const statusCounts: Record<OrderStatus, number> = { "Belum Membayar": 0, "DP Terbayar": 0, "Selesai": 0 };
  const months = new Map<string, { key: string; label: string; count: number; revIdr: number; revJpy: number; profIdr: number; profJpy: number }>();
  const [year, month] = range.from.split("-").map(Number);
  for (const date = new Date(year, month - 1, 1); dashboardDateKey(date) <= range.to; date.setMonth(date.getMonth() + 1)) {
    const key = dashboardDateKey(date).slice(0, 7);
    months.set(key, { key, label: date.toLocaleDateString("id-ID", { month: "long", year: "numeric" }), count: 0, revIdr: 0, revJpy: 0, profIdr: 0, profJpy: 0 });
  }
  const kpi = { revIdr: 0, revJpy: 0, profIdr: 0, profJpy: 0, totalOrders: 0, activeOrders: 0, hasIdr: false, hasJpy: false };
  for (const row of orders) {
    if (row.tanggal < range.from || row.tanggal > range.to) continue;
    const bucket = months.get(row.tanggal.slice(0, 7));
    if (!bucket) continue;
    const totals = storedOrderTotals(row);
    const yen = row.tipeNominal === "JPY";
    const revenue = yen ? "revJpy" : "revIdr", profit = yen ? "profJpy" : "profIdr";
    kpi[yen ? "hasJpy" : "hasIdr"] = true;
    kpi[revenue] += totals.totalPembayaran;
    kpi[profit] += totals.totalKeuntungan;
    kpi.totalOrders++;
    bucket[revenue] += totals.totalPembayaran;
    bucket[profit] += totals.totalKeuntungan;
    bucket.count++;
    if (Object.prototype.hasOwnProperty.call(statusCounts, row.status)) statusCounts[row.status]++;
  }
  kpi.activeOrders = statusCounts["Belum Membayar"] + statusCounts["DP Terbayar"];
  return { kpi, statusCounts, monthlyData: [...months.values()] };
}

// Currency visibility depends on the orders' currency, never on profit's sign.
export function dashboardMoney(idr: number, jpy: number, hasIdr: boolean, hasJpy: boolean) {
  return {
    value: hasIdr || !hasJpy ? formatCurrency(idr, "IDR") : formatCurrency(jpy, "JPY"),
    sub: hasIdr && hasJpy ? formatCurrency(jpy, "JPY") : undefined,
  };
}
