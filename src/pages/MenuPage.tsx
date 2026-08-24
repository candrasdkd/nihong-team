import { motion } from "framer-motion";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";
import {
  UserRound, Calendar, ShoppingBag, Users, Plane,
  ArrowRight, Inbox,
} from "lucide-react";
import { TabId } from "../types";

interface MenuPageProps {
  onTabChange: (tab: TabId) => void;
}

const MENU_ITEMS = [
  {
    id: "inbox" as TabId,
    label: "Inbox NihongStore",
    description: "Pesanan masuk dari NihongStore untuk di-assign ke jadwal",
    icon: Inbox,
    gradient: "from-brand-orange to-rose-600",
    bg: "bg-brand-cream",
    iconColor: "text-brand-orange",
    accent: "ring-brand-orange/20",
  },
  {
    id: "preorders" as TabId,
    label: "Booking Jadwal",
    description: "Catat booking konsumen & konversi ke pesanan",
    icon: ShoppingBag,
    gradient: "from-rose-500 to-red-600",
    bg: "bg-rose-50",
    iconColor: "text-rose-600",
    accent: "ring-rose-200/70",
  },
  {
    id: "schedules" as TabId,
    label: "Jadwal Keberangkatan",
    description: "Buat & pantau jadwal perjalanan jastiper",
    icon: Calendar,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    iconColor: "text-amber-700",
    accent: "ring-amber-200/70",
  },
  {
    id: "customers" as TabId,
    label: "Pelanggan",
    description: "Kelola data dan info kontak pelanggan",
    icon: Users,
    gradient: "from-brand-navy to-brand-navyLight",
    bg: "bg-brand-mist",
    iconColor: "text-brand-navy",
    accent: "ring-brand-navy/10",
  },
  {
    id: "jastipers" as TabId,
    label: "Jastiper",
    description: "Daftar jastiper beserta kontak & alamat",
    icon: UserRound,
    gradient: "from-violet-500 to-violet-700",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    accent: "ring-violet-200/70",
  },
];

export function MenuPage({ onTabChange }: MenuPageProps) {
  return (
    <div className="min-h-screen bg-transparent pb-28 font-sans">
      <div className="mx-auto max-w-[960px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">

        <HeroPageHeader
          variant="gradient"
          badgeIcon={Plane}
          badgeLabel="Nihong Jastip Admin"
          title="Pusat Operasional"
          description="Akses seluruh data pendukung bisnis jastip Anda dari satu tempat."
        />

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
                className={`group relative overflow-hidden rounded-card border border-white bg-surface-card p-5 text-left shadow-card ring-1 ${item.accent} transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]`}
              >
                {/* Background glow on hover */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.gradient}`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.035]`} />

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] ${item.bg} ring-1 ${item.accent} transition-transform duration-300 group-hover:scale-105`}>
                    <Icon size={26} className={item.iconColor} strokeWidth={2} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="mb-1 text-sm font-extrabold tracking-tight text-brand-navyDark transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.bg} ring-1 ${item.accent} opacity-60 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100`}>
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
            Nihong Jastip · Semua data tersinkronisasi secara real-time
          </p>
        </motion.div>
      </div>
    </div>
  );
}
