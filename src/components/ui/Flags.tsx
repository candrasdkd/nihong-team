import React from "react";

export interface FlagProps extends React.HTMLAttributes<HTMLDivElement> {
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

export const FlagID = ({ className = "", size = "sm", ...props }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  return (
    <div
      {...props}
      className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}
    >
      <div className="bg-[#e70012] h-1/2 w-full"></div>
      <div className="bg-white h-1/2 w-full"></div>
    </div>
  );
};

export const FlagJP = ({ className = "", size = "sm", ...props }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  const dotSize = jpDotSizes[size];
  return (
    <div
      {...props}
      className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center relative shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}
    >
      <div className={`${dotSize} bg-[#bc002d] rounded-full`} style={{ width: props.style?.width ? "55%" : undefined, height: props.style?.height ? "55%" : undefined }}></div>
    </div>
  );
};

export const FlagSG = ({ className = "", size = "sm", ...props }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  return (
    <div
      {...props}
      className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}
    >
      <div className="bg-[#df0000] h-1/2 w-full"></div>
      <div className="bg-white h-1/2 w-full"></div>
    </div>
  );
};

export const FlagMY = ({ className = "", size = "sm", ...props }: FlagProps) => {
  const sizeClass = sizeClasses[size];
  return (
    <div
      {...props}
      className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white relative shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full" style={{ display: "block" }}>
        <rect width="24" height="24" fill="#ffffff" />
        <rect width="24" height="2" fill="#cc0000" />
        <rect y="4" width="24" height="2" fill="#cc0000" />
        <rect y="8" width="24" height="2" fill="#cc0000" />
        <rect y="12" width="24" height="2" fill="#cc0000" />
        <rect y="16" width="24" height="2" fill="#cc0000" />
        <rect y="20" width="24" height="2" fill="#cc0000" />
        <rect width="12" height="12" fill="#000066" />
      </svg>
    </div>
  );
};
