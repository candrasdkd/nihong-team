import { useEffect, useMemo, useRef, useState } from "react";
import { DepartureSchedule, Jastiper } from "../types";
import {
  fetchSchedules,
  getScheduleCount,
  getSchedulesPage,
  SchedulesPageCursor,
  addSchedule,
  updateSchedule,
  deleteSchedule,
} from "../services/schedulesFirebase";
import { listenJastipers } from "../services/jastipersFirebase";

export const SCHEDULE_PAGE_SIZE = 15;

export function useSchedules(showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void) {
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [searchResults, setSearchResults] = useState<DepartureSchedule[] | null>(null);
  const [jastipers, setJastipers] = useState<Jastiper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchVisibleCount, setSearchVisibleCount] = useState(SCHEDULE_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>("Open");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DepartureSchedule | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const cursorRef = useRef<SchedulesPageCursor | undefined>(undefined);
  const requestKeyRef = useRef(0);
  const closingIdsRef = useRef(new Set<string>());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(q.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    const unsubJ = listenJastipers((rows) => setJastipers(rows));
    return () => unsubJ();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const filteredCountRequest = getScheduleCount({ status: statusFilter });
    const openCountRequest = statusFilter === "Open"
      ? filteredCountRequest
      : getScheduleCount({ status: "Open" });
    Promise.all([
      filteredCountRequest,
      openCountRequest,
    ]).then(([filteredCount, open]) => {
      if (!cancelled) {
        setTotalCount(filteredCount);
        setOpenCount(open);
      }
    }).catch((err: unknown) => {
      console.error("load schedule counts error:", err);
    });
    return () => { cancelled = true; };
  }, [statusFilter, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = ++requestKeyRef.current;
    cursorRef.current = undefined;
    setSchedules([]);
    setSearchResults(null);
    setHasMore(false);
    setLoadingMore(false);
    setSearchVisibleCount(SCHEDULE_PAGE_SIZE);
    setLoading(true);

    const load = async () => {
      try {
        if (searchTerm) {
          // Firestore cannot find arbitrary substrings. Only scan after debounce,
          // and keep the selected status filter in the server query.
          const rows = await fetchSchedules({ status: statusFilter });
          const normalized = searchTerm.toLocaleLowerCase();
          const matches = rows.filter((schedule) =>
            schedule.rute.toLocaleLowerCase().includes(normalized)
            || schedule.namaJastiper.toLocaleLowerCase().includes(normalized),
          );
          if (!cancelled && requestKeyRef.current === requestKey) {
            setSearchResults(matches);
            setHasMore(matches.length > SCHEDULE_PAGE_SIZE);
            setTotalCount(matches.length);
            setLoading(false);
          }
          return;
        }

        const page = await getSchedulesPage({ status: statusFilter }, SCHEDULE_PAGE_SIZE);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setSchedules(page.rows);
          cursorRef.current = page.cursor;
          setHasMore(page.hasMore);
          setLoading(false);
        }
      } catch (err) {
        console.error("load schedules page error:", err);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setSchedules([]);
          setSearchResults(null);
          setHasMore(false);
          setLoading(false);
          toastRef.current?.("Jadwal gagal dimuat. Periksa koneksi lalu coba lagi.", "error");
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [searchTerm, statusFilter, refreshKey]);

  // Keep the existing behavior that automatically closes expired open schedules,
  // but only for documents already fetched for this page/search.
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const rowsToCheck = searchResults ?? schedules;
    const expired = rowsToCheck.filter((schedule) =>
      schedule.status === "Open"
      && schedule.tanggalBerangkat < todayStr
      && !closingIdsRef.current.has(schedule.id),
    );
    if (!expired.length) return;

    expired.forEach((schedule) => closingIdsRef.current.add(schedule.id));
    Promise.all(expired.map(async (schedule) => {
      try {
        await updateSchedule(schedule.id, { status: "Closed" });
        return true;
      } catch {
        return false;
      }
    }))
      .then((results) => {
        if (results.some(Boolean)) setRefreshKey((value) => value + 1);
      })
      .finally(() => expired.forEach((schedule) => closingIdsRef.current.delete(schedule.id)));
  }, [schedules, searchResults]);

  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast?.(message, type);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    if (searchResults) {
      setSearchVisibleCount((count) => count + SCHEDULE_PAGE_SIZE);
      return;
    }
    if (!cursorRef.current) return;

    const requestKey = requestKeyRef.current;
    setLoadingMore(true);
    try {
      const page = await getSchedulesPage({ status: statusFilter }, SCHEDULE_PAGE_SIZE, cursorRef.current);
      if (requestKey !== requestKeyRef.current) return;
      setSchedules((current) => [...current, ...page.rows]);
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
    } catch (err) {
      console.error("load more schedules error:", err);
      toast("Jadwal berikutnya gagal dimuat", "error");
    } finally {
      if (requestKey === requestKeyRef.current) setLoadingMore(false);
    }
  };

  async function handleSubmit(data: Omit<DepartureSchedule, "id" | "createdAt" | "updatedAt" | "beratTerpakai">) {
    if (editing) {
      await updateSchedule(editing.id, data);
      toast("Jadwal berhasil diperbarui");
    } else {
      await addSchedule(data);
      toast("Jadwal keberangkatan berhasil dibuat");
    }
    setRefreshKey((value) => value + 1);
  }

  function handleDelete(s: DepartureSchedule) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Jadwal",
      message: `Yakin ingin menghapus jadwal "${s.rute}" tanggal ${s.tanggalBerangkat}?`,
      onConfirm: async () => {
        try {
          await deleteSchedule(s.id);
          toast("Jadwal berhasil dihapus");
          setRefreshKey((value) => value + 1);
        } catch {
          toast("Gagal menghapus jadwal", "error");
        }
      },
    });
  }

  const visibleSchedules = useMemo(() => searchResults
    ? searchResults.slice(0, searchVisibleCount)
    : schedules,
  [searchResults, searchVisibleCount, schedules]);
  const resultCount = searchResults ? searchResults.length : totalCount;
  const loadedCount = visibleSchedules.length;

  return {
    schedules,
    jastipers,
    loading,
    loadingMore,
    hasMore,
    q,
    setQ,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    filtered: visibleSchedules,
    visibleSchedules,
    resultCount,
    loadedCount,
    isSearching: Boolean(searchTerm),
    openCount,
    loadMore,
    handleSubmit,
    handleDelete,
  };
}
