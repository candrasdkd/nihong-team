import React, { useMemo, useState, useEffect } from "react";
import { Customer, Order, PeriodType } from "../types";
import { Card } from "../components/ui/Card";
import { formatCurrency, formatIDR } from "../utils/format";
import {
  getMonthKey,
  MONTH_LABEL_ID,
  compute,
} from "../utils/helpers";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import { DONE_SET, INK, JAPAN_RED } from "../utils/constants";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Wallet,
  Activity,
  ArrowRight,
  Settings,
  Bell,
  BellOff,
  PackageCheck,
  CircleDollarSign,
  Clock,
  XCircle,
  Crown,
  CalendarDays,
  Plane,
  ShoppingCart,
} from "lucide-react";
import { notificationService } from "../services/notificationService";
import { subscribeSchedules } from "../services/scheduleFirebase";
import { JadwalKeberangkatan } from "../types";
import { KursInfoCard } from "../components/KursInfoCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; trend?: number;
}) {
  return (
    <Card className={`p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group/card`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
      <div className="flex justify-between items-start mb-3 pl-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {trend !== undefined && <GrowthBadge value={trend} />}
      </div>
      <div className="pl-2 flex items-end justify-between">
        <div className="min-w-0 pr-2">
          <h3 
            className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight truncate active:scale-[0.98] transition-transform cursor-help"
            title={String(value)}
          >
            {value}
          </h3>
          {sub && (
            <p 
              className="text-xs text-slate-400 mt-1 truncate active:scale-[0.98] transition-transform cursor-help"
              title={sub}
            >
              {sub}
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-2.5 rounded-xl bg-slate-50 text-slate-400 shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  "Belum Membayar": { label: "Belum Bayar", color: "text-red-600", bg: "bg-red-50", icon: Clock },
  "Selesai":        { label: "Selesai",     color: "text-emerald-600", bg: "bg-emerald-50", icon: PackageCheck },
};

function StatusBar({ orders }: { orders: Order[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }, [orders]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
        const count = counts[status] || 0;
        const Icon = cfg.icon;
        return (
          <div key={status} className={`flex items-center gap-3 p-4 rounded-xl ${cfg.bg} border border-white/60`}>
            <Icon size={18} className={cfg.color} />
            <div>
              <div className={`text-lg font-bold ${cfg.color}`}>{count}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{cfg.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl text-sm">
      <p className="font-semibold text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</p>
      {payload.map((entry: any, i: number) => {
        const isJpy = entry.name.includes("JPY");
        const valStr = isJpy ? `¥${entry.value.toLocaleString("id-ID")}` : formatIDR(entry.value);
        return (
          <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-semibold ml-auto">{valStr}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Jadwal Terdekat Card ────────────────────────────────────────────────────

function toInputDateDash(d: Date) {
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 10);
}

const JADWAL_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open:   { label: "Open",   color: "text-emerald-600", bg: "bg-emerald-50" },
  full:   { label: "Full",   color: "text-rose-600",    bg: "bg-rose-50"    },
  closed: { label: "Closed", color: "text-slate-600",   bg: "bg-slate-100"  },
};

function JadwalTerdekatCard({ onNavigate }: { onNavigate: () => void }) {
  const [schedules, setSchedules] = React.useState<JadwalKeberangkatan[]>([]);

  React.useEffect(() => {
    const today = toInputDateDash(new Date());
    const unsub = subscribeSchedules({ fromDate: today }, (rows) => {
      setSchedules(rows.slice(0, 5));
    });
    return () => unsub();
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane size={15} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Jadwal Terdekat</h3>
        </div>
        <button
          onClick={onNavigate}
          className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          Lihat Semua <ArrowRight size={12} />
        </button>
      </div>
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center text-center py-4 gap-2">
          <CalendarDays size={28} className="text-slate-200" />
          <p className="text-xs text-slate-400">Belum ada jadwal mendatang</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s) => {
            const cfg = JADWAL_STATUS_CFG[s.status] ?? JADWAL_STATUS_CFG.open;
            const isIndoToJp = s.rute === "Indo → Jepang";
            const date = new Date(s.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
            });
            return (
              <div key={s.id} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-lg shadow-sm">
                  {isIndoToJp ? "🇮🇩" : "🇯🇵"}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-bold text-slate-700 truncate">{s.rute}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">{date}{s.keterangan ? ` • ${s.keterangan}` : ""}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({
  orders, customers, unitPrice, globalJastipYen, onSeeAllOrders, onNavigateToSchedule,
}: {
  orders: Order[];
  customers: Customer[];
  unitPrice: number;
  globalJastipYen: number;
  onSeeAllOrders: () => void;
  onNavigateToSchedule: () => void;
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
      if (isJpy) {
        pt.revJpy += computed.totalPembayaran;
        pt.profJpy += computed.totalKeuntungan;
      } else {
        pt.revIdr += computed.totalPembayaran;
        pt.profIdr += computed.totalKeuntungan;
      }
      pt.count += 1;
    }

    const monthly = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    const activeCount = filtered.filter((o) => !DONE_SET.has(String(o.status || ""))).length;
    
    let revIdr = 0, revJpy = 0, profIdr = 0, profJpy = 0;
    let count = 0;
    monthly.forEach(m => {
      revIdr += m.revIdr; revJpy += m.revJpy;
      profIdr += m.profIdr; profJpy += m.profJpy;
      count += m.count;
    });

    // Top customers by order count (sum as IDR temporarily for sorting, or split? Let's just sum raw array for sorting)
    const custMap: Record<string, { name: string; count: number; revIdr: number; revJpy: number; sortScore: number }> = {};
    filtered.forEach((o) => {
      const n = o.namaPelanggan || "?";
      if (!custMap[n]) custMap[n] = { name: n, count: 0, revIdr: 0, revJpy: 0, sortScore: 0 };
      const comp = compute(o as any, unitPrice);
      custMap[n].count += 1;
      if (comp.currency === "JPY") {
        custMap[n].revJpy += comp.totalPembayaran;
        custMap[n].sortScore += comp.totalPembayaran * 105; // rough conversion for sorting
      } else {
        custMap[n].revIdr += comp.totalPembayaran;
        custMap[n].sortScore += comp.totalPembayaran;
      }
    });
    const topCustomers = Object.values(custMap)
      .sort((a, b) => b.sortScore - a.sortScore)
      .slice(0, 5);

    return {
      monthlyData: monthly,
      recentOrders: filtered.slice(0, 6),
      kpi: { activeOrders: activeCount, revIdr, revJpy, profIdr, profJpy, totalOrders: count },
      topCustomers,
    };
  }, [orders, period]);

  const PERIOD_OPTIONS = [
    { label: "30 Hari", value: "30d" },
    { label: "3 Bulan", value: "3m" },
    { label: "1 Tahun", value: "12m" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{formatDate()}</p>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{getGreeting()} 👋</h2>
          <p className="text-slate-500 mt-0.5 text-sm">
            Berikut ringkasan performa{" "}
            {period === "30d" ? "30 hari terakhir" : period === "3m" ? "3 bulan terakhir" : "tahun ini"}.
          </p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start sm:self-auto">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as PeriodType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pendapatan" value={kpi.revIdr > 0 || kpi.revJpy === 0 ? formatIDR(kpi.revIdr) : `¥${kpi.revJpy.toLocaleString("id-ID")}`} sub={kpi.revIdr > 0 && kpi.revJpy > 0 ? `+ ¥${kpi.revJpy.toLocaleString("id-ID")}` : undefined} icon={Wallet} accent="bg-blue-500" />
        <StatCard label="Total Profit" value={kpi.profIdr > 0 || kpi.profJpy === 0 ? formatIDR(kpi.profIdr) : `¥${kpi.profJpy.toLocaleString("id-ID")}`} sub={kpi.profIdr > 0 && kpi.profJpy > 0 ? `+ ¥${kpi.profJpy.toLocaleString("id-ID")}` : undefined} icon={CircleDollarSign} accent="bg-emerald-500" />
        <StatCard label="Pesanan Aktif" value={kpi.activeOrders} sub="Perlu tindakan" icon={Activity} accent="bg-amber-400" />
        <StatCard label="Total Pelanggan" value={customers.length} sub={`${kpi.totalOrders} total transaksi`} icon={Users} accent="bg-purple-500" />
      </div>

      {/* ── Status Breakdown ── */}
      <StatusBar orders={orders} />

      {/* ── Chart + Recent Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Chart */}
        <Card className="xl:col-span-2 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[400px] xl:h-[600px] xl:sticky xl:top-24">
          <div className="flex justify-between items-start mb-4 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-800">Analisis Keuangan</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pendapatan & Profit per bulan</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={INK} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={INK} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatIDR(v)} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revIdr" name="Pendapatan (IDR)" stroke={INK} strokeWidth={2} fill="url(#gradRevenue)" />
                <Area type="monotone" dataKey="profIdr" name="Profit (IDR)" stroke="#10b981" strokeWidth={2} fill="url(#gradProfit)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right column: Recent + Top Customers + Kurs/Jadwal */}
        <div className="flex flex-col gap-4">
          
          {/* Info Kurs & Jastip Calculator */}
          <KursInfoCard globalJastipYen={globalJastipYen} />

          {/* Recent Orders */}
          <Card className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Pesanan Terbaru</h3>
              <button onClick={onSeeAllOrders} className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors">
                Lihat Semua <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada pesanan</p>
              ) : recentOrders.map((order: any, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <ShoppingBag size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{order.namaPelanggan || "Umum"}</p>
                    <p className="text-[10px] text-slate-400 truncate">{order.namaBarang || "-"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-700">
                      {formatCurrency(
                        compute(order, unitPrice).totalPembayaran,
                        compute(order, unitPrice).currency
                      )}
                    </p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold inline-block text-center w-full mt-1 ${DONE_SET.has(order.status) ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Customers */}
          <Card className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Crown size={14} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Top Pelanggan</h3>
            </div>
            <div className="space-y-4">
              {topCustomers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Belum ada data</p>
              ) : topCustomers.map((c, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-50 border border-slate-100 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                    </div>
                    <div className="text-xs font-bold text-slate-700 shrink-0 text-right">
                      {c.revIdr > 0 && <span>{formatIDR(c.revIdr)}</span>}
                      {c.revJpy > 0 && <span>{c.revIdr > 0 ? ' + ' : ''}¥{c.revJpy.toLocaleString("id-ID")}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 w-4 text-right">{c.count}x</span>
                  </div>
                  <div className="pl-8 flex items-center">
                    <div className="w-full bg-slate-50 rounded-full h-1.5">
                      <div
                        className="bg-slate-700 h-1.5 rounded-full transition-all"
                        style={{ width: `${topCustomers[0] ? (c.sortScore / topCustomers[0].sortScore) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Jadwal Terdekat */}
          <JadwalTerdekatCard onNavigate={onNavigateToSchedule} />
        </div>
      </div>
    </div>
  );
}
// ─── Application View ─────────────────────────────────────────────────────────

export function ApplicationView({
  user, registerFCM, setActiveFeature,
}: {
  user: any; registerFCM: () => void; setActiveFeature: (v: string) => void;
}) {
  const FEATURES = [
    { id: "purchase",  title: "Pembelian",           desc: "Kelola pembelian barang jastip.",       icon: ShoppingCart,  color: "text-violet-600", bg: "bg-violet-50" },
    { id: "schedule",  title: "Jadwal Keberangkatan", desc: "Kelola jadwal jastip Indo ⇄ Jepang.",  icon: CalendarDays,  color: "text-indigo-600", bg: "bg-indigo-50" },
    { id: "generator", title: "Generator Story",      desc: "Buat story IG otomatis.",               icon: Settings,      color: "text-slate-600",  bg: "bg-slate-100"  },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Menu Aplikasi</h2>
        <p className="text-slate-500 text-sm">Pilih fitur yang ingin Anda gunakan.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <button key={f.id} onClick={() => setActiveFeature(f.id)}
            className="flex flex-col text-left p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${f.bg} ${f.color} group-hover:scale-110 transition-transform`}>
              <f.icon size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{f.title}</h3>
            <p className="text-sm text-slate-500">{f.desc}</p>
          </button>
        ))}
        <NotificationCard user={user} registerFCM={registerFCM} />
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
    <div className="flex flex-col text-left p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${permission === "granted" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
        {permission === "granted" ? <Bell size={28} /> : <BellOff size={28} />}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">Notifikasi Push</h3>
      <p className="text-sm text-slate-500 mb-4">
        {!isSupported ? "Browser tidak mendukung notifikasi."
          : permission === "granted" ? "Notifikasi sudah aktif."
          : permission === "denied" ? "Akses diblokir. Aktifkan manual di browser."
          : "Aktifkan agar tidak ketinggalan pesanan baru."}
      </p>
      {permission === "default" && isSupported && (
        <button onClick={handleRequest} disabled={isLoading}
          className="mt-auto py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
          {isLoading ? "Memproses..." : "Aktifkan Notifikasi"}
        </button>
      )}
      {permission === "granted" && (
        <div className="mt-auto flex flex-col gap-2">
          <button onClick={() => notificationService.showLocalNotification("Tes", { body: "Notifikasi berhasil! 🚀" })}
            className="py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
            Kirim Notifikasi Tes
          </button>
          <button onClick={registerFCM} className="py-1 px-4 text-xs text-indigo-600 font-medium hover:underline">
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

export function Dashboard({ user, orders, customers, unitPrice, globalJastipYen, onSeeAllOrders, setActiveFeature }: {
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
      try { const { fcmService } = await import("../services/fcmService"); await fcmService.registerToken(user.uid, VAPID_KEY); }
      catch (err) { console.error("[Dashboard] FCM error:", err); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DashboardView
          orders={orders}
          customers={customers}
          unitPrice={unitPrice}
          globalJastipYen={globalJastipYen}
          onSeeAllOrders={onSeeAllOrders}
          onNavigateToSchedule={() => setActiveFeature("apps")}
        />
      </div>
    </div>
  );
}
