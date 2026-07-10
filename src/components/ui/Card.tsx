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
        bg-surface-card border border-surface-border rounded-card shadow-card
        ${padding ? 'p-5' : ''}
        ${hover ? 'hover:shadow-card-hover hover:border-slate-200 transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
