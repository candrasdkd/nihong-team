import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import { Dashboard } from "./pages/Dashboard";
import { OrdersPage } from "./pages/OrdersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { LedgerPage } from "./pages/LedgerPage";
import { LoginPage } from "./pages/LoginPage";
import { MenuPage } from "./pages/MenuPage";
import { JastipersPage } from "./pages/JastipersPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { PreOrdersPage } from "./pages/PreOrdersPage";

// Components
import { Sidebar } from "./components/Sidebar";
import { UnitPriceModal } from "./components/UnitPriceModal";
import { BottomTabBar } from "./components/BottomTabBar";
import { InstallPrompt } from "./components/InstallPrompt";
import { NotificationPermissionModal } from "./components/NotificationPermissionModal";
import { LogoutModal } from "./components/ModalLogout";
import UpdatePrompt from "./components/UpdatePrompt";
import { LogOut } from "lucide-react";

// Types & Services
import { Customer, Order, TabId } from "./types";
import { listenAuth, logout } from "./services/authFirebase";
import { listenCustomers } from "./services/customersFirebase";
import {
  subscribeActiveOrders,
  subscribeMonthlySummaries,
  recalculateAllStats,
  toExtended
} from "./services/ordersFirebase";
import { subscribeSettings } from "./services/settingsFirebase";
import { notificationService } from "./services/notificationService";
import { endOfMonth, startOfMonth, toInputDate } from "./utils/helpers";

// Assets
import logoLight from "./assets/logo-admin.png";

export default function App() {
  const [tab, setTab] = useState<TabId>("home");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unitPrice, setUnitPrice] = useState<number>(100_000);
  const [globalJastipYen, setGlobalJastipYen] = useState<number>(1000); // from global settings
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal States
  const [showUnitPriceModal, setShowUnitPriceModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "default"
  );

  // 🔐 AUTH STATE
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // 🔐 Listen auth
  useEffect(() => {
    const unsub = listenAuth((u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setCustomersLoading(true);
        setOrdersLoading(true);
      }
    });
    return () => unsub();
  }, []);

  // 🔔 Check Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      const perm = Notification.permission;
      setNotificationPermission(perm);

      if (perm !== "granted") {
        // Show modal after a short delay to not overwhelm the user immediately
        const timer = setTimeout(() => {
          setShowNotificationModal(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // 🔊 Realtime customers
  useEffect(() => {
    if (!user) return;
    const unsub = listenCustomers((rows) => {
      setCustomers(rows as Customer[]);
      setCustomersLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 🔊 Realtime Global Settings
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeSettings((data) => {
      if (data?.jastipYenPerKg) {
        setGlobalJastipYen(data.jastipYenPerKg);
      }
      if (data?.unitPriceIdr) {
        setUnitPrice(data.unitPriceIdr); // future proofing
      }
    });
    return () => unsub();
  }, [user]);

  // 🔊 Realtime Active Orders (for notifications & active count)
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeActiveOrders((rows) => {
      setOrders(rows.map(toExtended) as Order[]);
      setOrdersLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 🔊 Realtime Monthly Order Summaries (for Dashboard)
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMonthlySummaries((data) => {
      setMonthlySummaries(data);
    });
    return () => unsub();
  }, [user]);

  // 🔔 Notification Logic
  useEffect(() => {
    if (orders.length > 0 && tab === "home") {
      // Check for pending orders after some delay to allow state to settle
      const timer = setTimeout(() => {
        notificationService.checkAndNotifyOrders(orders);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orders, tab]);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleEnableNotifications = async () => {
    const res = await notificationService.requestPermission();
    setNotificationPermission(res);
    if (res === "granted") {
      setShowNotificationModal(false);
    }
  };

  // ⏳ Loading Screen
  const isAppLoading = authLoading || (user !== null && (customersLoading || ordersLoading));

  return (
    <div className="min-h-screen text-slate-900 bg-[#f8fafc] relative overflow-hidden">
      {/* Background pattern & ambient glows */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        {/* Glow 1: Indigo Top-Right */}
        <div className="absolute -top-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-indigo-400/8 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: "8s" }} />
        {/* Glow 2: Emerald Bottom-Left */}
        <div className="absolute bottom-[10%] left-[5%] w-[550px] h-[550px] rounded-full bg-emerald-400/6 blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: "12s" }} />
        {/* Glow 3: Violet Center-Right */}
        <div className="absolute top-[35%] right-[15%] w-[450px] h-[450px] rounded-full bg-violet-400/5 blur-[90px] mix-blend-multiply animate-pulse" style={{ animationDuration: "10s" }} />

        {/* Fine Technical Grid Pattern with Radial Mask */}
        <div 
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {isAppLoading ? (
          <motion.div
            key="splash-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#f8fafc]/50 dark:bg-neutral-950/50 backdrop-blur-xs"
          >
            {/* Glowing Glassmorphic Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
              className="relative p-8 md:p-12 rounded-3xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-sm w-full mx-4 flex flex-col items-center text-center gap-6"
            >
              {/* Spinning / Glowing Ring and Logo */}
              <div className="relative">
                {/* Glowing Aura */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-4 rounded-full bg-indigo-500/10 dark:bg-indigo-400/25 blur-xl"
                />
                
                {/* Premium Spinning Ring */}
                <svg className="w-28 h-28 animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="rgba(99, 102, 241, 0.04)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="url(#spinner-grad)"
                    strokeWidth="3.5"
                    fill="none"
                    strokeDasharray="276"
                    strokeDashoffset="100"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Logo Centered */}
                <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-xl grid place-items-center overflow-hidden p-1">
                  <img
                    src={logoLight}
                    alt="Logo"
                    className="h-full w-full object-cover rounded-full"
                  />
                </div>
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <h1 className="text-xl font-black tracking-tight text-neutral-800 dark:text-neutral-100 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                  Nihong Jastip
                </h1>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-bold text-indigo-600/80 dark:text-indigo-400 uppercase tracking-widest animate-pulse">
                    Memuat data...
                  </p>
                  <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 max-w-[200px]">
                    {authLoading ? "Menghubungkan ke sesi aman..." : "Menyinkronkan data Firestore..."}
                  </p>
                </div>
              </div>

              {/* Sleek subtle progress line */}
              <div className="w-full bg-neutral-200/50 dark:bg-neutral-800/50 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : !user ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full h-full min-h-screen z-10 relative"
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="app-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex h-screen overflow-hidden w-full z-10 relative"
          >
            {/* SIDEBAR */}
            <Sidebar
              currentTab={tab}
              onTabChange={setTab}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              user={user}
              onLogout={() => setShowLogoutModal(true)}
            />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0 relative custom-scrollbar">
              {/* MOBILE TOP BAR */}
              <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-slate-100/80 sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg overflow-hidden ring-2 ring-[#0a2342]/10 shrink-0">
                    <img src={logoLight} alt="Logo" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-800 tracking-tight">Nihong Jastip</span>
                </div>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center justify-center p-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-100/30 transition-all duration-200 shadow-sm shrink-0"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>

              <main className="min-h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab === "home" && (
                      <Dashboard
                        user={user!}
                        activeOrders={orders}
                        monthlySummaries={monthlySummaries}
                        customers={customers}
                        unitPrice={unitPrice}
                        globalJastipYen={globalJastipYen}
                        onSeeAllOrders={() => setTab("orders")}
                        setActiveFeature={(feature) => setTab(feature as any)}
                        onRecalculateStats={recalculateAllStats}
                      />
                    )}
                    {tab === "orders" && (
                      <OrdersPage
                        customers={customers}
                        unitPrice={unitPrice}
                      />
                    )}
                    {tab === "customers" && <CustomersPage />}
                    {tab === "cash" && <LedgerPage />}
                    {tab === "menu" && <MenuPage onTabChange={setTab} />}
                    {tab === "jastipers" && <JastipersPage />}
                    {tab === "schedules" && <SchedulesPage />}
                    {tab === "preorders" && <PreOrdersPage />}

                  </motion.div>
                </AnimatePresence>
              </main>
            </div>

            {/* NAVBAR MOBILE */}
            <BottomTabBar current={tab} setTab={setTab} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL HARGA & LOGOUT */}
      <AnimatePresence>
        {showUnitPriceModal && (
          <UnitPriceModal
            unitPrice={unitPrice}
            onClose={() => setShowUnitPriceModal(false)}
            onSave={(newPrice, recalc) => {
              setUnitPrice(newPrice);
              if (recalc) {
                setOrders((prev) =>
                  prev.map((o) => ({
                    ...o,
                    totalHarga:
                      (Math.ceil(Math.max(0, (o as any).jumlahKg || 0) * 2) / 2) *
                      newPrice,
                  })),
                );
              }
              setShowUnitPriceModal(false);
            }}
          />
        )}

        {showLogoutModal && (
          <LogoutModal
            isOpen={showLogoutModal}
            onClose={() => setShowLogoutModal(false)}
            onConfirm={handleLogoutConfirm}
          />
        )}
      </AnimatePresence>
      <InstallPrompt />
      <NotificationPermissionModal
        isOpen={showNotificationModal}
        isDenied={notificationPermission === "denied"}
        onClose={() => setShowNotificationModal(false)}
        onConfirm={handleEnableNotifications}
      />
      <UpdatePrompt />
    </div>
  );
}
