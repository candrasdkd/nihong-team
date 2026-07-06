import { useState, useMemo } from "react";
import { ExtendedOrder } from "../types";

interface UseOrdersSelectionProps {
  orders: ExtendedOrder[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useOrdersSelection({ orders, selectedIds, setSelectedIds, showToast }: UseOrdersSelectionProps) {
  const [showInvoice, setShowInvoice] = useState<{
    show: boolean;
    order?: ExtendedOrder;
    itemIds?: string[];
  }>({ show: false });

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.includes(o.id || "")),
    [orders, selectedIds],
  );

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

  return {
    selectedIds,
    setSelectedIds,
    showInvoice,
    setShowInvoice,
    selectedOrders,
    handleInvoiceClick,
  };
}
