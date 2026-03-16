import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "firebase/auth";
import {
  Home,
  PackageSearch,
  Users,
  ShoppingCart,
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CalendarDays
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
  { id: "home", label: "Dashboard", icon: Home },
  { id: "orders", label: "Orders", icon: PackageSearch },
  { id: "customers", label: "Customers", icon: Users },
  { id: "purchase", label: "Purchase", icon: ShoppingCart },
  { id: "cash", label: "Kas", icon: Wallet },
  { id: "schedule", label: "Jadwal", icon: CalendarDays },
];

export function Sidebar({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout
}: SidebarProps) {
  return (
    <motion.aside
      className="hidden md:flex flex-col bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 z-40 transition-all duration-300 relative"
      animate={{ width: isCollapsed ? 80 : 256 }}
    >
      {/* Brand & Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200/80 dark:border-neutral-800/80 shrink-0">
        <button
          className={`flex items-center gap-3 group focus:outline-none overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}
          onClick={() => onTabChange("home")}
        >
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="h-10 w-10 shrink-0 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-sm bg-indigo-50 dark:bg-neutral-900 grid place-items-center relative z-10"
          >
            <img
              src={logoLight}
              alt="Logo"
              className="h-full w-full object-cover"
            />
          </motion.div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-left whitespace-nowrap"
            >
              <h1 className="text-lg font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
                Nihong Jastip
              </h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                Admin Dashboard
              </p>
            </motion.div>
          )}
        </button>

        {/* Toggle Button - Float right when expanded, hide when collapsed (only show absolute toggle) */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Absolute Toggle Button for Collapsed State */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full p-1 text-neutral-500 hover:text-indigo-600 shadow-sm z-50"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 custom-scrollbar">
        {MENU_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 outline-none
                ${isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={20} className={`shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`} />

              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="shrink-0 p-4 border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 grid place-items-center text-white text-sm font-bold shadow-inner">
            {user.email?.[0].toUpperCase() || "A"}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate">
                {user.displayName || "Admin"}
              </p>
              <p className="text-xs text-neutral-400 truncate">
                {user.email}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-2 shrink-0 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

        {/* Logout via icon full width if collapsed */}
        {isCollapsed && (
          <button
            onClick={onLogout}
            title="Keluar"
            className="mt-4 w-full flex justify-center p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
