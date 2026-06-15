import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, ClipboardList, ShoppingBag, X } from "lucide-react";

interface SpeedDialAction {
  id: string;
  label: string;
  Icon: React.ElementType;
  color: string; // Tailwind bg + text classes for the icon bubble
  onClick: () => void;
}

interface SpeedDialFABProps {
  onAddOrder: () => void;
  onAddBooking: () => void;
}

export function SpeedDialFAB({ onAddOrder, onAddBooking }: SpeedDialFABProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const actions: SpeedDialAction[] = [
    {
      id: "booking",
      label: "Booking Jadwal",
      Icon: ShoppingBag,
      color: "bg-rose-500 text-white shadow-rose-500/40",
      onClick: () => { setOpen(false); onAddBooking(); },
    },
    {
      id: "order",
      label: "Tambah Pesanan",
      Icon: ClipboardList,
      color: "bg-blue-600 text-white shadow-blue-500/40",
      onClick: () => { setOpen(false); onAddOrder(); },
    },
  ];

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div
        ref={ref}
        className="sm:hidden fixed bottom-[72px] right-4 z-[60] flex flex-col items-end gap-3"
      >
        {/* Speed Dial Options */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="options"
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col items-end gap-2.5"
            >
              {actions.map((action, i) => (
                <motion.div
                  key={action.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.85 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { delay: i * 0.06, type: "spring", stiffness: 400, damping: 28 },
                    },
                  }}
                  className="flex items-center gap-2.5"
                >
                  {/* Label pill */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 + 0.05 } }}
                    className="bg-white text-slate-800 text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-slate-100 whitespace-nowrap select-none"
                  >
                    {action.label}
                  </motion.span>

                  {/* Icon button */}
                  <button
                    onClick={action.onClick}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${action.color}`}
                  >
                    <action.Icon size={20} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => setOpen((p) => !p)}
          whileTap={{ scale: 0.88 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 z-[61]
            ${open
              ? "bg-slate-800 shadow-slate-900/50"
              : "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/40"
            }`}
        >
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            {open ? <X size={22} className="text-white" /> : <Plus size={24} className="text-white stroke-[3]" />}
          </motion.div>
        </motion.button>
      </div>
    </>
  );
}
