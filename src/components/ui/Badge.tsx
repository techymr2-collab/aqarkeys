import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const tones: Record<Tone, string> = {
  green: "bg-emerald-500/10 text-emerald-700 border-emerald-600/20",
  amber: "bg-amber-500/10 text-amber-700 border-amber-600/20",
  rose: "bg-rose-500/10 text-rose-700 border-rose-600/20",
  slate: "bg-slate-900/[0.04] text-slate-600 border-slate-900/10",
  brand: "bg-brand-500/10 text-brand-700 border-brand-500/25",
  blue: "bg-sky-500/10 text-sky-700 border-sky-600/20",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border p-1.5 text-xs font-medium leading-none",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
