import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import { Dashboard } from "./pages/Dashboard";
import { OrdersPage } from "./pages/OrdersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { LedgerPage } from "./pages/LedgerPage";
import { LoginPage } from "./pages/LoginPage";


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
import { subscribeOrders, toExtended } from "./services/ordersFirebase";
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

  // 🔐 Listen auth
  useEffect(() => {
    const unsub = listenAuth((u) => {
      setUser(u);
      setAuthLoading(false);
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
    const unsub = listenCustomers((rows) => setCustomers(rows as Customer[]));
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

  // 🔊 Realtime orders
  useEffect(() => {
    if (!user || (tab !== "home" && tab !== "orders")) return;

    const now = new Date();
    const from = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 11, 1),
    );
    const to = endOfMonth(now);

    const unsub = subscribeOrders(
      {
        fromInput: toInputDate(from),
        toInput: toInputDate(to),
        sort: "desc",
        limit: 1000,
      },
      (rows) => setOrders(rows.map(toExtended) as Order[]),
    );

    return () => unsub();
  }, [tab, user]);

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
  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-indigo-500/20"
            />
            <div className="relative h-24 w-24 rounded-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-2xl grid place-items-center overflow-hidden p-1">
              <img
                src={logoLight}
                alt="Logo"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Nihong Jastip
            </h1>
            <p className="text-sm text-neutral-500 animate-pulse font-medium">
              Memuat data...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen text-slate-900 bg-[#f8fafc] relative">
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

      {/* LAYOUT CONTAINER */}
      <div className="flex h-screen overflow-hidden">
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
                    orders={orders}
                    customers={customers}
                    unitPrice={unitPrice}
                    globalJastipYen={globalJastipYen}
                    onSeeAllOrders={() => setTab("orders")}
                    setActiveFeature={(feature) => setTab(feature as any)}
                  />
                )}
                {tab === "orders" && (
                  <OrdersPage
                    customers={customers}
                    orders={orders}
                    setOrders={setOrders}
                    unitPrice={unitPrice}
                  />
                )}
                {tab === "customers" && <CustomersPage />}
                {tab === "cash" && <LedgerPage />}

              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

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

      {/* NAVBAR MOBILE */}
      <BottomTabBar current={tab} setTab={setTab} />
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
