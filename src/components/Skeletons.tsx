import React from "react";

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded ${className}`} />
  );
}

export function PageSkeleton() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-2 rounded-full bg-brand-navy/10 blur-md animate-pulse" />
        <div className="w-12 h-12 rounded-full border-4 border-brand-navy/10 border-t-brand-navy animate-spin" />
      </div>
      <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
        Memuat Halaman...
      </p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base pb-24 font-sans text-slate-800">
      <div className="page-container space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-card bg-surface-card border border-surface-border shadow-card animate-pulse">
          <div className="space-y-2">
            <Shimmer className="h-6 w-48 sm:w-64" />
            <Shimmer className="h-4 w-32 sm:w-40" />
          </div>
          <Shimmer className="h-10 w-36 rounded-input self-start sm:self-auto" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-card p-5 bg-surface-card border border-surface-border shadow-card space-y-4">
              <div className="flex items-start justify-between">
                <Shimmer className="w-10 h-10 rounded-xl" />
                <Shimmer className="w-14 h-5 rounded-full" />
              </div>
              <div className="space-y-2">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-7 w-28 sm:w-36" />
                <Shimmer className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-card p-6 bg-surface-card border border-surface-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-3 w-24" />
              </div>
              <div className="flex gap-2">
                <Shimmer className="h-8 w-16 rounded-lg" />
                <Shimmer className="h-8 w-16 rounded-lg" />
              </div>
            </div>
            <div className="h-[280px] w-full flex items-end justify-between pt-6 px-4 border-b border-l border-slate-100">
              {[...Array(12)].map((_, i) => {
                const heightPercent = [30, 45, 60, 50, 75, 90, 80, 55, 65, 40, 70, 85][i % 12];
                return (
                  <div
                    key={i}
                    className="w-4 sm:w-6 bg-slate-100 rounded-t animate-pulse"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-card p-5 bg-surface-card border border-surface-border shadow-card space-y-4">
              <Shimmer className="h-4 w-28" />
              <div className="flex gap-3">
                <div className="flex-1 py-3 px-4 rounded-xl bg-slate-50 border border-surface-border space-y-2">
                  <Shimmer className="h-6 w-10" />
                  <Shimmer className="h-3 w-16" />
                </div>
                <div className="flex-1 py-3 px-4 rounded-xl bg-slate-50 border border-surface-border space-y-2">
                  <Shimmer className="h-6 w-10" />
                  <Shimmer className="h-3 w-16" />
                </div>
              </div>
            </div>

            <div className="rounded-card p-5 bg-surface-card border border-surface-border shadow-card space-y-4">
              <Shimmer className="h-4 w-36" />
              <div className="space-y-3">
                {[1, 2, 3].map((x) => (
                  <div key={x} className="flex justify-between items-center py-1">
                    <div className="flex items-center gap-3">
                      <Shimmer className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Shimmer className="h-3.5 w-24" />
                        <Shimmer className="h-3 w-16" />
                      </div>
                    </div>
                    <Shimmer className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base pb-28 font-sans text-slate-800">
      <div className="page-container space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Shimmer className="w-10 h-10 rounded-2xl" />
            <div className="space-y-1.5">
              <Shimmer className="h-6 w-32" />
              <Shimmer className="h-3.5 w-48" />
            </div>
          </div>
          <Shimmer className="h-10 w-28 rounded-input" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-card rounded-card p-4 border border-surface-border shadow-card space-y-2">
              <div className="flex justify-between items-center">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-5 w-5 rounded-full" />
              </div>
              <Shimmer className="h-6 w-20" />
            </div>
          ))}
        </div>

        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-card grid grid-cols-1 md:grid-cols-4 gap-3 animate-pulse">
          <div className="md:col-span-2">
            <Shimmer className="h-10 w-full rounded-input" />
          </div>
          <Shimmer className="h-10 w-full rounded-input" />
          <Shimmer className="h-10 w-full rounded-input" />
        </div>

        <div className="bg-surface-card rounded-card border border-surface-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-surface-border flex justify-between items-center bg-slate-50">
            <Shimmer className="h-5 w-24" />
            <Shimmer className="h-8 w-20 rounded-lg" />
          </div>
          <div className="divide-y divide-surface-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Shimmer className="w-4 h-4 rounded" />
                  <div className="space-y-2 flex-1 max-w-[200px] sm:max-w-xs">
                    <Shimmer className="h-4 w-3/4" />
                    <Shimmer className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-1 text-right hidden sm:block">
                    <Shimmer className="h-3.5 w-16 ml-auto" />
                    <Shimmer className="h-3 w-12 ml-auto" />
                  </div>
                  <Shimmer className="h-6 w-20 rounded-full" />
                  <Shimmer className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
