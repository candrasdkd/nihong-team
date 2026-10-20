import { useEffect, useRef, useState } from "react";
import { Jastiper } from "../types";
import {
  addJastiper,
  deleteJastiper,
  fetchJastipers,
  getJastiperMetrics,
  getJastipersPage,
  JastiperPageCursor,
  JastiperProfileFilter,
  updateJastiper,
} from "../services/jastipersFirebase";

export const JASTIPER_PAGE_SIZE = 15;

const matchesSearch = (jastiper: Jastiper, searchTerm: string) => {
  const search = searchTerm.toLocaleLowerCase();
  return [jastiper.nama, jastiper.noTelpon, jastiper.alamat]
    .some((value) => value?.toLocaleLowerCase().includes(search));
};

export function useJastipers(showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void) {
  const [pageJastipers, setPageJastipers] = useState<Jastiper[]>([]);
  const [searchResults, setSearchResults] = useState<Jastiper[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [profileFilter, setProfileFilter] = useState<JastiperProfileFilter>("all");
  const [pageHasMore, setPageHasMore] = useState(false);
  const [visibleSearchCount, setVisibleSearchCount] = useState(JASTIPER_PAGE_SIZE);
  const [metrics, setMetrics] = useState({ total: 0, contact: 0, complete: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Jastiper | null>(null);
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
  const cursorRef = useRef<JastiperPageCursor | undefined>(undefined);
  const requestKeyRef = useRef(0);
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(q.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setMetricsLoading(true);
    setMetricsError(false);
    getJastiperMetrics().then((nextMetrics) => {
      if (!cancelled) setMetrics(nextMetrics);
    }).catch((err: unknown) => {
      console.error("load jastiper metrics error:", err);
      if (!cancelled) setMetricsError(true);
    }).finally(() => {
      if (!cancelled) setMetricsLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = ++requestKeyRef.current;
    cursorRef.current = undefined;
    setPageJastipers([]);
    setSearchResults(null);
    setPageHasMore(false);
    setLoadingMore(false);
    setVisibleSearchCount(JASTIPER_PAGE_SIZE);
    setLoading(true);
    setLoadError(null);

    const load = async () => {
      try {
        if (searchTerm) {
          // Firestore has no arbitrary substring query; scan after debounce,
          // scoped to the selected profile filter, then page the matches locally.
          const rows = await fetchJastipers(profileFilter);
          const matches = rows.filter((jastiper) => matchesSearch(jastiper, searchTerm));
          if (!cancelled && requestKeyRef.current === requestKey) {
            setSearchResults(matches);
            setPageJastipers(matches.slice(0, JASTIPER_PAGE_SIZE));
            setPageHasMore(matches.length > JASTIPER_PAGE_SIZE);
            setLoading(false);
          }
          return;
        }

        const page = await getJastipersPage(profileFilter, JASTIPER_PAGE_SIZE);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setPageJastipers(page.rows);
          cursorRef.current = page.cursor;
          setPageHasMore(page.hasMore);
          setLoading(false);
        }
      } catch (err) {
        console.error("load jastiper page error:", err);
        if (!cancelled && requestKeyRef.current === requestKey) {
          setPageJastipers([]);
          setSearchResults(null);
          setPageHasMore(false);
          setLoadError("Jastiper gagal dimuat. Periksa koneksi atau akses akun, lalu coba lagi.");
          setLoading(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [profileFilter, refreshKey, searchTerm]);

  const jastipers = searchResults
    ? searchResults.slice(0, visibleSearchCount)
    : pageJastipers;
  const hasMore = searchResults
    ? visibleSearchCount < searchResults.length
    : pageHasMore;
  const resultCount = searchResults?.length ?? (
    metricsLoading || metricsError
      ? null
      : profileFilter === "complete"
        ? metrics.complete
        : profileFilter === "needs"
          ? metrics.total - metrics.complete
          : metrics.total
  );

  const toast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    toastRef.current?.(message, type);
  };

  const refreshJastipers = () => {
    cursorRef.current = undefined;
    setRefreshKey((value) => value + 1);
  };

  async function handleSubmit(data: Omit<Jastiper, "id" | "createdAt" | "updatedAt">) {
    if (editing) {
      await updateJastiper(editing.id, data);
      toast("Jastiper berhasil diperbarui");
    } else {
      await addJastiper(data);
      toast("Jastiper berhasil ditambahkan");
    }
    refreshJastipers();
  }

  function handleDelete(jastiper: Jastiper) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Jastiper",
      message: `Yakin ingin menghapus "${jastiper.nama}" dari daftar jastiper?`,
      onConfirm: async () => {
        try {
          await deleteJastiper(jastiper.id);
          toast("Jastiper berhasil dihapus");
          refreshJastipers();
        } catch {
          toast("Gagal menghapus jastiper", "error");
        }
      },
    });
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    if (searchResults) {
      setVisibleSearchCount((count) => count + JASTIPER_PAGE_SIZE);
      return;
    }
    if (!cursorRef.current) return;

    const requestKey = requestKeyRef.current;
    setLoadingMore(true);
    try {
      const page = await getJastipersPage(profileFilter, JASTIPER_PAGE_SIZE, cursorRef.current);
      if (requestKey !== requestKeyRef.current) return;
      setPageJastipers((current) => [...current, ...page.rows]);
      cursorRef.current = page.cursor;
      setPageHasMore(page.hasMore);
    } catch (err) {
      console.error("load more jastipers error:", err);
      toast("Jastiper berikutnya gagal dimuat", "error");
    } finally {
      if (requestKey === requestKeyRef.current) setLoadingMore(false);
    }
  };

  return {
    jastipers,
    loading,
    loadingMore,
    loadError,
    retry: refreshJastipers,
    hasMore,
    resultCount,
    loadedCount: jastipers.length,
    isSearching: Boolean(searchTerm),
    metrics,
    metricsLoading,
    metricsError,
    q,
    setQ,
    profileFilter,
    setProfileFilter,
    showForm,
    setShowForm,
    editing,
    setEditing,
    confirmModal,
    setConfirmModal,
    loadMore,
    handleSubmit,
    handleDelete,
  };
}
