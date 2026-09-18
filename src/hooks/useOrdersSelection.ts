import { useState, useMemo } from "react";
import { invoiceSelectionError } from "../utils/orders";
import { Customer, ExtendedOrder } from "../types";

interface UseOrdersSelectionProps {
  customers: Customer[];
  orders: ExtendedOrder[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  showToast: (message: string, type: "success" | "error") => void;
}

export function useOrdersSelection({ orders, customers, selectedIds, setSelectedIds, showToast }: UseOrdersSelectionProps) {
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
    const error = invoiceSelectionError(selectedOrders, customers);
    if (error) { showToast(error, "error"); return; }

    setShowInvoice({
      show: true,
      order: selectedOrders[0],
      itemIds: selectedOrders.map(order => order.id!),
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
