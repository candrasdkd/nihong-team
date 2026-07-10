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
import logoLight from "../assets/logo-admin.png";

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
        w-full flex items-center gap-3 rounded-input transition-all duration-200 outline-none relative group
        ${isCollapsed ? "justify-center px-0 py-3" : "px-3.5 py-2.5"}
        ${isActive
          ? "text-white bg-brand-navyLight/30 font-semibold"
          : "text-slate-400 hover:text-white hover:bg-white/5"
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-orange rounded-r-full" />
      )}
      <Icon size={18} className={`shrink-0 relative z-10 ${isActive ? "text-brand-orange" : ""}`} />
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
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col h-screen shrink-0 z-40 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #011D47 0%, #012E6C 100%)" }}
    >
      <div
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 0% 0%, rgba(247,147,30,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="h-16 flex items-center justify-between px-4 shrink-0 relative border-b border-white/5">
        <Link
          to="/"
          className={`flex items-center gap-3 focus:outline-none overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}
        >
          <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/10">
            <img src={logoLight} alt="Logo" className="h-full w-full object-cover" />
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
                <h1 className="text-sm font-bold leading-none text-white tracking-tight">
                  Nihong Jastip
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                  Admin Panel
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] bg-brand-navy border border-white/10 rounded-full p-1 text-slate-400 hover:text-white shadow-lg z-50 transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
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
          <div className="pt-4 pb-1">
            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-3">Lainnya</p>
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

      <div className="shrink-0 p-3 border-t border-white/5">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-orange grid place-items-center text-white text-sm font-bold shadow-lg ring-2 ring-white/10">
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
                <p className="text-sm font-semibold text-white truncate leading-none">
                  {user.displayName || "Admin"}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
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
                className="p-2 shrink-0 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            className="mt-3 w-full flex justify-center p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
