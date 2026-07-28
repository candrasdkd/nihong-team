import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface HeroPageHeaderProps {
  badgeIcon: LucideIcon;
  badgeLabel: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  mobileSubtitle?: string;
  variant?: "navy" | "gradient";
}

export function HeroPageHeader({
  badgeIcon: Icon,
  badgeLabel,
  title,
  description,
  action,
  mobileSubtitle,
  variant = "navy",
}: HeroPageHeaderProps) {
  const isGradient = variant === "gradient";

  return (
    <>
      <div className="block sm:hidden">
        <p className="eyebrow mb-2 text-brand-orange">{badgeLabel}</p>
        <h2 className="text-xl font-extrabold text-brand-navyDark tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{mobileSubtitle ?? description}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`hidden sm:block relative overflow-hidden rounded-card px-7 py-8 shadow-[0_16px_45px_rgba(7,27,51,0.14)] ${
          isGradient
            ? "bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-navyLight border border-white/10"
            : "bg-brand-navy border border-brand-navyLight/40"
        }`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-orange/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
              isGradient
                ? "bg-white/10 border border-white/20 text-white/70"
                : "bg-white/10 border border-white/10 text-brand-orange"
            }`}>
              <Icon size={12} />
              <span>{badgeLabel}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h2>
            <p className={`mt-2 text-sm max-w-lg leading-relaxed ${
              isGradient ? "text-slate-400" : "text-slate-300"
            }`}>{description}</p>
          </div>
          {action && (
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
              {action}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
