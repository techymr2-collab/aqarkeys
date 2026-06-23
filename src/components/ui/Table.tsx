import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TableProps {
  children: ReactNode;
  /** When provided the table gets internal scroll and the footer renders below (inside the glass-card). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Pass `footer={<Pagination …/>}` + `className="h-full"` to enable internal scroll
 * with a sticky THead. Without footer the component behaves like a plain block table.
 */
export function Table({ children, footer, className }: TableProps) {
  const scrollable = !!footer;
  return (
    <div
      className={cn(
        "glass-card overflow-hidden p-0",
        scrollable && "flex flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-x-auto",
          scrollable && "min-h-0 flex-1 overflow-y-auto",
        )}
      >
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
      {footer}
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-900/[0.04]">{children}</tbody>;
}

export function TR({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-slate-50/70",
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={cn("px-4 py-2.5 text-sm text-slate-700", className)} {...props}>
      {children}
    </td>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const widths = ["w-32", "w-28", "w-24", "w-16", "w-20", "w-20"];
  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="flex items-center gap-8 border-b border-slate-900/[0.06] bg-white/95 px-4 py-3">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className={cn("skeleton h-2.5", widths[c % widths.length])} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-8 border-b border-slate-900/[0.04] px-4 py-3 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn(
                "skeleton",
                c === 0 ? "h-4 w-36" :
                c === cols - 1 ? "ml-auto h-7 w-16 rounded-full" :
                `h-4 ${widths[(c + 1) % widths.length]}`,
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
