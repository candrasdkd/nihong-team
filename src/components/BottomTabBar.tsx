import { ElementType } from "react";
import { Home, ClipboardList, Wallet, LayoutGrid } from "lucide-react";
import { TabId } from "../types";

// Konfigurasi 4 tab utama di mobile.
// Tab "menu" berfungsi sebagai hub untuk fitur-fitur lainnya
// (Pelanggan, Jastiper, Jadwal, Pre Order).
const TAB_CONFIG: { id: TabId; label: string; Icon: ElementType }[] = [
  { id: "home",    label: "Dashboard", Icon: Home },
  { id: "orders",  label: "Pesanan",   Icon: ClipboardList },
  { id: "menu",    label: "Menu",      Icon: LayoutGrid },
  { id: "cash",    label: "Kas",       Icon: Wallet },
];

// Daftar tab yang termasuk di dalam "menu" (untuk highlight tab menu saat salah satunya aktif)
const MENU_CHILD_TABS = new Set(["customers", "jastipers", "schedules", "preorders"]);

interface BottomTabBarProps {
  current: TabId;
  setTab: (t: TabId) => void;
}

export function BottomTabBar({ current, setTab }: BottomTabBarProps) {
  // Tab "Menu" dianggap aktif jika current adalah "menu" atau salah satu halaman anak-nya
  const isMenuActive = current === "menu" || MENU_CHILD_TABS.has(current);

  return (
    <footer
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav className="max-w-7xl mx-auto px-3 py-2">
        <div className="grid grid-cols-4 gap-1">
          {TAB_CONFIG.map(({ id, label, Icon }) => {
            const active = id === "menu" ? isMenuActive : current === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`group flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition ${
                  active
                    ? "bg-[#0a2342] text-white"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`} />
                <span className={`text-[10px] leading-none ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </footer>
  );
}
