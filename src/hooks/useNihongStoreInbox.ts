// src/hooks/useNihongStoreInbox.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  NihongStoreOrder,
  NihongStoreOrderStatus,
  NihongStoreItem,
  DepartureSchedule,
  Customer,
} from "../types";
import {
  listenNihongStoreOrders,
  updateNihongStoreOrder,
  updateNihongStoreCustomStatus,
  deleteNihongStoreOrder,
  rejectNihongStoreOrder,
  saveManagedOrderItems,
  assignNihongStoreOrderToSchedule,
  batchAssignNihongStoreOrdersToSchedule,
} from "../services/nihongStoreFirebase";
import { listenSchedules } from "../services/schedulesFirebase";
import { listenCustomers } from "../services/customersFirebase";
import { generateShoppingListText } from "../utils/nihongStoreExport";

export type InboxSortOption = "newest" | "oldest" | "price_desc" | "price_asc" | "weight_desc";

export function useNihongStoreInbox(
  showToast?: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void
) {
  const [orders, setOrders] = useState<NihongStoreOrder[]>([]);
  const [schedules, setSchedules] = useState<DepartureSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search & Pagination Limit
  const [statusFilter, setStatusFilter] = useState<string>("inbox");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<string>(""); // "" | "oos" | "ready"
  const [sortBy, setSortBy] = useState<InboxSortOption>("newest");
  const [q, setQ] = useState<string>("");
  const [limitCount, setLimitCount] = useState<number>(50);

  // Multi-selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetOrders, setAssignTargetOrders] = useState<NihongStoreOrder[]>([]);
  
  // Manage items modal
  const [manageItemsModalOpen, setManageItemsModalOpen] = useState(false);
  const [managingOrder, setManagingOrder] = useState<NihongStoreOrder | null>(null);

  // Update Status modal
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [statusTargetOrder, setStatusTargetOrder] = useState<NihongStoreOrder | null>(null);

  // WhatsApp Dynamic Template modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetOrder, setWhatsAppTargetOrder] = useState<NihongStoreOrder | null>(null);

  // Order Detail & Timeline modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTargetOrder, setDetailTargetOrder] = useState<NihongStoreOrder | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Hapus",
    cancelText: "Batal",
    type: "danger",
    onConfirm: () => {},
  });

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
      showToast?.(message, type);
    },
    [showToast]
  );

  // Connect Store Auth Modal
  const [connectAuthModalOpen, setConnectAuthModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshOrders = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const [error, setError] = useState<string | null>(null);

  // 1. Subscribe Real-time NihongStore Orders from nihongstore-6210b with limit
  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = listenNihongStoreOrders(
      "",
      (rows) => {
        setOrders(rows);
        setLoading(false);
        setError(null);
      },
      limitCount,
      (err: any) => {
        setError(err?.message || "Gagal memuat pesanan dari Firebase NihongStore.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [limitCount, refreshKey]);

  // 2. Subscribe Schedules & Customers from nihong-4b93e
  useEffect(() => {
    const unsubS = listenSchedules((rows) => setSchedules(rows));
    const unsubC = listenCustomers((rows) => setCustomers(rows));
    return () => {
      unsubS();
      unsubC();
    };
  }, []);

  // Open Schedules for Assigning
  const openSchedules = useMemo(() => {
    return schedules.filter((s) => s.status === "Open");
  }, [schedules]);

  // Counts
  const counts = useMemo(() => {
    let inbox = 0;
    let assigned = 0;
    let rejected = 0;

    orders.forEach((o) => {
      if (o.status === "inbox") inbox++;
      else if (o.status === "assigned") assigned++;
      else if (o.status === "rejected") rejected++;
    });

    return {
      inbox,
      assigned,
      rejected,
      total: orders.length,
    };
  }, [orders]);

  // Filtered & Searched Orders with Sorting
  const filteredOrders = useMemo(() => {
    let list = orders;

    // Status Tab Filter
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }

    // Payment Status Filter
    if (paymentFilter) {
      list = list.filter((o) => (o.paymentStatus || "").toLowerCase() === paymentFilter.toLowerCase());
    }

    // Stock Condition Filter
    if (stockFilter === "oos") {
      list = list.filter((o) => o.items.some((it) => it.status === "Stok habis"));
    } else if (stockFilter === "ready") {
      list = list.filter((o) => o.items.every((it) => it.status !== "Stok habis"));
    }

    // Search Query Filter
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.no || "").toLowerCase().includes(s) ||
          (o.namaPelanggan || "").toLowerCase().includes(s) ||
          (o.noTelponPelanggan || "").toLowerCase().includes(s) ||
          o.items.some(
            (it) =>
              (it.namaBarang || "").toLowerCase().includes(s) ||
              (it.kodeBarang || "").toLowerCase().includes(s) ||
              (it.warna || "").toLowerCase().includes(s)
          )
      );
    }

    // Sorting
    const sorted = [...list];
    if (sortBy === "newest") {
      sorted.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => (b.totalEstimasiHargaIdr || 0) - (a.totalEstimasiHargaIdr || 0));
    } else if (sortBy === "price_asc") {
      sorted.sort((a, b) => (a.totalEstimasiHargaIdr || 0) - (b.totalEstimasiHargaIdr || 0));
    } else if (sortBy === "weight_desc") {
      sorted.sort((a, b) => (b.totalKg || 0) - (a.totalKg || 0));
    }

    return sorted;
  }, [orders, statusFilter, paymentFilter, stockFilter, q, sortBy]);

  // Selection handlers
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const clearAllFilters = () => {
    setStatusFilter("inbox");
    setPaymentFilter("");
    setStockFilter("");
    setSortBy("newest");
    setQ("");
    clearSelection();
  };

  // Open Assign Modal for Single Order
  const handleOpenAssignSingle = (order: NihongStoreOrder) => {
    setAssignTargetOrders([order]);
    setAssignModalOpen(true);
  };

  // Open Assign Modal for Batch Selected Orders
  const handleOpenAssignBatch = () => {
    const targets = orders.filter((o) => selectedIds.includes(o.id));
    if (targets.length === 0) {
      toast("Pilih minimal satu pesanan untuk di-assign", "warning");
      return;
    }
    setAssignTargetOrders(targets);
    setAssignModalOpen(true);
  };

  // Open Manage Items Stock Modal
  const handleOpenManageItems = (order: NihongStoreOrder) => {
    setManagingOrder(order);
    setManageItemsModalOpen(true);
  };

  // Save updated items stock availability
  const handleSaveManagedItems = async (
    orderId: string,
    updatedItems: NihongStoreItem[]
  ) => {
    try {
      await saveManagedOrderItems(orderId, updatedItems);
      toast("Status ketersediaan barang berhasil diperbarui!");
      setManageItemsModalOpen(false);
      setManagingOrder(null);
    } catch (err: any) {
      console.error(err);
      toast(err?.message || "Gagal menyimpan ketersediaan item", "error");
    }
  };

  // Open Update Status Modal
  const handleOpenUpdateStatus = (order: NihongStoreOrder) => {
    setStatusTargetOrder(order);
    setUpdateStatusModalOpen(true);
  };

  // Open Order Detail & Timeline Modal
  const handleOpenOrderDetail = (order: NihongStoreOrder) => {
    setDetailTargetOrder(order);
    setDetailModalOpen(true);
  };

  // Open Dynamic WhatsApp Template Modal
  const handleOpenWhatsApp = (order: NihongStoreOrder) => {
    setWhatsAppTargetOrder(order);
    setWhatsAppModalOpen(true);
  };

  // Copy Shopping List Text for Batch Selected Orders
  const handleCopyBatchShoppingList = () => {
    const targets = orders.filter((o) => selectedIds.includes(o.id));
    if (targets.length === 0) {
      toast("Pilih minimal satu pesanan untuk menyalin daftar belanja", "warning");
      return;
    }
    const text = generateShoppingListText(targets);
    navigator.clipboard.writeText(text);
    toast(`Daftar belanja ${targets.length} pesanan disalin ke clipboard!`);
  };

  // Save Custom Status & Timeline note
  const handleSaveCustomStatus = async (
    orderId: string,
    displayStatus: string,
    paymentStatus: string,
    statusCategory: NihongStoreOrderStatus,
    note: string
  ) => {
    try {
      await updateNihongStoreCustomStatus(
        orderId,
        displayStatus,
        paymentStatus,
        statusCategory,
        note
      );
      toast(`Status berhasil diubah menjadi: "${displayStatus}"`);
      setUpdateStatusModalOpen(false);
      setStatusTargetOrder(null);
    } catch (err: any) {
      console.error(err);
      toast(err?.message || "Gagal mengubah status pesanan", "error");
    }
  };

  // Execute Assign Submit
  const handleAssignSubmit = async (
    scheduleId: string,
    options?: {
      customTotalKg?: number;
      customerId?: string;
      pic?: string;
      notes?: string;
    }
  ) => {
    if (!scheduleId) {
      toast("Pilih Jadwal Keberangkatan terlebih dahulu", "error");
      return;
    }

    try {
      if (assignTargetOrders.length === 1) {
        await assignNihongStoreOrderToSchedule(
          assignTargetOrders[0],
          scheduleId,
          options
        );
        toast("Pesanan berhasil di-assign ke Jadwal Keberangkatan Handcarry!");
      } else {
        await batchAssignNihongStoreOrdersToSchedule(
          assignTargetOrders,
          scheduleId
        );
        toast(
          `Berhasil meng-assign ${assignTargetOrders.length} pesanan ke Jadwal Keberangkatan!`
        );
      }

      setAssignModalOpen(false);
      setAssignTargetOrders([]);
      clearSelection();
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Gagal meng-assign pesanan", "error");
    }
  };

  // Reject / Cancel order with error toast
  const handleReject = (order: NihongStoreOrder) => {
    setConfirmModal({
      isOpen: true,
      title: "Tolak Pesanan",
      message: `Yakin ingin menolak pesanan "${order.no || order.id}" atas nama ${order.namaPelanggan}? Status akan diubah menjadi Dibatalkan di linimasa pelacakan konsumen.`,
      confirmText: "Tolak Pesanan",
      type: "warning",
      onConfirm: async () => {
        try {
          await rejectNihongStoreOrder(order.id);
          toast("Pesanan telah ditandai ditolak");
        } catch (err: any) {
          console.error("Error rejecting order:", err);
          toast(err?.message || "Gagal menolak pesanan", "error");
        }
      },
    });
  };

  // Delete permanently
  const handleDelete = (order: NihongStoreOrder) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pesanan",
      message: `Yakin ingin menghapus pesanan "${order.no || order.id}" secara permanen dari Inbox?`,
      confirmText: "Hapus Permanen",
      type: "danger",
      onConfirm: async () => {
        try {
          await deleteNihongStoreOrder(order.id);
          toast("Pesanan berhasil dihapus dari Inbox");
        } catch (err: any) {
          console.error("Error deleting order:", err);
          toast(err?.message || "Gagal menghapus pesanan", "error");
        }
      },
    });
  };

  const loadMore = useCallback(() => {
    setLimitCount((prev) => prev + 50);
  }, []);

  const hasMore = orders.length >= limitCount;

  return {
    orders,
    filteredOrders,
    schedules,
    openSchedules,
    customers,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    stockFilter,
    setStockFilter,
    sortBy,
    setSortBy,
    clearAllFilters,
    q,
    setQ,
    limitCount,
    loadMore,
    hasMore,
    selectedIds,
    counts,
    handleSelectToggle,
    handleSelectAll,
    clearSelection,
    assignModalOpen,
    setAssignModalOpen,
    assignTargetOrders,
    handleOpenAssignSingle,
    handleOpenAssignBatch,
    handleAssignSubmit,
    manageItemsModalOpen,
    setManageItemsModalOpen,
    managingOrder,
    handleOpenManageItems,
    handleSaveManagedItems,
    updateStatusModalOpen,
    setUpdateStatusModalOpen,
    statusTargetOrder,
    handleOpenUpdateStatus,
    handleSaveCustomStatus,
    whatsAppModalOpen,
    setWhatsAppModalOpen,
    whatsAppTargetOrder,
    setWhatsAppTargetOrder,
    handleOpenWhatsApp,
    detailModalOpen,
    setDetailModalOpen,
    detailTargetOrder,
    setDetailTargetOrder,
    handleOpenOrderDetail,
    handleCopyBatchShoppingList,
    confirmModal,
    setConfirmModal,
    connectAuthModalOpen,
    setConnectAuthModalOpen,
    refreshOrders,
    handleReject,
    handleDelete,
  };
}
