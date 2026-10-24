import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  LoaderCircle,
  ListPlus,
  Power,
  PowerOff,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { ShoppingNoteFormModal } from "../components/ShoppingNoteFormModal";
import { ShoppingNoteQuickCreateModal } from "../components/ShoppingNoteQuickCreateModal";
import { ShoppingNoteCustomerPickerModal } from "../components/ShoppingNoteCustomerPickerModal";
import { Button } from "../components/ui/Button";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";
import { formatIDR } from "../utils/format";
import { SHOPPING_NOTE_CATEGORIES, SHOPPING_NOTE_UNITS } from "../constants/shoppingNotes";
import type { Customer } from "../types";
import {
  createShoppingNote,
  createShoppingNotes,
  deleteShoppingNote,
  ensureShoppingNoteActiveFlags,
  getShoppingNotesPage,
  matchesShoppingNoteSearch,
  searchShoppingNotes,
  updateShoppingNoteActive,
  updateShoppingNoteField,
  updateShoppingNoteStatus,
  type ShoppingNote,
  type ShoppingNoteActiveFilter,
  type ShoppingNoteCustomer,
  type ShoppingNoteEditableField,
  type ShoppingNoteFilter,
  type ShoppingNotePayload,
  type ShoppingNoteStatus,
} from "../services/shoppingNotesFirebase";

const PAGE_SIZE = 50;
const FILTERS: ShoppingNoteFilter[] = ["Semua", "Belum", "Selesai"];
const ACTIVE_FILTERS: ShoppingNoteActiveFilter[] = ["Aktif", "Nonaktif"];
const SHOPPING_NOTE_NAME_COLLATOR = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });
type Toast = (message: string, type: "success" | "error" | "info" | "warning") => void;
type EditingCell = { noteId: string; field: ShoppingNoteEditableField };
type ShoppingNoteCustomerGroup = { key: string; customerName: string; notes: ShoppingNote[] };

export function ShoppingNotesPage() {
  const { showToast } = useOutletContext<{ showToast: Toast }>();
  const [filter, setFilter] = useState<ShoppingNoteFilter>("Semua");
  const [activeFilter, setActiveFilter] = useState<ShoppingNoteActiveFilter>("Aktif");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchRows, setSearchRows] = useState<ShoppingNote[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDisplayLimit, setSearchDisplayLimit] = useState(PAGE_SIZE);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>();
  const [rows, setRows] = useState<ShoppingNote[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const requestVersionRef = useRef(0);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [expandedMobileIds, setExpandedMobileIds] = useState<Set<string>>(() => new Set());
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingActiveId, setSavingActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingNote | null>(null);
  const [customerPickerTarget, setCustomerPickerTarget] = useState<ShoppingNote | null>(null);
  const searchMode = Boolean(searchInput.trim());

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchTerm(searchInput.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (searchInput.trim() !== debouncedSearchTerm) {
      setSearchRows([]);
      setSearchDisplayLimit(PAGE_SIZE);
    }
  }, [searchInput, debouncedSearchTerm]);

  useEffect(() => {
    if (!searchMode || !debouncedSearchTerm || searchInput.trim() !== debouncedSearchTerm) return;
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchRows([]);
    setSearchDisplayLimit(PAGE_SIZE);
    setLoadError("");

    ensureShoppingNoteActiveFlags()
      .then(() => searchShoppingNotes(debouncedSearchTerm, filter, activeFilter === "Aktif", controller.signal))
      .then((matches) => {
        if (!controller.signal.aborted) setSearchRows(matches);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSearchRows([]);
        setLoadError(error instanceof Error ? error.message : "Pencarian catatan belanja gagal.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchLoading(false);
      });

    return () => controller.abort();
  }, [searchMode, searchInput, debouncedSearchTerm, filter, activeFilter, retryToken]);

  useEffect(() => {
    let cancelled = false;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setLoadingMore(false);
    setLoadError("");
    setRows([]);
    setExpandedMobileIds(new Set());
    setCursor(undefined);
    setHasMore(false);

    if (searchMode) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    ensureShoppingNoteActiveFlags()
      .then(() => getShoppingNotesPage(filter, activeFilter === "Aktif", undefined, PAGE_SIZE))
      .then((result) => {
        if (cancelled || requestVersionRef.current !== requestVersion) return;
        setRows(result.rows);
        setCursor(result.cursor);
        setHasMore(result.hasMore);
      })
      .catch((error: unknown) => {
        if (cancelled || requestVersionRef.current !== requestVersion) return;
        setRows([]);
        setHasMore(false);
        setLoadError(error instanceof Error ? error.message : "Catatan belanja gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled && requestVersionRef.current === requestVersion) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filter, activeFilter, retryToken, searchMode]);

  function refreshFromFirstPage() {
    setRetryToken((value) => value + 1);
  }

  function selectFilter(nextFilter: ShoppingNoteFilter) {
    if (filter === nextFilter) return;
    setFilter(nextFilter);
  }

  function selectActiveFilter(nextFilter: ShoppingNoteActiveFilter) {
    if (activeFilter === nextFilter) return;
    setActiveFilter(nextFilter);
  }

  function updateVisibleNotes(update: (current: ShoppingNote[]) => ShoppingNote[]) {
    if (!searchMode) {
      setRows(update);
      return;
    }
    setSearchRows((current) => update(current).filter((note) => matchesShoppingNoteSearch(note, searchInput)));
  }

  async function loadMore() {
    if (!hasMore || !cursor || loadingMore) return;
    const requestVersion = requestVersionRef.current;
    setLoadingMore(true);
    setLoadError("");
    try {
      const result = await getShoppingNotesPage(filter, activeFilter === "Aktif", cursor, PAGE_SIZE);
      if (requestVersionRef.current !== requestVersion) return;
      setRows((current) => [...current, ...result.rows]);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (error) {
      if (requestVersionRef.current === requestVersion) {
        setLoadError(error instanceof Error ? error.message : "Catatan berikutnya gagal dimuat.");
      }
    } finally {
      if (requestVersionRef.current === requestVersion) setLoadingMore(false);
    }
  }

  function loadMoreVisible() {
    if (searchMode) {
      setSearchDisplayLimit((current) => current + PAGE_SIZE);
      return;
    }
    void loadMore();
  }

  async function saveNewNote(payload: ShoppingNotePayload) {
    await createShoppingNote(payload);
    showToast("Catatan belanja berhasil ditambahkan.", "success");
    refreshFromFirstPage();
  }

  async function saveQuickNotes(payloads: ShoppingNotePayload[]) {
    await createShoppingNotes(payloads);
    showToast(`${payloads.length} catatan belanja berhasil ditambahkan.`, "success");
    refreshFromFirstPage();
  }

  async function saveInlineField(note: ShoppingNote, field: ShoppingNoteEditableField, rawValue: string) {
    setEditingCell(null);
    let value: string | number = rawValue;

    if (field === "jumlah" || field === "harga") {
      value = Number(rawValue.replace(",", "."));
      if (!Number.isFinite(value)) {
        showToast("Nilai angka tidak valid.", "warning");
        return;
      }
      if (field === "jumlah" && value <= 0) {
        showToast("Jumlah harus lebih besar dari 0.", "warning");
        return;
      }
      if (field === "harga" && value < 0) {
        showToast("Harga tidak boleh kurang dari 0.", "warning");
        return;
      }
    } else {
      value = rawValue.trim();
      if (field !== "catatan" && !value) {
        showToast("Kategori, nama barang, dan satuan wajib diisi.", "warning");
        return;
      }
    }

    if (value === note[field]) return;
    const key = `${note.id}:${field}`;
    setSavingCell(key);
    try {
      await updateShoppingNoteField(note.id, field, value);
      updateVisibleNotes((current) => current.map((row) => row.id === note.id ? { ...row, [field]: value } : row));
      showToast("Perubahan barang tersimpan.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Perubahan gagal disimpan.", "error");
    } finally {
      setSavingCell(null);
    }
  }

  async function toggleStatus(note: ShoppingNote) {
    const nextStatus: ShoppingNoteStatus = note.status === "Selesai" ? "Belum" : "Selesai";
    setSavingStatusId(note.id);
    try {
      await updateShoppingNoteStatus(note.id, nextStatus);
      updateVisibleNotes((current) => current.flatMap((row) => {
        if (row.id !== note.id) return [row];
        if (filter !== "Semua" && filter !== nextStatus) return [];
        return [{ ...row, status: nextStatus }];
      }));
      showToast(nextStatus === "Selesai" ? "Barang ditandai selesai dibeli." : "Status barang dikembalikan ke belum dibeli.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Status barang gagal diperbarui.", "error");
    } finally {
      setSavingStatusId(null);
    }
  }

  async function toggleActive(note: ShoppingNote) {
    const nextActive = !note.aktif;
    setSavingActiveId(note.id);
    try {
      await updateShoppingNoteActive(note.id, nextActive);
      updateVisibleNotes((current) => current.filter((row) => row.id !== note.id));
      showToast(nextActive ? "Barang dimasukkan ke batch aktif." : "Barang dinonaktifkan dan tidak muncul di batch aktif.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Status batch gagal diperbarui.", "error");
    } finally {
      setSavingActiveId(null);
    }
  }

  async function saveCustomer(note: ShoppingNote, customer: Customer | null) {
    const value: ShoppingNoteCustomer | null = customer?.id
      ? { id: customer.id, nama: customer.nama }
      : null;
    setCustomerPickerTarget(null);
    if (value?.id === note.pelanggan?.id && value?.nama === note.pelanggan?.nama) return;

    const key = `${note.id}:pelanggan`;
    setSavingCell(key);
    try {
      await updateShoppingNoteField(note.id, "pelanggan", value);
      updateVisibleNotes((current) => current.map((row) => row.id === note.id ? { ...row, pelanggan: value } : row));
      showToast("Pelanggan berhasil diperbarui.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Pelanggan gagal diperbarui.", "error");
    } finally {
      setSavingCell(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteShoppingNote(deleteTarget.id);
      showToast("Catatan belanja berhasil dihapus.", "success");
      updateVisibleNotes((current) => current.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Catatan belanja gagal dihapus.", "error");
      throw error;
    }
  }

  const inlineProps = {
    editingCell,
    savingCell,
    onStartEdit: setEditingCell,
    onSave: saveInlineField,
    onCancel: () => setEditingCell(null),
  };
  const allVisibleScopeRows = searchMode ? searchRows : rows;
  const visibleRows = searchMode ? searchRows.slice(0, searchDisplayLimit) : rows;
  const desktopGroups = groupShoppingNotesByCustomer(visibleRows);
  const totalHargaDimuat = allVisibleScopeRows.reduce((total, note) => total + (note.harga > 0 ? note.harga : 0), 0);
  const visibleHasMore = searchMode ? searchRows.length > searchDisplayLimit : hasMore;
  const listIsLoading = searchMode
    ? searchLoading || searchInput.trim() !== debouncedSearchTerm
    : loading;

  return (
    <div className="min-h-screen bg-surface-base pb-28 font-sans text-slate-800">
      <div className="page-container space-y-4 sm:space-y-6">
        <HeroPageHeader
          badgeIcon={ShoppingBasket}
          badgeLabel="Daftar Pembelian"
          title="Catatan Belanja"
          description="Catat kebutuhan belanja jastip per kategori dan pelanggan, lalu tandai barang setelah dibeli."
          mobileSubtitle="Ketuk barang untuk melihat detail. Ketuk nilainya untuk mengedit."
          action={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setQuickCreateOpen(true)}><ListPlus className="h-4 w-4" /> Tambah Cepat</Button>
              <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Tambah Barang</Button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <Button
            variant="outline"
            onClick={() => setQuickCreateOpen(true)}
            className="min-h-[48px] rounded-2xl border-brand-navy/15 bg-white px-2 text-sm font-extrabold text-brand-navy shadow-sm active:scale-[0.98]"
          >
            <ListPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">Tambah Cepat</span>
          </Button>
          <Button
            onClick={() => setFormOpen(true)}
            className="min-h-[48px] rounded-2xl bg-brand-orange px-2 text-sm font-extrabold shadow-[0_8px_18px_rgba(242,101,34,0.2)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">Tambah Barang</span>
          </Button>
        </div>

        <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card">
          <div className="border-b border-slate-100 p-3 sm:p-4">
            <label htmlFor="shopping-notes-search" className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Cari catatan
            </label>
            <div className="relative mt-1.5 max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="shopping-notes-search"
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nama barang, pelanggan, kategori, satuan, catatan…"
                autoComplete="off"
                className="min-h-[48px] w-full rounded-xl border border-surface-border bg-white py-3 pl-10 pr-10 text-base text-slate-800 outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              Pencarian memeriksa semua catatan pada filter batch {activeFilter.toLowerCase()} dan status {filter.toLowerCase()}.
            </p>
          </div>
          <div className="space-y-4 border-b border-slate-100 p-3 md:flex md:items-center md:justify-between md:gap-4 md:space-y-0 sm:p-4">
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-brand-navyDark">Daftar Barang</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">Barang nonaktif tidak ikut batch belanjaan aktif berikutnya.</p>
            </div>
            <div className="grid min-w-0 gap-3 md:flex md:shrink-0 md:items-center md:gap-4">
              <div className="min-w-0 space-y-1.5 sm:flex sm:items-center sm:gap-2">
                <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 sm:shrink-0">Batch</span>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:flex sm:bg-transparent sm:p-0">
                  {ACTIVE_FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectActiveFilter(item)}
                      aria-pressed={activeFilter === item}
                      className={`inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-xl px-3 text-sm font-extrabold transition-colors ${
                        activeFilter === item ? "bg-brand-navy text-white shadow-sm sm:border sm:border-brand-navy" : "text-slate-500 hover:text-slate-800 sm:border sm:border-slate-200 sm:bg-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-w-0 space-y-1.5 sm:flex sm:items-center sm:gap-2">
                <span className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 sm:shrink-0">Barang</span>
                <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 sm:bg-transparent sm:p-0">
                  {FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectFilter(item)}
                      aria-pressed={filter === item}
                      className={`inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-xl px-2 text-sm font-extrabold transition-colors sm:px-3 ${
                        filter === item ? "bg-brand-navy text-white shadow-sm sm:border sm:border-brand-navy" : "text-slate-500 hover:text-slate-800 sm:border sm:border-slate-200 sm:bg-white"
                      }`}
                    >
                      {item === "Belum" ? "Belum" : item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loadError && (
            <div role="alert" className="m-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button variant="secondary" onClick={() => setRetryToken((value) => value + 1)}>Coba lagi</Button>
            </div>
          )}

          {listIsLoading ? (
            <div className="animate-pulse space-y-3 p-4">
              {searchMode && <p className="animate-none text-xs font-medium text-slate-400">Mencari di seluruh catatan pada filter yang dipilih…</p>}
              {[1, 2, 3, 4, 5].map((skeleton) => (
                <div key={skeleton} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-2/5 rounded bg-slate-100" /><div className="h-3 w-1/4 rounded bg-slate-50" /></div>
                  <div className="h-8 w-20 rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          ) : loadError && visibleRows.length === 0 ? null : visibleRows.length === 0 ? (
            <>
              <div className="flex flex-col items-center px-5 py-16 text-center sm:py-20">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-brand-mist bg-brand-mist/70 text-brand-navy">
                  {searchMode ? <Search className="h-6 w-6" /> : filter === "Semua" ? <ClipboardList className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <h3 className="text-base font-extrabold text-slate-700">
                  {searchMode ? "Tidak ada hasil pencarian" : filter === "Semua" ? "Belum ada catatan belanja" : `Belum ada barang dengan status ${filter.toLowerCase()}`}
                </h3>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-400">
                  {searchMode
                    ? `Tidak ada catatan yang cocok dengan “${searchInput.trim()}”.`
                    : filter === "Semua"
                      ? "Tambahkan barang pertama untuk mulai menyusun daftar belanja."
                      : "Coba filter lain atau tambahkan barang baru."}
                </p>
              </div>
              {visibleHasMore && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-4 text-center sm:px-4">
                  <Button variant="outline" onClick={loadMoreVisible} isLoading={searchMode ? false : loadingMore}>
                    Muat 50 {searchMode ? "hasil" : "catatan"} lagi
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[1400px] w-full text-sm">
                  <thead className="border-b border-surface-border bg-brand-navy text-white">
                    <tr className="text-left">
                      <th className="w-[220px] px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide">Kategori</th>
                      <th className="w-[190px] px-3 py-3 text-[11px] font-extrabold uppercase tracking-wide">Pelanggan</th>
                      <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide">Nama Barang</th>
                      <th className="w-24 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide">Jumlah</th>
                      <th className="w-28 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide">Satuan</th>
                      <th className="w-36 px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-wide">Harga</th>
                      <th className="w-[230px] px-3 py-3 text-[11px] font-extrabold uppercase tracking-wide">Status / Catatan</th>
                      <th className="w-32 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide">Status Batch</th>
                      <th className="w-16 px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {desktopGroups.map((group) => (
                      <Fragment key={group.key}>
                        <tr className="bg-brand-mist/70">
                          <td colSpan={9} className="border-y border-brand-navy/10 px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 text-sm font-extrabold text-brand-navyDark">
                              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-orange" />
                              {group.customerName}
                              <span className="text-xs font-semibold text-slate-500">{group.notes.length} barang</span>
                            </span>
                          </td>
                        </tr>
                        {group.notes.map((note) => (
                          <tr key={note.id} className="group transition-colors hover:bg-slate-50/70">
                            <td className="px-3 py-2 align-middle">
                              <InlineEditableCell {...inlineProps} note={note} field="kategoriPemilik" value={note.kategoriPemilik} label="Kategori" />
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <CustomerEditableCell note={note} busy={savingCell === `${note.id}:pelanggan`} onClick={setCustomerPickerTarget} />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <InlineEditableCell {...inlineProps} note={note} field="namaBarang" value={note.namaBarang} label="Nama barang" className={note.status === "Selesai" ? "text-slate-400 line-through" : "font-bold text-slate-800"} />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <InlineEditableCell {...inlineProps} note={note} field="jumlah" value={String(note.jumlah)} displayValue={String(note.jumlah)} label="Jumlah" inputType="number" className="justify-center tabular-nums" />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <InlineEditableCell {...inlineProps} note={note} field="satuan" value={note.satuan} label="Satuan" className="justify-center" />
                            </td>
                            <td className="px-2 py-2 text-right align-middle">
                              <InlineEditableCell {...inlineProps} note={note} field="harga" value={note.harga ? String(note.harga) : ""} displayValue={note.harga > 0 ? formatIDR(note.harga) : "—"} label="Harga" inputType="number" className="justify-end tabular-nums font-bold" />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <div className="space-y-1">
                                <StatusControl note={note} busy={savingStatusId === note.id} onToggle={toggleStatus} />
                                <InlineEditableCell {...inlineProps} note={note} field="catatan" value={note.catatan} displayValue={note.catatan || "Tambah catatan…"} label="Catatan" className="text-xs text-slate-500" />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <ActiveControl note={note} busy={savingActiveId === note.id} onToggle={toggleActive} />
                            </td>
                            <td className="px-2 py-2 text-center align-middle">
                              <DeleteButton note={note} onClick={setDeleteTarget} />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 lg:hidden sm:p-4">
                {desktopGroups.map((customerGroup) => (
                  <section key={customerGroup.key} className="overflow-hidden rounded-xl border border-surface-border bg-white">
                    <h3 className="flex min-h-[44px] items-center gap-2 border-b border-brand-navy/10 bg-brand-mist/70 px-3 py-2.5 text-sm font-extrabold text-brand-navyDark">
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                      {customerGroup.customerName}
                      <span className="ml-auto text-xs font-semibold text-slate-500">{customerGroup.notes.length} barang</span>
                    </h3>
                    <ul className="divide-y divide-slate-100 px-2">
                      {customerGroup.notes.map((note) => {
                        const isExpanded = expandedMobileIds.has(note.id);
                        const detailId = `shopping-note-details-${note.id}`;
                        return (
                          <li key={note.id} className="py-0.5">
                            <div className="flex items-center gap-1">
                              <StatusControl note={note} busy={savingStatusId === note.id} onToggle={toggleStatus} compact />
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-controls={detailId}
                                onClick={() => setExpandedMobileIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(note.id)) next.delete(note.id);
                                  else next.add(note.id);
                                  return next;
                                })}
                                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                              >
                                <span className="flex min-w-0 flex-1 flex-col items-start">
                                  <span className="w-full truncate text-sm font-semibold text-slate-800">{note.namaBarang}</span>
                                  {note.harga > 0 && <span className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">{formatIDR(note.harga)}</span>}
                                </span>
                                <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold tabular-nums text-slate-700">{note.jumlah}</span>
                                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  id={detailId}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2 px-2 pb-3 pt-1">
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                      <MobileNoteField label="Kategori">
                                        <InlineEditableCell {...inlineProps} note={note} field="kategoriPemilik" value={note.kategoriPemilik} label="Kategori" className="text-sm" />
                                      </MobileNoteField>
                                      <MobileNoteField label="Satuan">
                                        <InlineEditableCell {...inlineProps} note={note} field="satuan" value={note.satuan} label="Satuan" className="text-sm" />
                                      </MobileNoteField>
                                      <MobileNoteField label="Nama barang">
                                        <InlineEditableCell {...inlineProps} note={note} field="namaBarang" value={note.namaBarang} label="Nama barang" className="text-sm font-semibold" />
                                      </MobileNoteField>
                                      <MobileNoteField label="Jumlah">
                                        <InlineEditableCell {...inlineProps} note={note} field="jumlah" value={String(note.jumlah)} displayValue={String(note.jumlah)} label="Jumlah" inputType="number" className="text-sm tabular-nums" />
                                      </MobileNoteField>
                                      <MobileNoteField label="Harga">
                                        <InlineEditableCell {...inlineProps} note={note} field="harga" value={note.harga ? String(note.harga) : ""} displayValue={note.harga > 0 ? formatIDR(note.harga) : "Belum diisi"} label="Harga" inputType="number" className="text-sm font-semibold tabular-nums" />
                                      </MobileNoteField>
                                      <MobileNoteField label="Status beli">
                                        <StatusControl note={note} busy={savingStatusId === note.id} onToggle={toggleStatus} />
                                      </MobileNoteField>
                                    </div>
                                    <MobileNoteField label="Pelanggan">
                                      <button
                                        type="button"
                                        onClick={() => setCustomerPickerTarget(note)}
                                        disabled={savingCell === `${note.id}:pelanggan`}
                                        className="min-h-[44px] w-full rounded-lg px-2 text-left text-sm font-semibold text-brand-navy transition-colors hover:bg-slate-50 disabled:opacity-60"
                                      >
                                        {savingCell === `${note.id}:pelanggan` ? "Menyimpan…" : note.pelanggan ? "Ganti pelanggan" : "Pilih pelanggan"}
                                      </button>
                                    </MobileNoteField>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                                      <span className="text-xs font-medium text-slate-500">Batch berikutnya</span>
                                      <ActiveControl note={note} busy={savingActiveId === note.id} onToggle={toggleActive} />
                                    </div>
                                    <MobileNoteField label="Catatan">
                                      <InlineEditableCell {...inlineProps} note={note} field="catatan" value={note.catatan} displayValue={note.catatan || "Tambah catatan…"} label="Catatan" className="text-sm text-slate-500" />
                                    </MobileNoteField>
                                    <div className="flex justify-end">
                                      <DeleteButton note={note} onClick={setDeleteTarget} />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-3 py-4 sm:px-4">
                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface-border bg-white px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-navyDark">
                      {searchMode ? "Total harga hasil pencarian" : hasMore ? "Subtotal sementara" : "Total harga"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {searchMode
                        ? `${visibleRows.length} dari ${searchRows.length} hasil pencarian`
                        : hasMore
                          ? `${rows.length} barang dimuat · masih ada barang lainnya`
                          : `${rows.length} barang pada filter ini`}
                    </p>
                  </div>
                  <strong className="shrink-0 text-sm font-extrabold tabular-nums text-brand-navyDark sm:text-base">{formatIDR(totalHargaDimuat)}</strong>
                </div>
                {visibleHasMore ? (
                  <Button variant="outline" onClick={loadMoreVisible} isLoading={searchMode ? false : loadingMore}>
                    Muat 50 {searchMode ? "hasil" : "catatan"} lagi
                  </Button>
                ) : (
                  <p className="text-xs font-medium text-slate-400">
                    {searchMode ? "Semua hasil sudah ditampilkan" : "Semua catatan sudah ditampilkan"}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {formOpen && <ShoppingNoteFormModal onClose={() => setFormOpen(false)} onSubmit={saveNewNote} />}
      {quickCreateOpen && <ShoppingNoteQuickCreateModal onClose={() => setQuickCreateOpen(false)} onSubmit={saveQuickNotes} />}
      {customerPickerTarget && (
        <ShoppingNoteCustomerPickerModal
          selectedCustomerId={customerPickerTarget.pelanggan?.id}
          onClose={() => setCustomerPickerTarget(null)}
          onSelect={(customer) => void saveCustomer(customerPickerTarget, customer)}
        />
      )}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus catatan belanja?"
        message={deleteTarget ? <>Catatan <strong>{deleteTarget.namaBarang}</strong> akan dihapus dari daftar.</> : "Catatan ini akan dihapus dari daftar."}
        confirmText="Hapus Catatan"
        type="danger"
      />
    </div>
  );
}

function groupShoppingNotesByCustomer(notes: ShoppingNote[]): ShoppingNoteCustomerGroup[] {
  const groups = new Map<string, ShoppingNoteCustomerGroup>();

  for (const note of notes) {
    const customerName = note.pelanggan?.nama.trim() || "Tanpa pelanggan";
    const customerId = note.pelanggan?.id;
    const key = customerId
      ? `customer:${customerId}`
      : note.pelanggan?.nama.trim()
        ? `name:${customerName.toLocaleLowerCase("id-ID")}`
        : "customer:none";
    const existing = groups.get(key);
    if (existing) {
      existing.notes.push(note);
    } else {
      groups.set(key, { key, customerName, notes: [note] });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    notes: [...group.notes].sort((left, right) => (
      SHOPPING_NOTE_NAME_COLLATOR.compare(left.namaBarang, right.namaBarang)
      || left.id.localeCompare(right.id)
    )),
  }));
}

function MobileNoteField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block px-2 text-[11px] font-semibold text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function InlineEditableCell({
  note,
  field,
  value,
  displayValue,
  label,
  inputType = "text",
  className = "",
  editingCell,
  savingCell,
  onStartEdit,
  onSave,
  onCancel,
}: {
  note: ShoppingNote;
  field: ShoppingNoteEditableField;
  value: string;
  displayValue?: string;
  label: string;
  inputType?: "text" | "number";
  className?: string;
  editingCell: EditingCell | null;
  savingCell: string | null;
  onStartEdit: (cell: EditingCell) => void;
  onSave: (note: ShoppingNote, field: ShoppingNoteEditableField, value: string) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(editingCell && editingCell.noteId === note.id && editingCell.field === field);
  const isSaving = savingCell === `${note.id}:${field}`;
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!isEditing) return;
    setLocalValue(value);
    finishedRef.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing, value]);

  function commit() {
    commitValue(localValue);
  }

  function commitValue(nextValue: string) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onSave(note, field, nextValue);
  }

  if (isEditing) {
    const selectOptions = field === "kategoriPemilik"
      ? SHOPPING_NOTE_CATEGORIES
      : field === "satuan"
        ? SHOPPING_NOTE_UNITS
        : null;

    if (selectOptions) {
      return (
        <select
          autoFocus
          value={localValue}
          onChange={(event) => {
            setLocalValue(event.target.value);
            commitValue(event.target.value);
          }}
          onBlur={commit}
          aria-label={`Edit ${label} untuk ${note.namaBarang}`}
          className="min-h-[44px] w-full min-w-0 rounded-lg border-2 border-brand-orange bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-brand-orange/10"
        >
          {!selectOptions.some((option) => option === localValue) && localValue && (
            <option value={localValue}>Nilai saat ini: {localValue}</option>
          )}
          {selectOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type={inputType}
        inputMode={inputType === "number" ? "decimal" : undefined}
        min={field === "jumlah" ? "0.01" : field === "harga" ? "0" : undefined}
        step={field === "jumlah" ? "any" : field === "harga" ? "1" : undefined}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            finishedRef.current = true;
            onCancel();
          }
        }}
        aria-label={`Edit ${label} untuk ${note.namaBarang}`}
        className="min-h-[44px] w-full min-w-0 rounded-lg border-2 border-brand-orange bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-brand-orange/10 sm:min-h-[36px]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onStartEdit({ noteId: note.id, field })}
      disabled={isSaving}
      title={`Klik untuk edit ${label.toLowerCase()}`}
      aria-label={`Edit ${label} untuk ${note.namaBarang}`}
      className={`group/cell flex min-h-[44px] w-full min-w-0 items-center gap-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-brand-cream/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 disabled:cursor-wait sm:min-h-[36px] ${className}`}
    >
      <span className="min-w-0 flex-1 break-words leading-tight">{(displayValue ?? value) || "—"}</span>
      {isSaving && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-orange" />}
    </button>
  );
}

function StatusControl({ note, busy, onToggle, compact = false }: { note: ShoppingNote; busy: boolean; onToggle: (note: ShoppingNote) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => void onToggle(note)}
      disabled={busy}
      aria-pressed={note.status === "Selesai"}
      aria-label={note.status === "Selesai" ? `Kembalikan ${note.namaBarang} ke belum dibeli` : `Tandai ${note.namaBarang} selesai`}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 disabled:cursor-wait disabled:opacity-60 ${compact ? "w-11 shrink-0 justify-center border border-slate-200 bg-white shadow-sm hover:bg-slate-50" : "sm:min-h-[36px]"}`}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin text-brand-navy" /> : compact ? note.status === "Selesai" ? <Check className="h-5 w-5 text-emerald-600" /> : <span className="h-5 w-5 rounded-md border-2 border-slate-300 bg-white" /> : note.status === "Selesai" ? <Check className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-amber-600" />}
      {!compact && (
        <span className={`rounded-full border px-2 py-1 text-[10px] font-extrabold ${note.status === "Selesai" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
          {note.status}
        </span>
      )}
    </button>
  );
}

function ActiveControl({ note, busy, onToggle }: { note: ShoppingNote; busy: boolean; onToggle: (note: ShoppingNote) => void }) {
  return (
    <button
      type="button"
      onClick={() => void onToggle(note)}
      disabled={busy}
      aria-label={note.aktif ? `Nonaktifkan ${note.namaBarang}` : `Aktifkan ${note.namaBarang}`}
      title={note.aktif ? "Keluarkan barang dari batch aktif" : "Masukkan barang ke batch aktif"}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 disabled:cursor-wait disabled:opacity-60 sm:min-h-[40px] ${
        note.aktif
          ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : note.aktif ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
      {note.aktif ? "Aktif" : "Nonaktif"}
    </button>
  );
}

function DeleteButton({ note, onClick }: { note: ShoppingNote; onClick: (note: ShoppingNote) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(note)}
      aria-label={`Hapus ${note.namaBarang}`}
      title="Hapus barang"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:h-9 sm:w-9"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function CustomerEditableCell({
  note,
  busy,
  onClick,
}: {
  note: ShoppingNote;
  busy: boolean;
  onClick: (note: ShoppingNote) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(note)}
      disabled={busy}
      aria-label={`Pilih pelanggan untuk ${note.namaBarang}`}
      className="flex min-h-[44px] w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-cream/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 disabled:cursor-wait"
    >
      {busy ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand-orange" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-brand-orange/70" />}
      <span className={`min-w-0 flex-1 truncate ${note.pelanggan ? "" : "text-slate-400"}`}>
        {note.pelanggan?.nama || "Pilih pelanggan"}
      </span>
    </button>
  );
}
