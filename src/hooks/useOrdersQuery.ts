import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ExtendedOrder } from "../types";
import {
  fetchOrders,
  getOrdersPage,
  toExtended,
  type OrdersPageCursor,
  type OrdersPageFilters,
} from "../services/ordersFirebase";
import { filterOrders } from "../utils/orders";
import { compute } from "../utils/helpers";

const ORDERS_PAGE_SIZE = 15;

interface UseOrdersQueryProps {
  unitPrice: number;
  onOrdersUpdated?: (filtered: ExtendedOrder[]) => void;
}

function sortOrders(list: ExtendedOrder[], sortBy: string, sortOrder: "asc" | "desc", unitPrice: number) {
  return [...list].sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    if (sortBy === "keuntungan") {
      valA = compute(a, unitPrice).totalKeuntungan;
      valB = compute(b, unitPrice).totalKeuntungan;
    } else if (sortBy === "totalPembayaran") {
      valA = compute(a, unitPrice).totalPembayaran;
      valB = compute(b, unitPrice).totalPembayaran;
    } else if (sortBy === "namaPelanggan") {
      valA = String(a.namaPelanggan || "").toLocaleLowerCase("id-ID");
      valB = String(b.namaPelanggan || "").toLocaleLowerCase("id-ID");
    } else {
      valA = String(a.tanggal || "");
      valB = String(b.tanggal || "");
    }

    const primary = typeof valA === "string" && typeof valB === "string"
      ? valA.localeCompare(valB, "id-ID")
      : Number(valA || 0) - Number(valB || 0);
    if (primary !== 0) return sortOrder === "asc" ? primary : -primary;
    return sortOrder === "asc"
      ? String(a.id || "").localeCompare(String(b.id || ""))
      : String(b.id || "").localeCompare(String(a.id || ""));
  });
}

export function useOrdersQuery({ unitPrice, onOrdersUpdated }: UseOrdersQueryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.trim() ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sortBy") ?? "tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [allOrders, setAllOrders] = useState<ExtendedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [renderLimit, setRenderLimit] = useState(ORDERS_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("to") ?? "");
  const cursorRef = useRef<OrdersPageCursor | undefined>(undefined);
  const requestKeyRef = useRef(0);

  const orders = useMemo(() => filterOrders(allOrders, {
    q: searchTerm,
    status: statusFilter,
    from: dateFrom,
    to: dateTo,
  }), [allOrders, searchTerm, statusFilter, dateFrom, dateTo]);
  useEffect(() => { onOrdersUpdated?.(orders); }, [orders, onOrdersUpdated]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(q.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  // Sync filters to URL search params.
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

  const pageFilters = useMemo<OrdersPageFilters>(() => ({
    status: statusFilter || undefined,
    fromInput: dateFrom || undefined,
    toInput: dateTo || undefined,
    sortBy,
    sortOrder,
  }), [statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = ++requestKeyRef.current;
    cursorRef.current = undefined;
    setAllOrders([]);
    setHasMore(false);
    setRenderLimit(ORDERS_PAGE_SIZE);
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    const load = async () => {
      try {
        if (searchTerm) {
          // Firestore cannot query arbitrary substring matches. Read only after
          // the debounce, within the active status/date scope, then match locally.
          const rows = (await fetchOrders(pageFilters)).map(toExtended);
          const filtered = filterOrders(rows, { q: searchTerm, status: statusFilter, from: dateFrom, to: dateTo });
          if (!cancelled && requestKeyRef.current === requestKey) {
            setAllOrders(sortOrders(filtered, sortBy, sortOrder, unitPrice));
            setHasMore(filtered.length > ORDERS_PAGE_SIZE);
            setLoading(false);
          }
          return;
        }

        const page = await getOrdersPage(pageFilters, ORDERS_PAGE_SIZE);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setAllOrders(page.rows.map(toExtended));
          cursorRef.current = page.cursor;
          setHasMore(page.hasMore);
          setLoading(false);
        }
      } catch (err) {
        console.error("load orders page error:", err);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setAllOrders([]);
          setHasMore(false);
          setError("Pesanan gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
          setLoading(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [pageFilters, searchTerm, statusFilter, dateFrom, dateTo, sortBy, sortOrder, unitPrice, reloadKey]);

  const sortedOrders = useMemo(() => searchTerm
    ? sortOrders(orders, sortBy, sortOrder, unitPrice)
    : orders,
  [orders, searchTerm, sortBy, sortOrder, unitPrice]);

  const displayedOrders = useMemo(
    () => sortedOrders.slice(0, renderLimit),
    [sortedOrders, renderLimit],
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    if (searchTerm) {
      const nextLimit = renderLimit + ORDERS_PAGE_SIZE;
      setRenderLimit(nextLimit);
      setHasMore(nextLimit < sortedOrders.length);
      return;
    }

    const requestKey = requestKeyRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getOrdersPage(pageFilters, ORDERS_PAGE_SIZE, cursorRef.current);
      if (requestKeyRef.current !== requestKey) return;
      setAllOrders((previous) => {
        const seen = new Set(previous.map((row) => row.id));
        return [...previous, ...page.rows.map(toExtended).filter((row) => !seen.has(row.id))];
      });
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
      setRenderLimit((previous) => previous + page.rows.length);
    } catch (err) {
      console.error("load more orders error:", err);
      if (requestKeyRef.current === requestKey) {
        setError("Pesanan berikutnya gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
      }
    } finally {
      if (requestKeyRef.current === requestKey) setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, searchTerm, renderLimit, sortedOrders.length, pageFilters]);

  const fetchAllFilteredOrders = useCallback(async () => {
    const rows = (await fetchOrders(pageFilters)).map(toExtended);
    return sortOrders(filterOrders(rows, {
      q: q.trim(),
      status: statusFilter,
      from: dateFrom,
      to: dateTo,
    }), sortBy, sortOrder, unitPrice);
  }, [pageFilters, q, statusFilter, dateFrom, dateTo, sortBy, sortOrder, unitPrice]);

  const metrics = useMemo(() => {
    let totalKg = 0;
    let unpaidCount = 0;
    let pureUnpaidCount = 0;
    let dpCount = 0;
    let paidCount = 0;

    orders.forEach((order) => {
      const comp = compute(order, unitPrice);
      totalKg += comp.kg;
      if (order.status === "Selesai") {
        paidCount++;
      } else {
        unpaidCount++;
        if (order.status === "DP Terbayar") dpCount++;
        else pureUnpaidCount++;
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

  return {
    error,
    retry: () => setReloadKey((value) => value + 1),
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
    loadingMore,
    hasMore,
    loadMore,
    fetchAllFilteredOrders,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortedOrders,
    displayedOrders,
    metrics,
  };
}
