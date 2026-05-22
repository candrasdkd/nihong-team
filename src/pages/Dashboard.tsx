import React, { useMemo, useState, useEffect } from "react";
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
  TrendingUp,
  TrendingDown,
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
  Crown,
  ChevronRight,
} from "lucide-react";
import { notificationService } from "../services/notificationService";
import { KursInfoCard } from "../components/KursInfoCard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  colorClass: string;
  trend?: number;
  index: number;
}

function KpiCard({ label, value, sub, icon: Icon, colorClass, trend, index }: KpiCardProps) {
  const pos = trend === undefined || trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-white border border-slate-100/80 shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all duration-300 group"
    >
      {/* Subtle hover accent block */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-50 group-hover:bg-slate-200 transition-colors duration-300" />
      
      <div className="flex items-start justify-between relative">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${colorClass} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon size={16} className="sm:hidden text-inherit" />
          <Icon size={18} className="hidden sm:block text-inherit" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${pos ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" : "bg-rose-50 text-rose-600 border border-rose-100/50"}`}>
            {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 relative">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-slate-800 leading-tight break-words" title={String(value)}>{value}</p>
        {sub && <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1 break-words">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-white/10 shadow-2xl rounded-xl p-4 text-sm min-w-[180px]">
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

// ─── Status Pills ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string; icon: React.ElementType }> = {
  "Belum Membayar": { label: "Belum Bayar", color: "text-amber-700", bg: "bg-amber-50",   ring: "ring-amber-200", icon: Clock },
  "Selesai":        { label: "Selesai",     color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", icon: PackageCheck },
};

function StatusPills({ orders }: { orders: Order[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }, [orders]);

  const total = orders.length;

  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
        const count = counts[status] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const Icon = cfg.icon;
        return (
          <div
            key={status}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cfg.bg} ring-1 ${cfg.ring} flex-1 min-w-[160px]`}
          >
            <div className={`w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0`}>
              <Icon size={16} className={cfg.color} />
            </div>
            <div>
              <div className={`text-xl font-bold ${cfg.color}`}>{count}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide leading-none mt-0.5">
                {cfg.label} · {pct}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({
  orders, customers, unitPrice, globalJastipYen, onSeeAllOrders,
}: {
  orders: Order[];
  customers: Customer[];
  unitPrice: number;
  globalJastipYen: number;
  onSeeAllOrders: () => void;
}) {
  const [period, setPeriod] = useState<PeriodType>("12m");

  const { monthlyData, kpi, recentOrders, topCustomers } = useMemo(() => {
    const now = new Date();
    const from = new Date();
    if (period === "30d") from.setDate(now.getDate() - 30);
    if (period === "3m") from.setMonth(now.getMonth() - 3);
    if (period === "12m") from.setMonth(now.getMonth() - 12);

    const filtered = (orders as any[])
      .filter((o) => { const d = new Date(o.tanggal); return d >= from && d <= now; })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    type _MonthData = { key: string; label: string; count: number; revIdr: number; revJpy: number; profIdr: number; profJpy: number };
    const map = new Map<string, _MonthData>();
    for (const o of filtered) {
      const key = getMonthKey(o.tanggal);
      if (!key) continue;
      const computed = compute(o as any, unitPrice);
      const isJpy = computed.currency === "JPY";
      if (!map.has(key)) {
        const [y, m] = key.split("-");
        map.set(key, { key, label: `${MONTH_LABEL_ID[Number(m) - 1]} ${y.slice(2)}`, count: 0, revIdr: 0, revJpy: 0, profIdr: 0, profJpy: 0 });
      }
      const pt = map.get(key)!;
      if (isJpy) { pt.revJpy += computed.totalPembayaran; pt.profJpy += computed.totalKeuntungan; }
      else { pt.revIdr += computed.totalPembayaran; pt.profIdr += computed.totalKeuntungan; }
      pt.count += 1;
    }

    const monthly = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    const activeCount = filtered.filter((o) => !DONE_SET.has(String(o.status || ""))).length;

    let revIdr = 0, revJpy = 0, profIdr = 0, profJpy = 0, count = 0;
    monthly.forEach(m => {
      revIdr += m.revIdr; revJpy += m.revJpy;
      profIdr += m.profIdr; profJpy += m.profJpy;
      count += m.count;
    });

    const custMap: Record<string, { name: string; count: number; revIdr: number; revJpy: number; sortScore: number }> = {};
    filtered.forEach((o) => {
      const n = o.namaPelanggan || "?";
      if (!custMap[n]) custMap[n] = { name: n, count: 0, revIdr: 0, revJpy: 0, sortScore: 0 };
      const comp = compute(o as any, unitPrice);
      custMap[n].count += 1;
      if (comp.currency === "JPY") { custMap[n].revJpy += comp.totalPembayaran; custMap[n].sortScore += comp.totalPembayaran * 105; }
      else { custMap[n].revIdr += comp.totalPembayaran; custMap[n].sortScore += comp.totalPembayaran; }
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.sortScore - a.sortScore).slice(0, 5);

    return {
      monthlyData: monthly,
      recentOrders: filtered.slice(0, 8),
      kpi: { activeOrders: activeCount, revIdr, revJpy, profIdr, profJpy, totalOrders: count },
      topCustomers,
    };
  }, [orders, period, unitPrice]);

  const PERIOD_OPTIONS = [
    { label: "30H", value: "30d" },
    { label: "3B",  value: "3m" },
    { label: "1T",  value: "12m" },
  ];

  const KPI_CARDS: KpiCardProps[] = [
    {
      label: "Total Transaksi",
      value: kpi.revIdr > 0 || kpi.revJpy === 0 ? formatIDR(kpi.revIdr) : `¥${kpi.revJpy.toLocaleString("id-ID")}`,
      sub: kpi.revIdr > 0 && kpi.revJpy > 0 ? `+ ¥${kpi.revJpy.toLocaleString("id-ID")}` : undefined,
      icon: Wallet,
      colorClass: "text-blue-600 bg-blue-50/70 border border-blue-100/50",
      index: 0,
    },
    {
      label: "Total Profit",
      value: kpi.profIdr > 0 || kpi.profJpy === 0 ? formatIDR(kpi.profIdr) : `¥${kpi.profJpy.toLocaleString("id-ID")}`,
      sub: kpi.profIdr > 0 && kpi.profJpy > 0 ? `+ ¥${kpi.profJpy.toLocaleString("id-ID")}` : undefined,
      icon: CircleDollarSign,
      colorClass: "text-emerald-600 bg-emerald-50/70 border border-emerald-100/50",
      index: 1,
    },
    {
      label: "Pesanan Aktif",
      value: kpi.activeOrders,
      sub: "Perlu tindakan",
      icon: Activity,
      colorClass: "text-amber-600 bg-amber-50/70 border border-amber-100/50",
      index: 2,
    },
    {
      label: "Total Pelanggan",
      value: customers.length,
      sub: `${kpi.totalOrders} total transaksi`,
      icon: Users,
      colorClass: "text-purple-600 bg-purple-50/70 border border-purple-100/50",
      index: 3,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-8 shadow-xl"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{formatDate()}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()} 👋
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              Ringkasan performa{" "}
              <span className="text-blue-400 font-medium">
                {period === "30d" ? "30 hari terakhir" : period === "3m" ? "3 bulan terakhir" : "tahun ini"}
              </span>
            </p>
          </div>

          {/* Period selector */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as PeriodType)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  period === p.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Status Pills ── */}
      <StatusPills orders={orders} />

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Chart – kiri (2/3) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 xl:sticky xl:top-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Analisis Keuangan</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pendapatan & Profit per bulan</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-1 rounded-full bg-blue-500" />
                Pendapatan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-1 rounded-full bg-emerald-500" />
                Profit
              </span>
            </div>
          </div>

          <div className="h-[320px] xl:h-[420px]">
            {monthlyData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Activity size={40} className="mb-3 opacity-30" />
                <p className="text-sm text-slate-400">Belum ada data untuk periode ini</p>
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
                    name="Pendapatan (IDR)"
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
        </motion.div>

        {/* Kolom kanan (1/3) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4"
        >
          {/* Kurs & Kalkulator */}
          <KursInfoCard globalJastipYen={globalJastipYen} />

          {/* Pesanan Terbaru */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShoppingBag size={13} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Pesanan Terbaru</h3>
              </div>
              <button
                onClick={onSeeAllOrders}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Lihat Semua <ChevronRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-50">
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
                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors">
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
                        <span className={`text-[9px] font-bold ${isDone ? "text-emerald-500" : "text-amber-500"}`}>
                          {isDone ? "✓ Selesai" : "· Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Pelanggan */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-50">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Crown size={13} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Top Pelanggan</h3>
            </div>

            <div className="px-5 py-4 space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada data</p>
              ) : (
                topCustomers.map((c, i) => {
                  const pct = topCustomers[0] ? (c.sortScore / topCustomers[0].sortScore) * 100 : 0;
                  const MEDAL = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-base w-5 text-center shrink-0">{MEDAL[i] ?? `${i + 1}`}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                        </div>
                        <div className="text-[11px] font-bold text-slate-600 shrink-0 text-right">
                          {c.revIdr > 0 && <span>{formatIDR(c.revIdr)}</span>}
                          {c.revJpy > 0 && <span>{c.revIdr > 0 ? " + " : ""}¥{c.revJpy.toLocaleString("id-ID")}</span>}
                          <span className="text-slate-400 font-normal ml-1">({c.count}x)</span>
                        </div>
                      </div>
                      <div className="pl-8">
                        <div className="w-full bg-slate-100 rounded-full h-1">
                          <motion.div
                            className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────

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
    <div className="flex flex-col text-left p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${permission === "granted" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
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
          className="mt-auto py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Memproses..." : "Aktifkan Notifikasi"}
        </button>
      )}
      {permission === "granted" && (
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => notificationService.showLocalNotification("Tes", { body: "Notifikasi berhasil! 🚀" })}
            className="py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Kirim Notifikasi Tes
          </button>
          <button onClick={registerFCM} className="py-1 text-xs text-blue-600 font-medium hover:underline">
            Refresh Token FCM
          </button>
        </div>
      )}
      {permission === "denied" && isSupported && (
        <div className="mt-auto p-2 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-medium text-center">
          Reset permission di browser lalu refresh halaman.
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function Dashboard({
  user, orders, customers, unitPrice, globalJastipYen, onSeeAllOrders, setActiveFeature,
}: {
  user: any; orders: Order[]; customers: Customer[]; unitPrice: number; globalJastipYen: number;
  onSeeAllOrders: () => void;
  setActiveFeature: (v: string) => void;
}) {
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted" && user?.uid) registerFCM();
  }, [user?.uid]);

  const registerFCM = async () => {
    const VAPID_KEY = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
    if (VAPID_KEY && user?.uid) {
      try {
        const { fcmService } = await import("../services/fcmService");
        await fcmService.registerToken(user.uid, VAPID_KEY);
      } catch (err) { console.error("[Dashboard] FCM error:", err); }
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-24 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DashboardView
          orders={orders}
          customers={customers}
          unitPrice={unitPrice}
          globalJastipYen={globalJastipYen}
          onSeeAllOrders={onSeeAllOrders}
        />
      </div>
    </div>
  );
}
