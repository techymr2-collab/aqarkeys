import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  XIcon,
  CalendarIcon,
  ReceiptIcon,
  WrenchIcon,
  MailIcon,
  ChequeIcon,
} from "@/components/icons";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  AppNotification,
  NotificationSeverity,
  NotificationType,
} from "@/data/notifications";

interface Props {
  open: boolean;
  notifications: AppNotification[];
  readIds: Set<string>;
  onClose: () => void;
}

function NotifIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  if (type === "lease_expiring") return <CalendarIcon className={className} />;
  if (type === "invoice_overdue" || type === "rent_due_soon") return <ReceiptIcon className={className} />;
  if (type === "maintenance_submitted" || type === "maintenance_update") return <WrenchIcon className={className} />;
  if (type === "cheque_bounced") return <ChequeIcon className={className} />;
  return <MailIcon className={className} />;
}

function iconBg(severity: NotificationSeverity, type: NotificationType): string {
  if (severity === "error") return "bg-rose-50 text-rose-500";
  if (severity === "warning") return "bg-amber-50 text-amber-500";
  if (type === "maintenance_submitted") return "bg-brand-50 text-brand-600";
  return "bg-slate-100 text-slate-500";
}

export function NotificationPanel({ open, notifications, readIds, onClose }: Props) {
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the panel when it opens for keyboard accessibility
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const unread = notifications.filter((n) => !readIds.has(n.id)).length;

  function handleItemClick(href: string) {
    navigate(href);
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className={cn(
        "fixed inset-0 z-50 flex justify-end",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/[0.08] backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={cn(
          "relative flex h-full w-96 flex-col border-l border-slate-900/[0.07] bg-white shadow-2xl",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-900/[0.07] px-5 py-4">
          <h2 className="flex-1 text-base font-semibold text-slate-900">
            Notifications
          </h2>
          {unread > 0 && (
            <span className="text-sm text-slate-400">{unread} unread</span>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <BellIcon className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">All caught up!</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  No leases expiring, overdue invoices, or pending actions.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-900/[0.05]">
              {notifications.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n.href)}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80",
                      isUnread && "bg-brand-50/30",
                    )}
                  >
                    {/* Unread dot */}
                    <div className="mt-[18px] h-1.5 w-1.5 shrink-0 rounded-full">
                      {isUnread && (
                        <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                      )}
                    </div>

                    {/* Type icon */}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        iconBg(n.severity, n.type),
                      )}
                    >
                      <NotifIcon type={n.type} className="h-[17px] w-[17px]" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1 pt-px">
                      <p
                        className={cn(
                          "text-sm",
                          isUnread
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-700",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(n.date.slice(0, 10))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
