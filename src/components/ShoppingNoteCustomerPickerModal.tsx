import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Search, UserRound, UserRoundX } from "lucide-react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getCustomersPage } from "../services/customersFirebase";
import type { Customer } from "../types";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

const CUSTOMER_PAGE_SIZE = 15;

export function ShoppingNoteCustomerPickerModal({
  selectedCustomerId,
  onClose,
  onSelect,
}: {
  selectedCustomerId?: string;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<Customer[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const searchVersion = searchVersionRef.current + 1;
    searchVersionRef.current = searchVersion;
    setRows([]);
    setCursor(undefined);
    setHasMore(false);
    setLoadError("");
    setLoading(true);
    setLoadingMore(false);

    getCustomersPage({ pageSize: CUSTOMER_PAGE_SIZE, search: searchTerm })
      .then((page) => {
        if (cancelled) return;
        setRows(page.rows);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Daftar pelanggan gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [searchTerm, retryToken]);

  async function loadMore() {
    if (!cursor || !hasMore || loadingMore) return;
    const searchVersion = searchVersionRef.current;
    setLoadingMore(true);
    setLoadError("");
    try {
      const page = await getCustomersPage({
        pageSize: CUSTOMER_PAGE_SIZE,
        search: searchTerm,
        cursor,
      });
      if (searchVersion !== searchVersionRef.current) return;
      setRows((current) => [...current, ...page.rows]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (error) {
      if (searchVersion === searchVersionRef.current) {
        setLoadError(error instanceof Error ? error.message : "Daftar pelanggan gagal dimuat.");
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Modal title="Pilih Pelanggan" onClose={onClose} size="md" contentClassName="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama pelanggan..."
          aria-label="Cari nama pelanggan"
          className="min-h-[44px] w-full rounded-xl border border-surface-border bg-white pl-10 pr-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
        />
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 text-left text-sm font-semibold text-slate-500 transition-colors hover:border-brand-navy/30 hover:bg-slate-50"
      >
        <UserRoundX className="h-4 w-4 shrink-0" />
        Tanpa pelanggan
      </button>

      {loadError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => setRetryToken((value) => value + 1)}>Coba lagi</Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Memuat pelanggan...
        </div>
      ) : !loadError && rows.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-400">
          {searchTerm ? "Pelanggan tidak ditemukan." : "Belum ada data pelanggan."}
        </div>
      ) : (
        <>
          <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {rows.map((customer) => (
                <motion.button
                  key={customer.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onClick={() => onSelect(customer)}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors ${
                    customer.id === selectedCustomerId
                      ? "border-brand-navy/30 bg-brand-mist/50 text-brand-navyDark"
                      : "border-surface-border bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-navy/5 text-brand-navy">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{customer.nama}</span>
                  {customer.id === selectedCustomerId && <span className="text-xs font-extrabold text-brand-navy">Dipilih</span>}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          {hasMore && (
            <Button variant="outline" className="w-full" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loadingMore ? "Memuat..." : "Muat pelanggan lainnya"}
            </Button>
          )}
        </>
      )}
    </Modal>
  );
}
