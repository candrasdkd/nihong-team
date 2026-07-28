import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/authContext";
import {
  Users,
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  UserRound,
  Calendar,
  ShoppingBag,
  PackageSearch,
} from "lucide-react";
import logo from "../assets/nihong.png";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

const MENU_ITEMS = [
  { id: "home",      label: "Dashboard", icon: LayoutDashboard },
  { id: "orders",    label: "Pesanan",   icon: PackageSearch },
  { id: "cash",      label: "Kas",       icon: Wallet },
];

const SUB_MENU_ITEMS = [
  { id: "customers",  label: "Pelanggan",  icon: Users },
  { id: "jastipers",  label: "Jastiper",   icon: UserRound },
  { id: "schedules",  label: "Jadwal",     icon: Calendar },
  { id: "preorders",  label: "Booking",    icon: ShoppingBag },
];

function NavItem({
  item, isActive, isCollapsed,
}: {
  item: { id: string; label: string; icon: React.ElementType };
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;
  const to = item.id === "home" ? "/" : `/${item.id}`;

  return (
    <Link
      to={to}
      title={isCollapsed ? item.label : undefined}
      className={`
        w-full flex items-center gap-3 rounded-input transition-all duration-200 outline-none relative group min-h-[46px]
        ${isCollapsed ? "justify-center px-0 py-3" : "px-3.5 py-2.5"}
        ${isActive
          ? "text-brand-navyDark bg-white font-bold shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
          : "text-slate-400 hover:text-white hover:bg-white/[0.07]"
        }
      `}
    >
      {isActive && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-orange rounded-full" />
      )}
      <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} className={`shrink-0 relative z-10 ${isActive ? "text-brand-orange" : ""}`} />
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate relative z-10 text-sm"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onLogout,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const currentTab = location.pathname === "/"
    ? "home"
    : location.pathname.substring(1).split("/")[0];

  if (!user) return null;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 272 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col h-screen shrink-0 z-40 relative overflow-hidden app-grid shadow-sidebar"
      style={{ background: "linear-gradient(165deg, #071B33 0%, #0B2545 58%, #123A63 100%)" }}
    >
      <div
        className="absolute -top-24 -left-16 w-72 h-72 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(242,101,34,0.16) 0%, transparent 66%)",
        }}
      />
      <div
        className="absolute -bottom-28 -right-24 w-72 h-72 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 68%)" }}
      />

      <div className="h-20 flex items-center justify-between px-4 shrink-0 relative border-b border-white/[0.07]">
        <Link
          to="/"
          className={`flex items-center gap-3 focus:outline-none overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}
        >
          <div className="h-10 w-10 shrink-0 rounded-[15px] overflow-hidden shadow-lg ring-1 ring-white/15">
            <img src={logo} alt="Nihong Jastip" className="h-full w-full object-cover" />
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-left whitespace-nowrap overflow-hidden"
              >
                <h1 className="text-[15px] font-extrabold leading-none text-white tracking-tight">
                  Nihong
                </h1>
                <p className="text-[9px] text-brand-orangeLight font-extrabold uppercase tracking-[0.2em] mt-1">
                  Jastip workspace
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Ciutkan navigasi"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          aria-label="Perluas navigasi"
          className="absolute right-3 top-[88px] bg-white/10 border border-white/10 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/15 shadow-lg z-50 transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 custom-scrollbar relative">
        {!isCollapsed && (
          <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[0.2em] px-3 pb-2">Utama</p>
        )}
        {MENU_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
            />
          );
        })}

        {!isCollapsed && (
          <div className="pt-5 pb-1">
            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[0.2em] px-3">Operasional</p>
          </div>
        )}
        {isCollapsed && <div className="my-2 mx-3 border-t border-white/10" />}

        {SUB_MENU_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
            />
          );
        })}
      </nav>

      <div className="shrink-0 p-3 border-t border-white/[0.07] relative">
        <div className={`flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/[0.07] p-2.5 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="h-10 w-10 shrink-0 rounded-[14px] bg-brand-orange grid place-items-center text-white text-sm font-extrabold shadow-lg shadow-orange-950/20">
            {user.email?.[0].toUpperCase() || "A"}
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-bold text-white truncate leading-none">
                  {user.displayName || "Admin"}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-1">{user.email}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onLogout}
                title="Keluar"
                aria-label="Keluar dari akun"
                className="p-2 shrink-0 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {isCollapsed && (
          <button
            onClick={onLogout}
            title="Keluar"
            aria-label="Keluar dari akun"
            className="mt-3 w-full flex justify-center p-2 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
