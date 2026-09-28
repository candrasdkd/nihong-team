import { useMemo, useState } from "react";
import { useAuth } from "../context/authContext";
import { useSettings } from "../context/settingsContext";
import { motion } from "framer-motion";
import { OrderStatus, PeriodType } from "../types";
import { formatCurrency, formatIDR } from "../utils/format";
import { compute } from "../utils/helpers";
import { dashboardMoney, dashboardRangeLabel, summarizeDashboard } from "../utils/dashboard";
import { useDashboardData } from "../hooks/useDashboardData";
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
  "DP Terbayar": { label: "DP Terbayar", variant: "warning" },
  "Selesai": { label: "Selesai", variant: "success" },
};

function StatusPills({ counts, totalCount }: { counts: Record<OrderStatus, number>; totalCount: number }) {
  const completedCount = counts["Selesai"];
  const total = totalCount;

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-[180px]">
          <p className="eyebrow text-slate-400">Alur pesanan</p>
          <h3 className="mt-1 text-sm font-extrabold text-brand-navyDark">Status pesanan · Periode terpilih</h3>
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

        <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 lg:min-w-[420px]">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = counts[status as OrderStatus] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const warning = cfg.variant === "warning";
            return (
              <div
                key={status}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${warning ? "border-amber-100 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/70"
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
  unitPrice, globalJastipYen, userName, onSeeAllOrders, onRecalculate, onOpenFeature,
}: {
  unitPrice: number;
  globalJastipYen: number;
  userName: string;
  onSeeAllOrders: () => void;
  onRecalculate: () => Promise<void> | void;
  onOpenFeature: (feature: string) => void;
}) {
  const [period, setPeriod] = useState<PeriodType>("12m");
  const [chartCurrency, setChartCurrency] = useState<"IDR" | "JPY">("IDR");
  const [syncing, setSyncing] = useState(false);
  const data = useDashboardData(period);
  const { monthlyData, kpi, statusCounts } = useMemo(
    () => summarizeDashboard(data.orders.rows, data.range),
    [data.orders.rows, data.range],
  );
  const reportReady = !data.orders.loading && !data.orders.error;
  const reportPlaceholder = data.orders.loading ? "Memuat..." : "Data belum tersedia";

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onRecalculate();
      data.retry();
      alert("Statistik dashboard berhasil disinkronisasi ulang!");
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan sinkronisasi data.");
    } finally {
      setSyncing(false);
    }
  };

  const PERIOD_OPTIONS = [
    { label: "30 hari", value: "30d" },
    { label: "3 bulan", value: "3m" },
    { label: "1 tahun", value: "12m" },
  ];

  const KPI_CARDS = [
    {
      label: "Total Transaksi",
      ...(reportReady ? dashboardMoney(kpi.revIdr, kpi.revJpy, kpi.hasIdr, kpi.hasJpy) : { value: "—", sub: reportPlaceholder }),
      icon: Wallet,
      tone: "navy" as const,
    },
    {
      label: "Total Profit",
      ...(reportReady ? dashboardMoney(kpi.profIdr, kpi.profJpy, kpi.hasIdr, kpi.hasJpy) : { value: "—", sub: reportPlaceholder }),
      icon: CircleDollarSign,
      tone: "emerald" as const,
    },
    {
      label: "Pesanan Aktif",
      value: reportReady ? kpi.activeOrders : "—",
      sub: reportReady ? "Periode terpilih" : reportPlaceholder,
      icon: Activity,
      tone: "orange" as const,
    },
    {
      label: "Total Pelanggan",
      value: data.customers.loading || data.customers.error ? "—" : data.customers.rows.length,
      sub: data.customers.loading ? "Memuat pelanggan..." : data.customers.error ? "Data pelanggan belum tersedia" : reportReady ? `${kpi.totalOrders} total transaksi · periode terpilih` : reportPlaceholder,
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
                    className={`min-h-[44px] rounded-[10px] px-3.5 text-xs font-extrabold transition-all ${period === p.value
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

      <p className="text-xs font-medium text-slate-500">Ringkasan dan status: {dashboardRangeLabel(data.range)}. Jumlah pelanggan mencakup semua pelanggan.</p>

      {/* Loading/error states never render a failed read as an empty database. */}
      {(data.orders.error || data.customers.error || data.recent.error) && (
        <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {[data.orders.error, data.customers.error, data.recent.error].filter(Boolean).map(message => <p key={message}>{message}</p>)}
          <button onClick={data.retry} className="mt-2 min-h-[44px] rounded-input bg-white px-4 font-bold text-brand-navy">Coba lagi</button>
        </div>
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
      {reportReady ? <StatusPills counts={statusCounts} totalCount={kpi.totalOrders} /> : (
        <Card><p role="status" className="text-sm text-slate-500">{data.orders.loading ? "Memuat status pesanan..." : "Status pesanan belum tersedia."}</p></Card>
      )}

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
                <p className="mt-0.5 text-xs text-slate-500">Transaksi dan profit per bulan · {chartCurrency}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div role="group" aria-label="Mata uang grafik" className="flex rounded-input border border-surface-border p-1">
                  {(["IDR", "JPY"] as const).map(currency => (
                    <button key={currency} aria-pressed={chartCurrency === currency} onClick={() => setChartCurrency(currency)}
                      className={`min-h-[44px] rounded-lg px-3 text-xs font-bold ${chartCurrency === currency ? "bg-brand-navy text-white" : "text-brand-navy"}`}>
                      {currency}
                    </button>
                  ))}
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
            </div>

            <div className="h-[300px] sm:h-[340px] xl:h-[410px]">
              {!reportReady ? (
                <div role="status" className="flex h-full items-center justify-center text-sm text-slate-500">{data.orders.loading ? "Memuat analisis keuangan..." : "Analisis keuangan belum tersedia."}</div>
              ) : !(chartCurrency === "IDR" ? kpi.hasIdr : kpi.hasJpy) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-4 text-slate-400">
                    <Activity size={26} className="opacity-50 text-brand-navy" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm tracking-tight">Belum Ada Transaksi {chartCurrency}</h4>
                  <p className="text-xs text-slate-400 max-w-[320px] mt-1.5 leading-relaxed text-center font-medium">
                    Tidak ada pesanan {chartCurrency} pada periode terpilih. Pilih mata uang atau periode lain.
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
                      tickFormatter={(v) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(v)}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey={chartCurrency === "IDR" ? "revIdr" : "revJpy"}
                      name={`Transaksi (${chartCurrency})`}
                      stroke="#154574"
                      strokeWidth={2.5}
                      fill="url(#gradRevenue)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#154574", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartCurrency === "IDR" ? "profIdr" : "profJpy"}
                      name={`Profit (${chartCurrency})`}
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

            <p className="px-5 pt-3 text-xs text-slate-500">8 pesanan terbaru · Semua periode</p>
            <div className="divide-y divide-surface-border">
              {data.recent.loading || data.recent.error ? (
                <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">{data.recent.loading ? "Memuat pesanan terbaru..." : "Daftar pesanan belum tersedia."}</p>
              ) : data.recent.rows.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-slate-300">
                  <ShoppingBag size={28} className="mb-2 opacity-40" />
                  <p className="text-xs text-slate-400">Belum ada pesanan</p>
                </div>
              ) : (
                data.recent.rows.map((order) => {
                  const isDone = DONE_SET.has(order.status);
                  const d = compute(order, unitPrice);
                  return (
                    <div key={order.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-mist/40">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-xs font-extrabold ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-brand-cream text-brand-orange"}`}>
                        {(order.namaPelanggan || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{order.namaPelanggan || "Umum"}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{order.namaBarang || "-"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
                          {d.currency === "JPY" ? <FlagJP /> : <FlagID />}
                          <span>{formatCurrency(d.totalPembayaran, d.currency)}</span>
                        </div>
                        <Badge variant={isDone ? "success" : "warning"} dot>
                          {STATUS_CONFIG[order.status]?.label || order.status || "Belum Bayar"}
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
  onSeeAllOrders, setActiveFeature, onRecalculateStats,
}: {
  onSeeAllOrders: () => void;
  setActiveFeature: (v: string) => void;
  onRecalculateStats: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const { unitPrice, globalJastipYen } = useSettings();

  return (
    <div className="min-h-screen bg-surface-base font-sans text-slate-800">
      <DashboardView
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
