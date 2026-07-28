import React from "react";
import type { LucideIcon } from "lucide-react";

interface StickyPageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  titleExtra?: React.ReactNode;
  titleClassName?: string;
}

export function StickyPageHeader({ title, subtitle, icon: Icon, action, titleExtra, titleClassName }: StickyPageHeaderProps) {
  return (
    <div className="static z-20 border-b border-white/80 bg-surface-card/88 backdrop-blur-xl sm:sticky sm:top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-[14px] bg-brand-mist flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-navyDark" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-lg font-extrabold text-brand-navyDark tracking-tight ${titleClassName ?? ""}`}>
                  {title}
                </h1>
                {titleExtra}
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.16em] mt-1 hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>
          {action && (
            <div className="flex items-center gap-2">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
