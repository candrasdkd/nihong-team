import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export function Card({ children, className = "", padding = true, hover = false }: CardProps) {
  return (
    <div
      className={`
        bg-surface-card border border-white/90 ring-1 ring-surface-border/80 rounded-card shadow-card
        ${padding ? 'p-5' : ''}
        ${hover ? 'hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-slate-300/80 transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
