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
    <div className="bg-surface-card/80 backdrop-blur-md border-b border-surface-border static sm:sticky sm:top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-navyDark" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-lg font-bold text-slate-800 tracking-tight ${titleClassName ?? ""}`}>
                  {title}
                </h1>
                {titleExtra}
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 hidden sm:block">
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
