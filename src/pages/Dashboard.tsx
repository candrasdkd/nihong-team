import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { useSettings } from "../context/settingsContext";
import { motion } from "framer-motion";
import { Customer, Order, PeriodType } from "../types";
import { formatCurrency, formatIDR } from "../utils/format";
import { getMonthKey, MONTH_LABEL_ID, compute } from "../utils/helpers";
import { FlagID, FlagJP } from "../components/ui/Flags";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Area,
} from "recharts";
import { DONE_SET } from "../utils/constants";
import {
  Users,
  ShoppingBag,
  Wallet,
  Activity,
  ArrowRight,
  Bell,
  BellOff,
  PackageCheck,
  CircleDollarSign,
  Clock,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { notificationService } from "../services/notificationService";
import { KursInfoCard } from "../components/KursInfoCard";
import { collection, query, orderBy, limit as qLimit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function formatDate() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 shadow-xl rounded-card p-4 text-sm min-w-[180px]">
      <p className="font-semibold text-white/70 mb-3 text-xs uppercase tracking-wider">{label}</p>
      {payload.map((entry: any, i: number) => {
        const isJpy = entry.name.includes("JPY");
        const valStr = isJpy
          ? `¥${entry.value.toLocaleString("id-ID")}`
          : formatIDR(entry.value);
        return (
          <div key={i} className="flex items-center justify-between gap-4 mb-1.5 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white/50 text-xs">{entry.name}</span>
            </div>
            <span className="font-bold text-white text-xs">{valStr}</span>
          </div>
        );
      })}
    </div>
  );
};

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "success" }> = {
  "Belum Membayar": { label: "Belum Bayar", variant: "warning" },
  "Selesai":        { label: "Selesai", variant: "success" },
};

function StatusPills({ activeCount, totalCount }: { activeCount: number; totalCount: number }) {
  const completedCount = Math.max(0, totalCount - activeCount);
  const counts: Record<string, number> = {
    "Belum Membayar": activeCount,
    "Selesai": completedCount,
  };

  const total = totalCount;

  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
        const count = counts[status] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <Card key={status} className="flex items-center gap-3 !p-4">
            <div className={`w-10 h-10 rounded-xl ${cfg.variant === "warning" ? "bg-amber-50" : "bg-emerald-50"} flex items-center justify-center shrink-0`}>
              {cfg.variant === "warning" ? (
                <Clock size={18} className="text-amber-600" />
              ) : (
                <PackageCheck size={18} className="text-emerald-600" />
              )}
            </div>
            <div>
              <div className={`text-xl font-bold ${cfg.variant === "warning" ? "text-amber-700" : "text-emerald-700"}`}>{count}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide leading-none mt-0.5">
                {cfg.label} · {pct}%
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DashboardView({
  activeOrders, monthlySummaries, customers, unitPrice, globalJastipYen, onSeeAllOrders, onRecalculate,
}: {
  activeOrders: Order[];
  monthlySummaries: any[];
  customers: Customer[];
  unitPrice: number;
  globalJastipYen: number;
  onSeeAllOrders: () => void;
  onRecalculate: () => Promise<void> | void;
}) {
  const [period, setPeriod] = useState<PeriodType>("12m");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasOrdersButNoStats, setHasOrdersButNoStats] = useState(false);

  useEffect(() => {
    async function loadExtras() {
      setLoadingExtras(true);
      try {
        const ordersCol = collection(db, "orders");
        const recentQ = query(ordersCol, orderBy("tanggal", "desc"), qLimit(8));
        const recentSnap = await getDocs(recentQ);
        setRecentOrders(recentSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        if (!monthlySummaries || monthlySummaries.length === 0) {
          setHasOrdersButNoStats(!recentSnap.empty);
        } else {
          setHasOrdersButNoStats(false);
        }
      } catch (err) {
        console.error("Gagal memuat data pendukung dashboard:", err);
      } finally {
        setLoadingExtras(false);
      }
    }
    loadExtras();
  }, [monthlySummaries]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onRecalculate();
      alert("Statistik dashboard berhasil disinkronisasi ulang!");
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan sinkronisasi data.");
    } finally {
      setSyncing(false);
    }
  };

  const { monthlyData, kpi } = useMemo(() => {
    const now = new Date();
    const from = new Date();
    if (period === "30d") from.setDate(now.getDate() - 30);
    if (period === "3m") from.setMonth(now.getMonth() - 3);
    if (period === "12m") from.setMonth(now.getMonth() - 12);

    const fromKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    const toKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const filtered = (monthlySummaries || []).filter((m) => {
      return m.id >= fromKey && m.id <= toKey;
    });

    const monthly = filtered.map((m) => {
      const [y, monthStr] = m.id.split("-");
      const mIdx = Number(monthStr) - 1;
      const label = `${MONTH_LABEL_ID[mIdx]} ${y.slice(2)}`;
      return {
        key: m.id,
        label,
        count: m.orderCount || 0,
        revIdr: m.revenueIdr || 0,
        revJpy: m.revenueJpy || 0,
        profIdr: m.profitIdr || 0,
        profJpy: m.profitJpy || 0,
      };
    }).sort((a, b) => a.key.localeCompare(b.key));

    let revIdr = 0, revJpy = 0, profIdr = 0, profJpy = 0, count = 0;
    monthly.forEach(m => {
      revIdr += m.revIdr;
      revJpy += m.revJpy;
      profIdr += m.profIdr;
      profJpy += m.profJpy;
      count += m.count;
    });

    return {
      monthlyData: monthly,
      kpi: {
        activeOrders: activeOrders.length,
        revIdr,
        revJpy,
        profIdr,
        profJpy,
        totalOrders: count,
      },
    };
  }, [monthlySummaries, activeOrders, period]);

  const PERIOD_OPTIONS = [
    { label: "30H", value: "30d" },
    { label: "3B",  value: "3m" },
    { label: "1T",  value: "12m" },
  ];

  const KPI_CARDS = [
    {
      label: "Total Transaksi",
      value: kpi.revIdr > 0 || kpi.revJpy === 0 ? formatIDR(kpi.revIdr) : `¥${kpi.revJpy.toLocaleString("id-ID")}`,
      sub: kpi.revIdr > 0 && kpi.revJpy > 0 ? `+ ¥${kpi.revJpy.toLocaleString("id-ID")}` : undefined,
      icon: Wallet,
    },
    {
      label: "Total Profit",
      value: kpi.profIdr > 0 || kpi.profJpy === 0 ? formatIDR(kpi.profIdr) : `¥${kpi.profJpy.toLocaleString("id-ID")}`,
      sub: kpi.profIdr > 0 && kpi.profJpy > 0 ? `+ ¥${kpi.profJpy.toLocaleString("id-ID")}` : undefined,
      icon: CircleDollarSign,
    },
    {
      label: "Pesanan Aktif",
      value: kpi.activeOrders,
      sub: "Perlu tindakan",
      icon: Activity,
    },
    {
      label: "Total Pelanggan",
      value: customers.length,
      sub: `${kpi.totalOrders} total transaksi`,
      icon: Users,
    },
  ];

  return (
    <div className="page-container space-y-6">

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-card bg-brand-navy px-6 py-7 shadow-sm"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-orange/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">{formatDate()}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}
            </h2>
            <p className="text-slate-300 mt-1 text-sm">
              Ringkasan performa{" "}
              <span className="text-brand-orange font-medium">
                {period === "30d" ? "30 hari terakhir" : period === "3m" ? "3 bulan terakhir" : "tahun ini"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center bg-white/10 border border-white/10 rounded-input p-0.5">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value as PeriodType)}
                  className={`px-3.5 py-1.5 rounded-input text-xs font-semibold transition-all ${
                    period === p.value
                      ? "bg-brand-orange text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-slate-300 border border-white/10 rounded-input text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Sinkronisasi Ringkasan Laporan"
            >
              <RotateCw size={13} className={syncing ? "animate-spin text-brand-orange" : ""} />
              <span className="hidden xs:inline">Sync</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sync Alert Banner */}
      {hasOrdersButNoStats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-card bg-brand-navyLight text-white flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <RotateCw size={20} className="animate-spin text-white" style={{ animationDuration: "3s" }} />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base tracking-tight">Statistik Belum Disinkronkan</h4>
              <p className="text-xs text-white/80 mt-0.5 max-w-2xl leading-relaxed">
                Kami mendeteksi adanya data pesanan di database Anda, namun performa bulanan belum dihitung. Klik tombol di samping untuk menginisialisasi statistik dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-brand-navy disabled:opacity-50 text-xs sm:text-sm font-bold rounded-input transition-all shadow-sm flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            {syncing ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                <span>Menyinkronkan...</span>
              </>
            ) : (
              <span>Sinkronisasikan Sekarang</span>
            )}
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Status Pills */}
      <StatusPills activeCount={kpi.activeOrders} totalCount={kpi.totalOrders} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Chart (2/3) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="xl:col-span-2"
        >
          <Card className="xl:sticky xl:top-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">Analisis Keuangan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Transaksi & Profit per bulan</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1 rounded-full bg-blue-500" />
                  Transaksi
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1 rounded-full bg-emerald-500" />
                  Profit
                </span>
              </div>
            </div>

            <div className="h-[320px] xl:h-[420px]">
              {monthlyData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-4 text-slate-400">
                    <Activity size={26} className="opacity-50 text-brand-navy" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm tracking-tight">Belum Ada Analisis Keuangan</h4>
                  <p className="text-xs text-slate-400 max-w-[320px] mt-1.5 leading-relaxed text-center font-medium">
                    Semua grafik omset, keuntungan bersih, dan margin bulanan Anda akan ditampilkan di sini secara otomatis setelah pesanan tercatat.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => {
                        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
                        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
                        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
                        return String(v);
                      }}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="revIdr"
                      name="Transaksi (IDR)"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#gradRevenue)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="profIdr"
                      name="Profit (IDR)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#gradProfit)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Right column (1/3) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4"
        >
          <KursInfoCard globalJastipYen={globalJastipYen} />

          {/* Recent Orders */}
          <Card className="overflow-hidden !p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-navy/5 flex items-center justify-center">
                  <ShoppingBag size={13} className="text-brand-navy" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Pesanan Terbaru</h3>
              </div>
              <button
                onClick={onSeeAllOrders}
                className="flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-navyLight transition-colors"
              >
                Lihat Semua <ChevronRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-surface-border">
              {recentOrders.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-slate-300">
                  <ShoppingBag size={28} className="mb-2 opacity-40" />
                  <p className="text-xs text-slate-400">Belum ada pesanan</p>
                </div>
              ) : (
                recentOrders.map((order: any, i) => {
                  const isDone = DONE_SET.has(order.status);
                  const d = compute(order, unitPrice);
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {(order.namaPelanggan || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{order.namaPelanggan || "Umum"}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{order.namaBarang || "-"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
                          {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
                          <span>{formatCurrency(d.totalPembayaran, d.currency)}</span>
                        </p>
                        <Badge variant={isDone ? "success" : "warning"} dot>
                          {isDone ? "Selesai" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

        </motion.div>
      </div>
    </div>
  );
}

function NotificationCard({ user, registerFCM }: { user: any; registerFCM: () => void }) {
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.requestPermission();
      setPermission(res);
      if (res === "granted") {
        notificationService.showLocalNotification("Notifikasi Aktif!", { body: "Sistem siap mengirimkan notifikasi." });
        registerFCM();
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const isSupported = "Notification" in window;

  return (
    <Card hover className="flex flex-col">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${permission === "granted" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
        {permission === "granted" ? <Bell size={22} /> : <BellOff size={22} />}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">Notifikasi Push</h3>
      <p className="text-sm text-slate-500 mb-4">
        {!isSupported ? "Browser tidak mendukung notifikasi."
          : permission === "granted" ? "Notifikasi sudah aktif."
          : permission === "denied" ? "Akses diblokir. Aktifkan manual di browser."
          : "Aktifkan agar tidak ketinggalan pesanan baru."}
      </p>
      {permission === "default" && isSupported && (
        <button
          onClick={handleRequest}
          disabled={isLoading}
          className="mt-auto py-2.5 px-4 bg-brand-navy text-white rounded-input text-sm font-bold hover:bg-brand-navyLight transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {isLoading ? "Memproses..." : "Aktifkan Notifikasi"}
        </button>
      )}
      {permission === "granted" && (
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => notificationService.showLocalNotification("Tes", { body: "Notifikasi berhasil!" })}
            className="py-2 px-4 bg-slate-100 text-slate-700 rounded-input text-sm font-bold hover:bg-slate-200 transition-colors min-h-[44px]"
          >
            Kirim Notifikasi Tes
          </button>
          <button onClick={registerFCM} className="py-1 text-xs text-brand-navy font-medium hover:underline">
            Refresh Token FCM
          </button>
        </div>
      )}
      {permission === "denied" && isSupported && (
        <div className="mt-auto p-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-medium text-center">
          Reset permission di browser lalu refresh halaman.
        </div>
      )}
    </Card>
  );
}

export function Dashboard({
  activeOrders, monthlySummaries, customers, onSeeAllOrders, setActiveFeature, onRecalculateStats,
}: {
  activeOrders: Order[]; monthlySummaries: any[]; customers: Customer[];
  onSeeAllOrders: () => void;
  setActiveFeature: (v: string) => void;
  onRecalculateStats: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const { unitPrice, globalJastipYen } = useSettings();

  return (
    <div className="min-h-screen bg-surface-base font-sans text-slate-800">
      <DashboardView
        activeOrders={activeOrders}
        monthlySummaries={monthlySummaries}
        customers={customers}
        unitPrice={unitPrice}
        globalJastipYen={globalJastipYen}
        onSeeAllOrders={onSeeAllOrders}
        onRecalculate={onRecalculateStats}
      />
    </div>
  );
}
