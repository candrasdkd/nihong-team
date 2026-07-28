import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { useSettings } from "../context/settingsContext";
import { motion } from "framer-motion";
import { Customer, Order, PeriodType } from "../types";
import { formatCurrency, formatIDR } from "../utils/format";
import { MONTH_LABEL_ID, compute } from "../utils/helpers";
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
    <div className="min-w-[180px] rounded-[18px] border border-white/10 bg-brand-navyDark p-4 text-sm shadow-2xl">
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

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-[180px]">
          <p className="eyebrow text-slate-400">Alur pesanan</p>
          <h3 className="mt-1 text-sm font-extrabold text-brand-navyDark">Status operasional</h3>
        </div>

        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Progress penyelesaian</span>
            <span>{completedPct}% selesai</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completedPct}%` }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:min-w-[300px]">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = counts[status] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const warning = cfg.variant === "warning";
            return (
              <div
                key={status}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  warning ? "border-amber-100 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/70"
                }`}
              >
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white ${warning ? "text-amber-600" : "text-emerald-600"}`}>
                  {warning ? <Clock size={16} /> : <PackageCheck size={16} />}
                </div>
                <div>
                  <div className={`text-lg font-black leading-none ${warning ? "text-amber-700" : "text-emerald-700"}`}>{count}</div>
                  <div className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                    {cfg.label} · {pct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function DashboardView({
  activeOrders,
  monthlySummaries,
  customers,
  unitPrice,
  globalJastipYen,
  userName,
  onSeeAllOrders,
  onRecalculate,
  onOpenFeature,
}: {
  activeOrders: Order[];
  monthlySummaries: any[];
  customers: Customer[];
  unitPrice: number;
  globalJastipYen: number;
  userName: string;
  onSeeAllOrders: () => void;
  onRecalculate: () => Promise<void> | void;
  onOpenFeature: (feature: string) => void;
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
      tone: "navy" as const,
    },
    {
      label: "Total Profit",
      value: kpi.profIdr > 0 || kpi.profJpy === 0 ? formatIDR(kpi.profIdr) : `¥${kpi.profJpy.toLocaleString("id-ID")}`,
      sub: kpi.profIdr > 0 && kpi.profJpy > 0 ? `+ ¥${kpi.profJpy.toLocaleString("id-ID")}` : undefined,
      icon: CircleDollarSign,
      tone: "emerald" as const,
    },
    {
      label: "Pesanan Aktif",
      value: kpi.activeOrders,
      sub: "Perlu tindakan",
      icon: Activity,
      tone: "orange" as const,
    },
    {
      label: "Total Pelanggan",
      value: customers.length,
      sub: `${kpi.totalOrders} total transaksi`,
      icon: Users,
      tone: "violet" as const,
    },
  ];

  return (
    <div className="page-container space-y-5 sm:space-y-6">

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-card border border-white/10 bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-navyLight px-5 py-6 shadow-[0_22px_60px_rgba(7,27,51,0.2)] sm:px-8 sm:py-8"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden app-grid">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-10 bottom-[-90px] h-56 w-56 rounded-full border-[28px] border-white/[0.045]" />
          <div className="absolute right-8 top-8 h-3 w-3 rounded-full bg-brand-orange" />
        </div>

        <div className="relative">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-orangeLight backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orangeLight" />
                {formatDate()}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                {getGreeting()}, <span className="text-brand-orangeLight">{userName}</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                Pantau transaksi, profit, dan pekerjaan yang perlu ditindaklanjuti dalam satu tampilan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <div className="flex items-center rounded-input border border-white/10 bg-white/10 p-1 backdrop-blur-sm">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value as PeriodType)}
                    aria-pressed={period === p.value}
                    className={`min-h-9 rounded-[10px] px-3.5 text-xs font-extrabold transition-all ${
                      period === p.value
                        ? "bg-white text-brand-navyDark shadow-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSync}
                disabled={syncing}
                aria-label="Sinkronisasi ringkasan laporan"
                className="flex min-h-[44px] items-center gap-2 rounded-input border border-white/10 bg-white/10 px-3.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/15 hover:text-white disabled:opacity-50"
                title="Sinkronisasi ringkasan laporan"
              >
                <RotateCw size={14} className={syncing ? "animate-spin text-brand-orangeLight" : ""} />
                <span>Sinkronkan</span>
              </button>
            </div>
          </div>

          <div className="mt-7 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Akses cepat</span>
              {[
                { label: "Pesanan", icon: ShoppingBag, feature: "orders" },
                { label: "Booking", icon: PackageCheck, feature: "preorders" },
                { label: "Kas", icon: Wallet, feature: "cash" },
              ].map((action) => (
                <button
                  key={action.feature}
                  onClick={() => onOpenFeature(action.feature)}
                  className="group flex min-h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <action.icon size={13} className="text-brand-orangeLight" />
                  {action.label}
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
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
      <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 xl:gap-4">
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
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-brand-orange">Laporan</p>
                <h3 className="mt-1 text-base font-extrabold text-brand-navyDark">Analisis Keuangan</h3>
                <p className="mt-0.5 text-xs text-slate-500">Transaksi dan profit per bulan</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-3 rounded-full bg-brand-navyLight" />
                  Transaksi
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />
                  Profit
                </span>
              </div>
            </div>

            <div className="h-[300px] sm:h-[340px] xl:h-[410px]">
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
                        <stop offset="0%" stopColor="#154574" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#154574" stopOpacity={0} />
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
                      stroke="#154574"
                      strokeWidth={2.5}
                      fill="url(#gradRevenue)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#154574", stroke: "#fff", strokeWidth: 2 }}
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
            <div className="flex items-center justify-between border-b border-surface-border/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-brand-mist">
                  <ShoppingBag size={13} className="text-brand-navy" />
                </div>
                <h3 className="text-sm font-extrabold text-brand-navyDark">Pesanan Terbaru</h3>
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
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-mist/40">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-xs font-extrabold ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-brand-cream text-brand-orange"}`}>
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
        userName={user?.displayName || user?.email?.split("@")[0] || "Admin"}
        onSeeAllOrders={onSeeAllOrders}
        onRecalculate={onRecalculateStats}
        onOpenFeature={setActiveFeature}
      />
    </div>
  );
}
