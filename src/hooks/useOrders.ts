import { useState, useCallback } from "react";
import { Customer, ExtendedOrder } from "../types";
import { createOrder, deleteOrder, fromExtended, updateOrder } from "../services/ordersFirebase";
import { useToast } from "./useToast";
import { useOrdersQuery } from "./useOrdersQuery";
import { useOrdersSelection } from "./useOrdersSelection";

interface UseOrdersProps {
  customers: Customer[];
  unitPrice: number;
}

export function useOrders({ customers, unitPrice }: UseOrdersProps) {
  // 1. Toast Hook
  const { toasts, setToasts, showToast, removeToast } = useToast();

  // 2. Selection states (shared with selection hook)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Callback to clean up selectedIds when orders are refreshed/filtered
  const handleOrdersUpdated = useCallback((filtered: ExtendedOrder[]) => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((x) => x.id === id)));
  }, []);

  // 3. Query Hook
  const query = useOrdersQuery({ unitPrice, onOrdersUpdated: handleOrdersUpdated });

  // 4. Selection Hook
  const selection = useOrdersSelection({
    orders: query.orders,
    selectedIds,
    setSelectedIds,
    showToast,
  });

  // 4. Local UI states
  const [editing, setEditing] = useState<ExtendedOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | string[] | null>(null);
  const [previewPhone, setPreviewPhone] = useState<string | undefined>(undefined);
  const [previewCustomerName, setPreviewCustomerName] = useState<string | undefined>(undefined);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<ExtendedOrder | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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

  const handleDelete = async (id: string) => {
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
    // Query states
    q: query.q,
    setQ: query.setQ,
    statusFilter: query.statusFilter,
    setStatusFilter: query.setStatusFilter,
    sortBy: query.sortBy,
    setSortBy: query.setSortBy,
    sortOrder: query.sortOrder,
    setSortOrder: query.setSortOrder,
    orders: query.orders,
    limitValue: query.limitValue,
    setLimitValue: query.setLimitValue,
    renderLimit: query.renderLimit,
    setRenderLimit: query.setRenderLimit,
    loading: query.loading,
    dateFrom: query.dateFrom,
    setDateFrom: query.setDateFrom,
    dateTo: query.dateTo,
    setDateTo: query.setDateTo,
    sortedOrders: query.sortedOrders,
    displayedOrders: query.displayedOrders,
    metrics: query.metrics,

    // Selection states
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
    showInvoice: selection.showInvoice,
    setShowInvoice: selection.setShowInvoice,
    selectedOrders: selection.selectedOrders,
    handleInvoiceClick: selection.handleInvoiceClick,

    // Toast states
    toasts,
    setToasts,
    showToast,
    removeToast,

    // UI states
    editing,
    setEditing,
    showForm,
    setShowForm,
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
    expandedRows,
    setExpandedRows,

    // Handlers
    openPreview,
    handleDelete,
    handleSubmitOrder,
  };
}
