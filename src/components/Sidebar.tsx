import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "firebase/auth";
import {
  Home,
  PackageSearch,
  Users,
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  UserRound,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { TabId } from "../types";
import logoLight from "../assets/logo-admin.png";

interface SidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: User;
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
  { id: "preorders",  label: "Pre Order",  icon: ShoppingBag },
];

// Reusable nav button used for both main and sub menu items
function NavItem({
  item, isActive, isCollapsed, onTabChange, layoutId,
}: {
  item: { id: string; label: string; icon: React.ElementType };
  isActive: boolean;
  isCollapsed: boolean;
  onTabChange: (tab: TabId) => void;
  layoutId: string;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onTabChange(item.id as TabId)}
      title={isCollapsed ? item.label : undefined}
      className={`
        w-full flex items-center gap-3 rounded-xl transition-all duration-200 outline-none relative
        ${isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}
        ${isActive ? "text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}
      `}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-xl"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(79,70,229,0.2) 100%)" }}
          transition={{ type: "spring", duration: 0.4 }}
        />
      )}
      {isActive && !isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
      )}
      <Icon size={18} className={`shrink-0 relative z-10 ${isActive ? "text-indigo-300" : ""}`} />
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
    </button>
  );
}

export function Sidebar({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 248 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col h-screen shrink-0 z-40 relative overflow-visible"
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Subtle glow top-left */}
      <div
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }}
      />

      {/* ── Brand ── */}
      <div className="h-16 flex items-center justify-between px-4 shrink-0 relative"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          className={`flex items-center gap-3 focus:outline-none overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}
          onClick={() => onTabChange("home")}
        >
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="h-9 w-9 shrink-0 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/10"
          >
            <img src={logoLight} alt="Logo" className="h-full w-full object-cover" />
          </motion.div>

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
        </button>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Collapse toggle ketika collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] bg-[#1e293b] border border-white/10 rounded-full p-1 text-slate-400 hover:text-white shadow-lg z-50 transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {/* Main menu items */}
        {MENU_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onTabChange={onTabChange}
              layoutId="sidebar-active"
            />
          );
        })}

        {/* Divider */}
        {!isCollapsed && (
          <div className="pt-3 pb-1">
            <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-widest px-3">Fitur Lainnya</p>
          </div>
        )}
        {isCollapsed && <div className="my-2 mx-3 border-t border-white/10" />}

        {/* Sub menu items */}
        {SUB_MENU_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onTabChange={onTabChange}
              layoutId="sidebar-active-sub"
            />
          );
        })}
      </nav>

      {/* ── User Profile ── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          {/* Avatar */}
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white text-sm font-bold shadow-lg ring-2 ring-white/10">
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
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
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
                className="p-2 shrink-0 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Logout collapsed */}
        {isCollapsed && (
          <button
            onClick={onLogout}
            title="Keluar"
            className="mt-3 w-full flex justify-center p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
