import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where, type Query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Customer, OrderDoc, PeriodType } from "../types";
import { dashboardDateKey, dashboardRange } from "../utils/dashboard";

function useLiveQuery<T>(source: Query, label: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ source: Query; attempt: number; rows: T[]; loading: boolean; error: string | null }>(() => ({ source, attempt, rows: [], loading: true, error: null }));
  useEffect(() => {
    let active = true;
    const unsubscribe = onSnapshot(source, snapshot => {
      if (active) setState({ source, attempt, rows: snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as T), loading: false, error: null });
    }, () => {
      if (active) setState({ source, attempt, rows: [], loading: false, error: `Gagal memuat ${label}. Periksa koneksi dan akses akun, lalu coba lagi.` });
    });
    return () => { active = false; unsubscribe(); };
  }, [source, attempt, label]);
  // Hide the previous period immediately, even before the new effect runs.
  const current = state.source === source && state.attempt === attempt ? state : { rows: [] as T[], loading: true, error: null };
  return { ...current, retry: () => setAttempt(value => value + 1) };
}

export function useDashboardData(period: PeriodType) {
  const [today, setToday] = useState(() => dashboardDateKey(new Date()));
  useEffect(() => {
    const refreshDate = () => setToday(dashboardDateKey(new Date()));
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refreshDate, midnight.getTime() - now.getTime() + 100);
    window.addEventListener("focus", refreshDate);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refreshDate); };
  }, [today]);
  const range = useMemo(() => dashboardRange(period, today), [period, today]);
  const periodQuery = useMemo(() => query(collection(db, "orders"), where("tanggal", ">=", range.from), where("tanggal", "<=", range.to), orderBy("tanggal", "asc")), [range.from, range.to]);
  const recentQuery = useMemo(() => query(collection(db, "orders"), orderBy("tanggal", "desc"), limit(8)), []);
  const customerQuery = useMemo(() => query(collection(db, "customer")), []);
  const orders = useLiveQuery<OrderDoc>(periodQuery, "ringkasan pesanan");
  const recent = useLiveQuery<OrderDoc>(recentQuery, "pesanan terbaru");
  const customers = useLiveQuery<Customer>(customerQuery, "pelanggan");
  return { range, orders, recent, customers, retry: () => { orders.retry(); recent.retry(); customers.retry(); } };
}
