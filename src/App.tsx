import React, { useEffect, useState, Suspense } from "react";
import { RouterProvider, createBrowserRouter, Outlet, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "./hooks/useReducedMotion";

// Skeletons
import { PageSkeleton, DashboardSkeleton, OrdersSkeleton } from "./components/Skeletons";

// Global UI
import { ToastContainer, useToastManager } from "./components/ui/Toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

// Pages (Dynamically imported)
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const OrdersPage = React.lazy(() => import("./pages/OrdersPage").then(m => ({ default: m.OrdersPage })));
const CustomersPage = React.lazy(() => import("./pages/CustomersPage").then(m => ({ default: m.CustomersPage })));
const LedgerPage = React.lazy(() => import("./pages/LedgerPage").then(m => ({ default: m.LedgerPage })));
const LoginPage = React.lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const MenuPage = React.lazy(() => import("./pages/MenuPage").then(m => ({ default: m.MenuPage })));
const JastipersPage = React.lazy(() => import("./pages/JastipersPage").then(m => ({ default: m.JastipersPage })));
const SchedulesPage = React.lazy(() => import("./pages/SchedulesPage").then(m => ({ default: m.SchedulesPage })));
const PreOrdersPage = React.lazy(() => import("./pages/PreOrdersPage").then(m => ({ default: m.PreOrdersPage })));
const SharedPreOrderPage = React.lazy(() => import("./pages/SharedPreOrderPage").then(m => ({ default: m.SharedPreOrderPage })));

// Components
import { Sidebar } from "./components/Sidebar";

import { BottomTabBar } from "./components/BottomTabBar";
import { InstallPrompt } from "./components/InstallPrompt";

import { LogoutModal } from "./components/ModalLogout";
import UpdatePrompt from "./components/UpdatePrompt";

// Context Providers
import { AuthProvider, useAuth } from "./context/authContext";
import { SettingsProvider, useSettings } from "./context/settingsContext";

// Types & Services
import { Customer, Order } from "./types";
import { listenCustomers } from "./services/customersFirebase";
import {
  subscribeActiveOrders,
  subscribeMonthlySummaries,
  recalculateAllStats,
  toExtended
} from "./services/ordersFirebase";
import { checkAndProcessExpiredSchedules } from "./services/preOrdersFirebase";


// Assets
import logoLight from "./assets/logo-admin.png";

// Route wrapper components
function DashboardRoute() {
  const navigate = useNavigate();
  const { orders, customers, monthlySummaries, customersLoading, ordersLoading } = useOutletContext<any>();

  if ((orders.length === 0 || customers.length === 0) && (customersLoading || ordersLoading)) {
    return <DashboardSkeleton />;
  }

  return (
    <Dashboard
      activeOrders={orders}
      monthlySummaries={monthlySummaries}
      customers={customers}
      onSeeAllOrders={() => navigate("/orders")}
      setActiveFeature={(feature) => navigate(`/${feature}`)}
      onRecalculateStats={recalculateAllStats}
    />
  );
}

function OrdersRoute() {
  const { customers, customersLoading, orderFormTrigger, setOrderFormTrigger } = useOutletContext<any>();

  if (customers.length === 0 && customersLoading) {
    return <OrdersSkeleton />;
  }

  return (
    <OrdersPage
      customers={customers}
      formTrigger={orderFormTrigger}
      onFormTriggerConsumed={() => setOrderFormTrigger(0)}
    />
  );
}

function CustomersRoute() {
  return <CustomersPage />;
}

function LedgerRoute() {
  const { ledgerFormTrigger, setLedgerFormTrigger } = useOutletContext<any>();
  return (
    <LedgerPage
      formTrigger={ledgerFormTrigger}
      onFormTriggerConsumed={() => setLedgerFormTrigger(0)}
    />
  );
}

function MenuRoute() {
  const navigate = useNavigate();
  return <MenuPage onTabChange={(tab) => navigate(tab === "home" ? "/" : `/${tab}`)} />;
}

function JastipersRoute() {
  return <JastipersPage />;
}

function SchedulesRoute() {
  const { scheduleFormTrigger, setScheduleFormTrigger } = useOutletContext<any>();
  return (
    <SchedulesPage
      formTrigger={scheduleFormTrigger}
      onFormTriggerConsumed={() => setScheduleFormTrigger(0)}
    />
  );
}

function PreOrdersRoute() {
  const { preorderFormTrigger, setPreorderFormTrigger } = useOutletContext<any>();
  return (
    <PreOrdersPage
      formTrigger={preorderFormTrigger}
      onFormTriggerConsumed={() => setPreorderFormTrigger(0)}
    />
  );
}

// Layout Shell for Authenticated Users
function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unitPrice, setUnitPrice } = useSettings();
  const shouldReduceMotion = useReducedMotion();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { toasts, showToast, removeToast } = useToastManager();

  // SpeedDialFAB form triggers — increment to auto-open the create form
  const [orderFormTrigger, setOrderFormTrigger] = useState(0);
  const [preorderFormTrigger, setPreorderFormTrigger] = useState(0);
  const [ledgerFormTrigger, setLedgerFormTrigger] = useState(0);
  const [scheduleFormTrigger, setScheduleFormTrigger] = useState(0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);

  // Resolve current active tab key from location path
  const currentTab = location.pathname === "/"
    ? "home"
    : location.pathname.substring(1).split("/")[0];

  // 🔄 Auto-close and convert expired schedules & pre-orders on startup (protected by distributed lock)
  useEffect(() => {
    if (!user) return;
    checkAndProcessExpiredSchedules()
      .then((res) => {
        if (res && res.closed > 0) {
          console.log(`[Auto-Close] Berhasil menutup ${res.closed} jadwal kadaluarsa dan memindahkan ${res.converted} pre-order ke pesanan.`);
        }
      })
      .catch((err) => {
        console.error("[Auto-Close] Gagal menjalankan check kadaluarsa:", err);
      });
  }, [user]);



  // 🔊 Realtime customers
  useEffect(() => {
    if (!user || (currentTab !== "home" && currentTab !== "orders")) return;
    const unsub = listenCustomers((rows) => {
      setCustomers(rows as Customer[]);
      setCustomersLoading(false);
    });
    return () => unsub();
  }, [user, currentTab]);

  // 🔊 Realtime Active Orders
  useEffect(() => {
    if (!user || currentTab !== "home") return;
    const unsub = subscribeActiveOrders((rows) => {
      setOrders(rows.map(toExtended) as Order[]);
      setOrdersLoading(false);
    });
    return () => unsub();
  }, [user, currentTab]);

  // 🔊 Realtime Monthly Order Summaries
  useEffect(() => {
    if (!user || currentTab !== "home") return;
    const unsub = subscribeMonthlySummaries((data) => {
      setMonthlySummaries(data);
    });
    return () => unsub();
  }, [user, currentTab]);





  return (
    <motion.div
      key="app-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex h-screen overflow-hidden w-full z-10 relative"
    >
      {/* SIDEBAR */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-surface-base relative">
        {/* Header toolbar for mobile */}
        <header className="h-14 flex items-center justify-between px-4 bg-surface-card border-b border-surface-border shrink-0 md:hidden relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg overflow-hidden border border-surface-border p-0.5">
              <img src={logoLight} alt="Logo" className="h-full w-full object-cover rounded-md" />
            </div>
            <span className="text-xs font-bold text-brand-navy tracking-wide">Nihong Jastip</span>
          </div>
        </header>

        <main className="flex-1 pb-16 md:pb-0 relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={location.pathname}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="absolute inset-0"
            >
              <Suspense fallback={<PageSkeleton />}>
                <ErrorBoundary>
                  <Outlet
                    context={{
                      orders,
                      customers,
                      monthlySummaries,
                      customersLoading,
                      ordersLoading,
                      orderFormTrigger,
                      setOrderFormTrigger,
                      preorderFormTrigger,
                      setPreorderFormTrigger,
                      ledgerFormTrigger,
                      setLedgerFormTrigger,
                      scheduleFormTrigger,
                      setScheduleFormTrigger,
                      showToast,
                    }}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* NAVBAR MOBILE */}
      <BottomTabBar
        onAddOrder={() => {
          setOrderFormTrigger((p) => p + 1);
        }}
        onAddBooking={() => {
          setPreorderFormTrigger((p) => p + 1);
        }}
        onAddTransaction={() => {
          setLedgerFormTrigger((p) => p + 1);
        }}
        onAddSchedule={() => {
          setScheduleFormTrigger((p) => p + 1);
        }}
      />

      {/* MODAL LOGOUT */}
      <AnimatePresence>

        {showLogoutModal && (
          <LogoutModal
            isOpen={showLogoutModal}
            onClose={() => setShowLogoutModal(false)}
            onConfirm={() => {
              setShowLogoutModal(false);
              logout();
            }}
          />
        )}
      </AnimatePresence>

      <InstallPrompt />

      <UpdatePrompt />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </motion.div>
  );
}

// Authentication & Page Router Guard Shell
function RootLayout() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 max-w-sm w-full text-center"
        >
          {/* Spinner Animation */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
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
            <div className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-white border border-neutral-100 shadow-xl grid place-items-center overflow-hidden p-0.5">
              <img src={logoLight} alt="Logo" className="h-full w-full object-cover rounded-full" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-sm font-black tracking-widest text-slate-400 uppercase">
              Memuat Aplikasi
            </h1>
            <p className="text-[10px] font-bold text-slate-500 max-w-[220px] leading-relaxed">
              Menghubungkan ke sesi aman Firebase...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <LoginPage />
      </Suspense>
    );
  }

  return <AppShell />;
}

// Router configuration mapping paths to component slots
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { path: "", element: <DashboardRoute /> },
      { path: "orders", element: <OrdersRoute /> },
      { path: "customers", element: <CustomersRoute /> },
      { path: "cash", element: <LedgerRoute /> },
      { path: "jastipers", element: <JastipersRoute /> },
      { path: "schedules", element: <SchedulesRoute /> },
      { path: "preorders", element: <PreOrdersRoute /> },
      { path: "menu", element: <MenuRoute /> },
    ],
  },
]);

export default function App() {
  // 🔗 Detect share link — render standalone page without auth
  const shareScheduleId = new URLSearchParams(window.location.search).get("share");
  if (shareScheduleId) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <SharedPreOrderPage scheduleId={shareScheduleId} />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  );
}
