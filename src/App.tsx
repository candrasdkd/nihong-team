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
const InboxPage = React.lazy(() => import("./pages/InboxPage").then(m => ({ default: m.InboxPage })));
const SharedPreOrderPage = React.lazy(() => import("./pages/SharedPreOrderPage").then(m => ({ default: m.SharedPreOrderPage })));
const SharedLedgerPage = React.lazy(() => import("./pages/SharedLedgerPage").then(m => ({ default: m.SharedLedgerPage })));
const SharedDeliveryAddressPage = React.lazy(() => import("./pages/SharedDeliveryAddressPage").then(m => ({ default: m.SharedDeliveryAddressPage })));

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
import logo from "./assets/nihong.png";

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

function InboxRoute() {
  return <InboxPage />;
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
      className="relative z-10 flex h-screen w-full overflow-hidden"
    >
      {/* SIDEBAR */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-transparent">
        {/* Header toolbar for mobile */}
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/80 bg-surface-card/90 px-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-[13px] shadow-sm ring-1 ring-surface-border">
              <img src={logo} alt="Nihong Jastip" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="block text-sm font-extrabold leading-none tracking-tight text-brand-navyDark">Nihong</span>
              <span className="mt-1 block text-[8px] font-extrabold uppercase tracking-[0.2em] text-brand-orange">
                Jastip workspace
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </div>
        </header>

        <main className="relative flex-1 pb-24 md:pb-0">
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-base p-4">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-navy/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex w-full max-w-sm flex-col items-center gap-6 text-center"
        >
          <div className="relative grid h-20 w-20 place-items-center rounded-[26px] bg-white shadow-[0_20px_50px_rgba(7,27,51,0.14)] ring-1 ring-surface-border">
            <motion.div
              className="absolute -inset-1 rounded-[28px] border-2 border-brand-orange border-r-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
            />
            <div className="h-14 w-14 overflow-hidden rounded-[18px]">
              <img src={logo} alt="Nihong Jastip" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-sm font-black uppercase tracking-[0.18em] text-brand-navyDark">
              Menyiapkan workspace
            </h1>
            <p className="max-w-[240px] text-xs font-medium leading-relaxed text-slate-500">
              Menghubungkan data operasional Nihong secara aman…
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
      { path: "inbox", element: <InboxRoute /> },
      { path: "menu", element: <MenuRoute /> },
    ],
  },
]);

export default function App() {
  // 🔗 Detect share link — render standalone page without auth
  const searchParams = new URLSearchParams(window.location.search);
  const shareScheduleId = searchParams.get("share");
  const shareLedger = searchParams.get("share_ledger");
  const deliveryShareToken = searchParams.get("delivery");

  if (deliveryShareToken) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <SharedDeliveryAddressPage shareToken={deliveryShareToken} />
      </Suspense>
    );
  }

  if (shareScheduleId) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <SharedPreOrderPage scheduleId={shareScheduleId} />
      </Suspense>
    );
  }

  if (shareLedger) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <SharedLedgerPage />
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
