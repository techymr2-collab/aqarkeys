import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ActionIconProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export function ActionIcon({ label, onClick, children, danger = false, disabled = false }: ActionIconProps) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          danger
            ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {label}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
