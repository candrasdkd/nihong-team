import { motion } from "framer-motion";
import {
  UserRound, Calendar, ShoppingBag, Users, Plane,
  ArrowRight,
} from "lucide-react";
import { TabId } from "../types";

interface MenuPageProps {
  onTabChange: (tab: TabId) => void;
}

const MENU_ITEMS = [
  {
    id: "customers" as TabId,
    label: "Pelanggan",
    description: "Kelola data dan info kontak pelanggan",
    icon: Users,
    gradient: "from-indigo-500 to-blue-600",
    glow: "shadow-indigo-500/20",
    bg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    accent: "border-indigo-200",
  },
  {
    id: "jastipers" as TabId,
    label: "Jastiper",
    description: "Daftar jastiper beserta kontak & alamat",
    icon: UserRound,
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    accent: "border-violet-200",
  },
  {
    id: "schedules" as TabId,
    label: "Jadwal Keberangkatan",
    description: "Buat & pantau jadwal perjalanan jastiper",
    icon: Calendar,
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/20",
    bg: "bg-sky-50",
    iconColor: "text-sky-600",
    accent: "border-sky-200",
  },
  {
    id: "preorders" as TabId,
    label: "Pre Order",
    description: "Catat titipan konsumen & konversi ke pesanan",
    icon: ShoppingBag,
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
    bg: "bg-rose-50",
    iconColor: "text-rose-600",
    accent: "border-rose-200",
  },
];

export function MenuPage({ onTabChange }: MenuPageProps) {
  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-8 shadow-xl border border-white/5"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold text-white/70 mb-3">
              <Plane size={12} />
              <span>Nihong Jastip Admin</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
              Menu Fitur 🗂️
            </h2>
            <p className="text-slate-400 text-sm">
              Akses cepat ke semua fitur manajemen jastip Anda.
            </p>
          </div>
        </motion.div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MENU_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.07 }}
                onClick={() => onTabChange(item.id)}
                className={`group relative bg-white rounded-2xl border ${item.accent} shadow-sm hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 p-5 text-left overflow-hidden`}
              >
                {/* Background glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl ${item.bg} border ${item.accent} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    <Icon size={26} className={item.iconColor} strokeWidth={2} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight mb-1 group-hover:text-slate-900 transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className={`w-8 h-8 rounded-xl ${item.bg} border ${item.accent} flex items-center justify-center shrink-0 mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`}>
                    <ArrowRight size={14} className={item.iconColor} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-xs text-slate-400 font-semibold">
            Nihong Jastip Admin Panel • Semua data tersinkronisasi secara real-time
          </p>
        </motion.div>
      </div>
    </div>
  );
}
