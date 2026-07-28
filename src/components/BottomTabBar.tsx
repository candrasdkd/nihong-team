import { ElementType, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ClipboardList,
  Home,
  LayoutGrid,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { TabId } from "../types";

const LEFT_TABS: { id: TabId; label: string; Icon: ElementType }[] = [
  { id: "home", label: "Beranda", Icon: Home },
  { id: "orders", label: "Pesanan", Icon: ClipboardList },
];

const RIGHT_TABS: { id: TabId; label: string; Icon: ElementType }[] = [
  { id: "menu", label: "Menu", Icon: LayoutGrid },
  { id: "cash", label: "Kas", Icon: Wallet },
];

const MENU_CHILD_TABS = new Set(["customers", "jastipers", "schedules", "preorders"]);

interface BottomTabBarProps {
  onAddOrder?: () => void;
  onAddBooking?: () => void;
  onAddTransaction?: () => void;
  onAddSchedule?: () => void;
}

function TabButton({
  id,
  label,
  Icon,
  current,
  setTab,
}: {
  id: TabId;
  label: string;
  Icon: ElementType;
  current: TabId;
  setTab: (tab: TabId) => void;
}) {
  const active =
    id === "menu" ? current === "menu" || MENU_CHILD_TABS.has(current) : current === id;

  return (
    <button
      onClick={() => setTab(id)}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] transition-all active:scale-95 ${
        active ? "text-brand-navyDark" : "text-slate-400"
      }`}
    >
      {active && (
        <motion.span
          layoutId="mobile-active-tab"
          className="absolute inset-1.5 rounded-2xl bg-brand-mist"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <Icon
        className="relative z-10 h-[19px] w-[19px]"
        strokeWidth={active ? 2.5 : 1.9}
      />
      <span className="relative z-10 text-[9px] font-extrabold tracking-tight">{label}</span>
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

  const current =
    location.pathname === "/"
      ? "home"
      : (location.pathname.substring(1).split("/")[0] as TabId);

  const setTab = (tab: TabId) => {
    setFabOpen(false);
    navigate(tab === "home" ? "/" : `/${tab}`);
  };

  const actions = [
    {
      id: "booking",
      label: "Booking",
      Icon: ShoppingBag,
      tone: "bg-rose-500",
      onClick: () => {
        setFabOpen(false);
        navigate("/preorders");
        onAddBooking?.();
      },
    },
    {
      id: "schedule",
      label: "Jadwal",
      Icon: Calendar,
      tone: "bg-amber-500",
      onClick: () => {
        setFabOpen(false);
        navigate("/schedules");
        onAddSchedule?.();
      },
    },
    {
      id: "order",
      label: "Pesanan",
      Icon: ClipboardList,
      tone: "bg-brand-navyLight",
      onClick: () => {
        setFabOpen(false);
        navigate("/orders");
        onAddOrder?.();
      },
    },
    {
      id: "cash",
      label: "Kas",
      Icon: Wallet,
      tone: "bg-emerald-600",
      onClick: () => {
        setFabOpen(false);
        navigate("/cash");
        onAddTransaction?.();
      },
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setFabOpen(false);
      }
    };
    if (fabOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [fabOpen]);

  return (
    <>
      <AnimatePresence>
        {fabOpen && (
          <motion.button
            type="button"
            aria-label="Tutup menu aksi"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-brand-navyDark/35 backdrop-blur-[3px] md:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
        <nav className="pointer-events-auto relative mx-auto flex h-[68px] max-w-md items-center rounded-[24px] border border-white/80 bg-white/95 px-2 shadow-[0_18px_55px_rgba(7,27,51,0.2)] backdrop-blur-xl">
          <div className="flex h-full w-[41%] items-center">
            {LEFT_TABS.map((tab) => (
              <TabButton key={tab.id} {...tab} current={current} setTab={setTab} />
            ))}
          </div>

          <div className="h-full w-[18%]" />

          <div className="flex h-full w-[41%] items-center">
            {RIGHT_TABS.map((tab) => (
              <TabButton key={tab.id} {...tab} current={current} setTab={setTab} />
            ))}
          </div>

          <div ref={fabRef} className="absolute left-1/2 top-0 -translate-x-1/2">
            <AnimatePresence>
              {fabOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.94 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-[76px] left-1/2 grid w-[220px] -translate-x-1/2 grid-cols-2 gap-2 rounded-[22px] border border-white/70 bg-white/95 p-2.5 shadow-[0_24px_60px_rgba(7,27,51,0.25)] backdrop-blur-xl"
                >
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className="flex min-h-[52px] items-center gap-2.5 rounded-2xl px-2.5 text-left text-xs font-bold text-brand-navyDark transition-colors hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[13px] text-white shadow-sm ${action.tone}`}
                      >
                        <action.Icon size={16} />
                      </span>
                      {action.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              aria-label={fabOpen ? "Tutup menu aksi" : "Buat data baru"}
              aria-expanded={fabOpen}
              onClick={() => setFabOpen((open) => !open)}
              whileTap={{ scale: 0.9 }}
              className="grid h-[58px] w-[58px] -translate-y-[18px] place-items-center rounded-[20px] border-[5px] border-surface-base bg-brand-orange text-white shadow-[0_14px_28px_rgba(242,101,34,0.36)]"
            >
              <motion.span
                animate={{ rotate: fabOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
              >
                <Plus size={25} strokeWidth={2.6} />
              </motion.span>
            </motion.button>
          </div>
        </nav>
      </footer>
    </>
  );
}
