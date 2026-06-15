import React, { ElementType, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, ClipboardList, Wallet, LayoutGrid, Zap, ShoppingBag, Calendar, Coins } from "lucide-react";
import { TabId } from "../types";

// ─── Tab configs ─────────────────────────────────────────────────────────────
const LEFT_TABS:  { id: TabId; label: string; Icon: ElementType }[] = [
  { id: "home",   label: "Dashboard", Icon: Home },
  { id: "orders", label: "Pesanan",   Icon: ClipboardList },
];
const RIGHT_TABS: { id: TabId; label: string; Icon: ElementType }[] = [
  { id: "menu", label: "Menu", Icon: LayoutGrid },
  { id: "cash", label: "Kas",  Icon: Wallet },
];

const MENU_CHILD_TABS = new Set(["customers", "jastipers", "schedules", "preorders"]);

interface BottomTabBarProps {
  current: TabId;
  setTab: (t: TabId) => void;
  onAddOrder?: () => void;
  onAddBooking?: () => void;
  onAddTransaction?: () => void;
  onAddSchedule?: () => void;
}

function TabButton({
  id, label, Icon, current, setTab,
}: { id: TabId; label: string; Icon: ElementType; current: TabId; setTab: (t: TabId) => void }) {
  const active = id === "menu"
    ? (current === "menu" || MENU_CHILD_TABS.has(current))
    : current === id;

  return (
    <button
      onClick={() => setTab(id)}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-95
        ${active ? "text-[#0a2342]" : "text-neutral-400 hover:text-neutral-600"}`}
    >
      <Icon
        className="h-5 w-5"
        fill={active ? "rgba(10, 35, 66, 0.15)" : "none"}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span className="text-[10px] leading-none font-bold">{label}</span>
    </button>
  );
}

export function BottomTabBar({
  current,
  setTab,
  onAddOrder,
  onAddBooking,
  onAddTransaction,
  onAddSchedule,
}: BottomTabBarProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const C = width / 2;
  const h = 64;
  const pathData = `
    M 0 0
    L ${C - 70} 0
    C ${C - 52} 0, ${C - 44} 8, ${C - 36} 18
    C ${C - 24} 36, ${C - 12} 42, ${C} 42
    C ${C + 12} 42, ${C + 24} 36, ${C + 36} 18
    C ${C + 44} 8, ${C + 52} 0, ${C + 70} 0
    L ${width} 0
    L ${width} ${h + 100}
    L 0 ${h + 100}
    Z
  `;

  const actions = [
    {
      id: "booking",
      label: "Booking Jadwal",
      Icon: ShoppingBag,
      cls: "bg-rose-500 shadow-rose-400/50",
      x: -96,
      y: -80,
      onClick: () => { setFabOpen(false); onAddBooking?.(); },
    },
    {
      id: "schedule",
      label: "Tambah Jadwal",
      Icon: Calendar,
      cls: "bg-amber-500 shadow-amber-400/50",
      x: -48,
      y: -140,
      onClick: () => { setFabOpen(false); onAddSchedule?.(); },
    },
    {
      id: "order",
      label: "Tambah Pesanan",
      Icon: ClipboardList,
      cls: "bg-blue-600 shadow-blue-500/50",
      x: 48,
      y: -140,
      onClick: () => { setFabOpen(false); onAddOrder?.(); },
    },
    {
      id: "transaction",
      label: "Tambah Kas",
      Icon: Coins,
      cls: "bg-emerald-600 shadow-emerald-500/50",
      x: 96,
      y: -80,
      onClick: () => { setFabOpen(false); onAddTransaction?.(); },
    },
  ];

  useEffect(() => {
    if (!fabOpen) return;
    const h = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [fabOpen]);

  useEffect(() => {
    if (!fabOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFabOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fabOpen]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55]"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <footer
        className="sm:hidden fixed bottom-0 inset-x-0 z-[60] backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* SVG Curved Background with drop shadow */}
        <svg
          width={width}
          height={h + 100}
          className="absolute left-0 top-0 text-white pointer-events-none z-0"
          style={{
            filter: "drop-shadow(0px -4px 10px rgba(0, 0, 0, 0.05))",
          }}
        >
          <path
            d={pathData}
            fill="rgba(255, 255, 255, 0.95)"
          />
        </svg>

        {/* Fixed-height nav row */}
        <nav className="relative h-16 max-w-7xl mx-auto px-2 flex items-stretch z-10">

          {/* Left 2 tabs */}
          {LEFT_TABS.map((t) => (
            <TabButton key={t.id} {...t} current={current} setTab={setTab} />
          ))}

          {/* Center spacer — reserved for FAB */}
          <div className="w-16 flex-shrink-0" />

          {/* Right 2 tabs */}
          {RIGHT_TABS.map((t) => (
            <TabButton key={t.id} {...t} current={current} setTab={setTab} />
          ))}

          {/* ── FAB (absolutely centered, raised above bar) ── */}
          <div
            ref={fabRef}
            className="absolute left-1/2 -translate-x-1/2 -top-6 z-[62] flex flex-col items-center"
          >
            {/* Speed dial options */}
            <AnimatePresence>
              {fabOpen && (
                <motion.div
                  key="opts"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="absolute inset-0 z-[-1] pointer-events-none mb-4"
                >
                  {actions.map((action, i) => (
                    <motion.div
                      key={action.id}
                      variants={{
                        hidden: { opacity: 0, x: 0, y: 0, scale: 0 },
                        visible: {
                          opacity: 1,
                          x: action.x,
                          y: action.y,
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: i * 0.05
                          }
                        },
                      }}
                      className="absolute left-1/2 top-1/2 pointer-events-auto flex flex-col items-center"
                      style={{
                        width: 90,
                        marginLeft: -45,
                        marginTop: -22,
                      }}
                    >
                      <button
                        onClick={action.onClick}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xl text-white shrink-0 active:scale-90 transition-transform ${action.cls}`}
                      >
                        <action.Icon size={19} />
                      </button>
                      <span className="bg-white text-[#0a2342] text-[8.5px] font-black px-2.5 py-1 rounded-full shadow-lg border border-slate-50 select-none text-center whitespace-nowrap mt-1.5 leading-none">
                        {action.label}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
              onClick={() => setFabOpen((p) => !p)}
              whileTap={{ scale: 0.87 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-200
                ${fabOpen
                  ? "bg-slate-800 shadow-slate-800/50"
                  : "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/50"
                }`}
            >
              <motion.div
                animate={{ rotate: fabOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <Zap size={22} className="text-white" fill="white" />
              </motion.div>
            </motion.button>
          </div>
        </nav>
      </footer>
    </>
  );
}
