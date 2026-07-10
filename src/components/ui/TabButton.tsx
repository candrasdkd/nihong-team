import { ReactNode } from "react";

interface TabButtonProps {
  current: string;
  setTab: (t: string) => void;
  id: string;
  children: ReactNode;
}

export function TabButton({ current, setTab, id, children }: TabButtonProps) {
  const active = current === id;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2.5 rounded-input text-sm font-semibold border transition min-h-[44px] ${
        active
          ? "bg-brand-navy text-white border-brand-navy shadow-sm"
          : "bg-surface-card text-slate-600 border-surface-border hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
