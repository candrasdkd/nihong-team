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

export function StatCardSkeleton() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-card p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <Shimmer className="w-10 h-10 rounded-xl" />
        <Shimmer className="w-14 h-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-7 w-28" />
        <Shimmer className="h-3 w-20" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-surface-border">
          <Shimmer className="w-4 h-4 rounded" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface-card border border-surface-border rounded-card p-4 flex items-center gap-3">
          <Shimmer className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-1/3" />
            <Shimmer className="h-3 w-2/3" />
          </div>
          <Shimmer className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
