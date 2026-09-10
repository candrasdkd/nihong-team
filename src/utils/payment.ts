import type { Order, OrderStatus } from "../types";

export function getPaymentSummary(
  order: Pick<Order, "dpNominal" | "pelunasanNominal">,
  total: number,
) {
  const dp = Math.max(0, Number(order.dpNominal) || 0);
  const settlement = Math.max(0, Number(order.pelunasanNominal) || 0);
  const paid = dp + settlement;
  const remaining = Math.max(0, total - paid);
  const percent = total > 0 ? Math.min(100, Math.floor((paid / total) * 100)) : 0;
  const status: OrderStatus = total > 0 && paid >= total
    ? "Selesai"
    : paid > 0 ? "DP Terbayar" : "Belum Membayar";

  return { dp, settlement, paid, remaining, percent, status };
}
