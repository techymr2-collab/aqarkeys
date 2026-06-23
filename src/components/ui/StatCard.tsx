import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accentClass?: string;
}

export function StatCard({ label, value, hint, icon, accentClass }: StatCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              accentClass ?? "bg-slate-100 text-slate-500",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <div className="mt-1 text-sm text-slate-600">{hint}</div>}
    </div>
  );
}
