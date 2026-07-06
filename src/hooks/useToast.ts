import { useState } from "react";

export type ToastType = { message: string; type: "success" | "error"; id: number };

export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    setToasts,
    showToast,
    removeToast,
  };
}
