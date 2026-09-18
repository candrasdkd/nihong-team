import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ExtendedOrder } from "../types";
import { subscribeOrders, toExtended } from "../services/ordersFirebase";
import { filterOrders } from "../utils/orders";
import { compute } from "../utils/helpers";

interface UseOrdersQueryProps {
  unitPrice: number;
  onOrdersUpdated?: (filtered: ExtendedOrder[]) => void;
}

export function useOrdersQuery({ unitPrice, onOrdersUpdated }: UseOrdersQueryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sortBy") ?? "tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [allOrders, setAllOrders] = useState<ExtendedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [renderLimit, setRenderLimit] = useState(50);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("to") ?? "");

  const orders = useMemo(() => filterOrders(allOrders, { q, status: statusFilter, from: dateFrom, to: dateTo }), [allOrders, q, statusFilter, dateFrom, dateTo]);
  useEffect(() => { onOrdersUpdated?.(orders); }, [orders, onOrdersUpdated]);

  // Sync filters to URL search params
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      q ? next.set("q", q) : next.delete("q");
      statusFilter ? next.set("status", statusFilter) : next.delete("status");
      sortBy !== "tanggal" ? next.set("sortBy", sortBy) : next.delete("sortBy");
      dateFrom ? next.set("from", dateFrom) : next.delete("from");
      dateTo ? next.set("to", dateTo) : next.delete("to");
      return next;
    }, { replace: true });
  }, [q, statusFilter, sortBy, dateFrom, dateTo, setSearchParams]);

  // Client-side sorting based on active filters
  const sortedOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === "keuntungan") {
        const compA = compute(a, unitPrice);
        const compB = compute(b, unitPrice);
        valA = compA.totalKeuntungan;
        valB = compB.totalKeuntungan;
      } else if (sortBy === "totalPembayaran") {
        const compA = compute(a, unitPrice);
        const compB = compute(b, unitPrice);
        valA = compA.totalPembayaran;
        valB = compB.totalPembayaran;
      } else if (sortBy === "namaPelanggan") {
        valA = String(a.namaPelanggan || "").toLowerCase();
        valB = String(b.namaPelanggan || "").toLowerCase();
      } else {
        valA = String(a.tanggal || "");
        valB = String(b.tanggal || "");
      }

      let primaryResult = 0;
      if (typeof valA === "string" && typeof valB === "string") {
        primaryResult = sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        primaryResult = sortOrder === "asc" ? numA - numB : numB - numA;
      }

      if (primaryResult !== 0) return primaryResult;

      // Secondary sort: createdAt
      const getTimestamp = (val: any): number => {
        if (!val) return 0;
        if (typeof val === "number") return val;
        if (typeof val.toMillis === "function") return val.toMillis();
        if (val.seconds !== undefined) return val.seconds * 1000;
        return 0;
      };
      const timeA = getTimestamp(a.createdAt);
      const timeB = getTimestamp(b.createdAt);
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [orders, sortBy, sortOrder, unitPrice]);

  const displayedOrders = useMemo(() => {
    return sortedOrders.slice(0, renderLimit);
  }, [sortedOrders, renderLimit]);

  const metrics = useMemo(() => {
    let totalKg = 0;
    let unpaidCount = 0;
    let pureUnpaidCount = 0;
    let dpCount = 0;
    let paidCount = 0;

    orders.forEach((o) => {
      const comp = compute(o, unitPrice);
      totalKg += comp.kg;
      if (o.status === "Selesai") {
        paidCount++;
      } else {
        unpaidCount++;
        if (o.status === "DP Terbayar") {
          dpCount++;
        } else {
          pureUnpaidCount++;
        }
      }
    });

    return {
      totalOrders: orders.length,
      totalKg: Math.round(totalKg * 10) / 10,
      unpaidCount,
      pureUnpaidCount,
      dpCount,
      paidCount,
      unpaidPercent: orders.length > 0 ? Math.round((unpaidCount / orders.length) * 100) : 0,
      paidPercent: orders.length > 0 ? Math.round((paidCount / orders.length) * 100) : 0,
    };
  }, [orders, unitPrice]);

  useEffect(() => {
    setRenderLimit(50);
  }, [q, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Load the full private dataset once. Filters, exports and sorting share it;
    // the 50-row limit applies only to rendering.
    return subscribeOrders({ fromInput: "", toInput: "", limit: null, sort: "desc" }, rows => {
      setAllOrders(rows.map(toExtended));
      setLoading(false);
      setError(null);
    }, () => {
      setAllOrders([]);
      setLoading(false);
      setError("Pesanan gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
    });
  }, [reloadKey]);

  useEffect(() => {
    function handleScroll() {
      if (!loading && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 150) {
        setRenderLimit(previous => Math.min(previous + 50, Math.max(50, sortedOrders.length)));
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, sortedOrders.length]);

  return {
    error, retry: () => setReloadKey(value => value + 1),
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    orders,
    renderLimit,
    setRenderLimit,
    loading,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortedOrders,
    displayedOrders,
    metrics,
  };
}
