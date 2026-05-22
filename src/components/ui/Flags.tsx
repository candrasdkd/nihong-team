import React from "react";

interface FlagProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const jpDotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2.5 h-2.5",
  lg: "w-3.5 h-3.5",
};

export const FlagID = ({ className = "", size = "sm" }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}>
      <div className="bg-[#e70012] h-1/2 w-full"></div>
      <div className="bg-white h-1/2 w-full"></div>
    </div>
  );
};

export const FlagJP = ({ className = "", size = "sm" }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  const dotSize = jpDotSizes[size];
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center relative shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}>
      <div className={`${dotSize} bg-[#bc002d] rounded-full`}></div>
    </div>
  );
};
