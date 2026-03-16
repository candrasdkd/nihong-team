import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import { Dashboard, ApplicationView } from "./pages/Dashboard";
import { OrdersPage } from "./pages/OrdersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { LedgerPage } from "./pages/LedgerPage";
import { LoginPage } from "./pages/LoginPage";
import PurchasesPage from "./pages/PurchasesPage";
import { SchedulePage } from "./pages/SchedulePage";

// Components
import { Sidebar } from "./components/Sidebar";
import { UnitPriceModal } from "./components/UnitPriceModal";
import { BottomTabBar } from "./components/BottomTabBar";
import { InstallPrompt } from "./components/InstallPrompt";
import { NotificationPermissionModal } from "./components/NotificationPermissionModal";
import UpdatePrompt from "./components/UpdatePrompt";

// Assets & Services
import logoLight from "./assets/logo-admin.png";
import { Customer, Order, TabId } from "./types";
import { listenCustomers } from "./services/customersFirebase";
import { subscribeOrders, toExtended } from "./services/ordersFirebase";
import { listenAuth, logout } from "./services/authFirebase";
import { subscribeSettings } from "./services/settingsFirebase";
import { endOfMonth, startOfMonth, toInputDate } from "./utils/helpers";
import StoryGeneratorDynamic from "./pages/StoryGeneratorPage";
import { LogoutModal } from "./components/ModalLogout";
import { notificationService } from "./services/notificationService";
import { LogOut } from "lucide-react";
// Icon Sederhana

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
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.4] dark:opacity-[0.05]"></div>
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
            {tab === "purchase" && <PurchasesPage />}
            {tab === "cash" && <LedgerPage />}
            {tab === "generator" && <StoryGeneratorDynamic />}
            {tab === "schedule" && <SchedulePage />}
            {tab === "apps" && (
              <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                  <ApplicationView
                    user={user}
                    registerFCM={() => {}}
                    setActiveFeature={(v) => setTab(v as any)}
                  />
                </div>
              </div>
            )}
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
                      Math.ceil(Math.max(0, (o as any).jumlahKg || 0)) *
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
