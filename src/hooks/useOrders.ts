import { useEffect, useMemo, useState } from "react";
import { Customer, ExtendedOrder } from "../types";
import {
  createOrder,
  deleteOrder,
  fromExtended,
  subscribeOrders,
  updateOrder,
  toExtended,
} from "../services/ordersFirebase";
import { compute } from "../utils/helpers";

export type ToastType = { message: string; type: "success" | "error"; id: number };

interface UseOrdersProps {
  customers: Customer[];
  unitPrice: number;
}

export function useOrders({ customers, unitPrice }: UseOrdersProps) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Local state for paginated/direct orders fetching
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [limitValue, setLimitValue] = useState(50);
  const [renderLimit, setRenderLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  // Date Logic (All-time by default)
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // UI State
  const [editing, setEditing] = useState<ExtendedOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | string[] | null>(null);
  const [previewPhone, setPreviewPhone] = useState<string | undefined>(undefined);
  const [previewCustomerName, setPreviewCustomerName] = useState<string | undefined>(undefined);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<ExtendedOrder | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const openPreview = (src: string | string[], phone?: string, customerName?: string) => {
    if (!src || (Array.isArray(src) && src.length === 0)) return;
    setPreviewSrc(src);
    setPreviewPhone(phone);
    setPreviewCustomerName(customerName);
    setIsPreviewOpen(true);
  };
  
  const [showInvoice, setShowInvoice] = useState<{
    show: boolean;
    order?: ExtendedOrder;
    itemIds?: string[];
  }>({ show: false });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toast State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Derived State
  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.includes(o.id)),
    [orders, selectedIds],
  );

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

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }
    });
    return list;
  }, [orders, sortBy, sortOrder, unitPrice]);

  const displayedOrders = useMemo(() => {
    return sortedOrders.slice(0, renderLimit);
  }, [sortedOrders, renderLimit]);

  // Live filtered metrics based on currently computed list of orders
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

  // Toast Helper
  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => removeToast(id), 4000); // Auto remove after 4s
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset limit when filters or sorting change to save reads
  useEffect(() => {
    setLimitValue(50);
    setRenderLimit(50);
  }, [q, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // Data Fetching
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
        setSelectedIds((prev) =>
          prev.filter((id) => filtered.some((x) => x.id === id)),
        );
        setLoading(false);
      },
    );
    return () => unsub();
  }, [q, statusFilter, dateFrom, dateTo, limitValue, sortBy, sortOrder]);

  // Auto load more when scrolling near bottom
  useEffect(() => {
    function handleScroll() {
      if (loading) return;

      const threshold = 150; // px from bottom
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

  // Handlers
  async function handleDelete(id: string) {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pesanan",
      message: "Apakah Anda yakin ingin menghapus pesanan ini secara permanen dari database?",
      confirmText: "Hapus",
      type: "danger",
      onConfirm: async () => {
        await deleteOrder(id);
        showToast("Pesanan berhasil dihapus", "success");
      },
    });
  }

  const handleInvoiceClick = () => {
    // 1. Cek Minimal Satu
    if (selectedOrders.length === 0) {
      showToast("Pilih minimal satu pesanan untuk membuat invoice.", "error");
      return;
    }

    // 2. Cek Pelanggan Sama
    const sameCustomer = selectedOrders.every(
      (o) => o.namaPelanggan === selectedOrders[0]?.namaPelanggan,
    );
    if (!sameCustomer) {
      showToast("Pesanan harus dari pelanggan yang sama.", "error");
      return;
    }

    // 3. Cek Status Sama
    const sameStatus = selectedOrders.every(
      (o) => o.status === selectedOrders[0]?.status,
    );
    if (!sameStatus) {
      showToast("Status pesanan yang dipilih harus sama semua.", "error");
      return;
    }

    setShowInvoice({
      show: true,
      order: selectedOrders[0],
      itemIds: selectedIds,
    });
  };

  const handleSubmitOrder = async (val: any) => {
    try {
      const dto = fromExtended(val);
      if (editing?.id) {
        await updateOrder(editing.id, dto, unitPrice);
        showToast("Pesanan berhasil diperbarui", "success");
      } else {
        await createOrder(dto, unitPrice);
        showToast("Pesanan berhasil dibuat", "success");
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan pesanan", "error");
    }
  };

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
    editing,
    setEditing,
    showForm,
    setShowForm,
    selectedIds,
    setSelectedIds,
    isPreviewOpen,
    setIsPreviewOpen,
    previewSrc,
    setPreviewSrc,
    previewPhone,
    setPreviewPhone,
    previewCustomerName,
    setPreviewCustomerName,
    selectedOrderDetail,
    setSelectedOrderDetail,
    confirmModal,
    setConfirmModal,
    showInvoice,
    setShowInvoice,
    expandedRows,
    setExpandedRows,
    toasts,
    setToasts,
    selectedOrders,
    sortedOrders,
    displayedOrders,
    metrics,
    openPreview,
    showToast,
    removeToast,
    handleDelete,
    handleInvoiceClick,
    handleSubmitOrder,
  };
}
