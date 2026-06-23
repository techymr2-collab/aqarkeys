import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex gap-1 border-b border-slate-900/[0.08]", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brand-700" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
