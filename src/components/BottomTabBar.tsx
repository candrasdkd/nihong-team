import React, { ElementType, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Home, ClipboardList, Wallet, LayoutGrid, Zap, ShoppingBag, Calendar } from "lucide-react";
import { TabId } from "../types";

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
      className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-95 min-h-[44px]
        ${active ? "text-brand-navy" : "text-slate-400 hover:text-slate-600"}`}
    >
      <Icon
        className="h-5 w-5"
        fill={active ? "rgba(1, 46, 108, 0.12)" : "none"}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span className="text-[10px] leading-none font-bold">{label}</span>
    </button>
  );
}

export function BottomTabBar({
  onAddOrder,
  onAddBooking,
  onAddTransaction,
  onAddSchedule,
}: BottomTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const current = location.pathname === "/"
    ? "home"
    : (location.pathname.substring(1).split("/")[0] as TabId);

  const setTab = (t: TabId) => {
    navigate(t === "home" ? "/" : `/${t}`);
  };

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
      label: "Booking",
      Icon: ShoppingBag,
      cls: "bg-brand-orange shadow-orange-400/50",
      x: -96,
      y: -80,
      onClick: () => { setFabOpen(false); onAddBooking?.(); },
    },
    {
      id: "schedule",
      label: "Jadwal",
      Icon: Calendar,
      cls: "bg-amber-500 shadow-amber-400/50",
      x: -48,
      y: -80,
      onClick: () => { setFabOpen(false); onAddSchedule?.(); },
    },
    {
      id: "order",
      label: "Order",
      Icon: ClipboardList,
      cls: "bg-brand-navy shadow-brand-navy/50",
      x: 48,
      y: -80,
      onClick: () => { setFabOpen(false); onAddOrder?.(); },
    },
    {
      id: "cash",
      label: "Kas",
      Icon: Wallet,
      cls: "bg-emerald-500 shadow-emerald-500/50",
      x: 96,
      y: -80,
      onClick: () => { setFabOpen(false); onAddTransaction?.(); },
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    if (fabOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [fabOpen]);

  return (
    <>
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 z-50 md:hidden shrink-0 pointer-events-none">
        <nav className="relative h-16 w-full pointer-events-auto">
          <div className="absolute inset-0 z-10">
            <svg width={width} height={h + 100} className="drop-shadow-[0_-4px_12px_rgba(0,0,0,0.04)] filter">
              <path d={pathData} fill="#ffffff" />
            </svg>
          </div>

          <div className="relative z-20 h-full flex items-center justify-between px-3">
            <div className="flex items-center justify-around w-[38%] h-full">
              {LEFT_TABS.map((t) => (
                <TabButton
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  Icon={t.Icon}
                  current={current}
                  setTab={setTab}
                />
              ))}
            </div>

            <div className="w-[20%]" />

            <div className="flex items-center justify-around w-[38%] h-full">
              {RIGHT_TABS.map((t) => (
                <TabButton
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  Icon={t.Icon}
                  current={current}
                  setTab={setTab}
                />
              ))}
            </div>
          </div>

          <div ref={fabRef} className="absolute top-[-22px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <AnimatePresence>
              {fabOpen && (
                <motion.div
                  key="opts"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="absolute inset-0 z-[-1] pointer-events-none mb-4"
                >
                  {actions.map((action) => (
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
                          },
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
                      <span className="bg-white text-brand-navy text-[8.5px] font-black px-2.5 py-1 rounded-full shadow-lg border border-slate-100 select-none text-center whitespace-nowrap mt-1.5 leading-none">
                        {action.label}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setFabOpen((p) => !p)}
              whileTap={{ scale: 0.87 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-200
                ${fabOpen
                  ? "bg-slate-800 shadow-slate-800/50"
                  : "bg-brand-orange shadow-brand-orange/50"
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
