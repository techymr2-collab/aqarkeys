import { type ReactNode, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Optional back link shown above the title (used on detail pages). */
  back?: { label: string; to: string };
}

/**
 * Renders into the fixed app header (#page-header-slot in AppLayout) via a
 * portal, so the title/action stay visible while the page's own content
 * scrolls underneath. The portal target lives in AppLayout, which never
 * unmounts on navigation, so this only needs to look the node up once.
 */
export function PageHeader({ title, subtitle, action, back }: PageHeaderProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setSlot(document.getElementById("page-header-slot"));
  }, []);

  if (!slot) return null;

  return createPortal(
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-0.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
              aria-hidden
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
            {back.label}
          </Link>
        )}
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>,
    slot,
  );
}
