import { useEffect, useMemo, useState } from "react";
import { ExtendedOrder } from "../types";
import { subscribeOrders, toExtended } from "../services/ordersFirebase";
import { compute } from "../utils/helpers";

interface UseOrdersQueryProps {
  unitPrice: number;
  onOrdersUpdated?: (filtered: ExtendedOrder[]) => void;
}

export function useOrdersQuery({ unitPrice, onOrdersUpdated }: UseOrdersQueryProps) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [limitValue, setLimitValue] = useState(50);
  const [renderLimit, setRenderLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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
    let paidCount = 0;

    orders.forEach((o) => {
      const comp = compute(o, unitPrice);
      totalKg += comp.kg;
      if (o.status === "Belum Membayar") {
        unpaidCount++;
      } else {
        paidCount++;
      }
    });

    return {
      totalOrders: orders.length,
      totalKg: Math.round(totalKg * 10) / 10,
      unpaidCount,
      paidCount,
      unpaidPercent: orders.length > 0 ? Math.round((unpaidCount / orders.length) * 100) : 0,
      paidPercent: orders.length > 0 ? Math.round((paidCount / orders.length) * 100) : 0,
    };
  }, [orders, unitPrice]);

  useEffect(() => {
    setLimitValue(50);
    setRenderLimit(50);
  }, [q, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    const isSearching = q.trim() !== "";
    const isSortingNonDate = sortBy !== "tanggal";
    const queryLimit = (isSearching || isSortingNonDate) ? undefined : limitValue;
    const querySort = sortBy === "tanggal" ? (sortOrder as "asc" | "desc") : "desc";

    const unsub = subscribeOrders(
      {
        status: statusFilter,
        fromInput: dateFrom,
        toInput: dateTo,
        limit: queryLimit,
        sort: querySort,
      },
      (rows) => {
        const ex = rows.map(toExtended);
        const filtered = q ? ex.filter((o) => matchSearch(o, q)) : ex;
        setOrders(filtered);
        if (onOrdersUpdated) {
          onOrdersUpdated(filtered);
        }
        setLoading(false);
      },
    );
    return () => unsub();
  }, [q, statusFilter, dateFrom, dateTo, limitValue, sortBy, sortOrder]);

  useEffect(() => {
    function handleScroll() {
      if (loading) return;

      const threshold = 150;
      const isNearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - threshold;

      if (!isNearBottom) return;

      const isSearching = q.trim() !== "";
      const isSortingNonDate = sortBy !== "tanggal";

      if (isSearching || isSortingNonDate) {
        if (renderLimit < sortedOrders.length) {
          setRenderLimit((prev) => prev + 50);
        }
      } else {
        if (orders.length >= limitValue) {
          setLimitValue((prev) => prev + 50);
        }
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [orders.length, sortedOrders.length, limitValue, renderLimit, loading, q, sortBy]);

  function matchSearch(o: ExtendedOrder, query: string) {
    if (!query) return true;
    const s = query.trim().toLowerCase();
    return [o.no, o.namaBarang, o.namaPelanggan, o.catatan].some((field) =>
      String(field ?? "")
        .toLowerCase()
        .includes(s),
    );
  }

  return {
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    orders,
    limitValue,
    setLimitValue,
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
