import { useMemo } from "react";
import { useLeases } from "@/data/leases";
import { useInvoices } from "@/data/invoices";
import { useMaintenance } from "@/data/maintenance";
import { useInvitations } from "@/data/invitations";
import { daysUntil, formatMoney, formatDate } from "@/lib/format";
import { usePdcCheques } from "@/data/cheques";
import { useTenantInvoices, useTenantLeases } from "@/data/tenantPortal";

export type NotificationSeverity = "error" | "warning" | "info";
export type NotificationType =
  | "lease_expiring"
  | "invoice_overdue"
  | "maintenance_submitted"
  | "invite_pending"
  | "cheque_bounced"
  | "rent_due_soon"
  | "maintenance_update";

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string;
  date: string;
}

const SEV_ORDER: Record<NotificationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function useManagerNotifications(): AppNotification[] {
  const { data: leases = [] } = useLeases();
  const { data: invoices = [] } = useInvoices();
  const { data: maintenance = [] } = useMaintenance();
  const { data: invitations = [] } = useInvitations();
  const { data: cheques = [] } = usePdcCheques();

  return useMemo(() => {
    const notes: AppNotification[] = [];

    // Leases expiring within 60 days
    for (const l of leases) {
      const days = daysUntil(l.end_date);
      if (l.status === "active" && days >= 0 && days <= 60) {
        const dayLabel =
          days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`;
        notes.push({
          id: `lease_expiring-${l.id}`,
          type: "lease_expiring",
          severity: days <= 14 ? "error" : "warning",
          title: `Lease expires ${dayLabel}`,
          body: [l.tenant?.name, l.unit?.label, l.unit?.property?.name]
            .filter((x): x is string => typeof x === "string")
            .join(" · "),
          href: "/manager/leases",
          date: l.end_date,
        });
      }
    }

    // Overdue invoices
    for (const inv of invoices) {
      if (inv.status === "overdue") {
        notes.push({
          id: `invoice_overdue-${inv.id}`,
          type: "invoice_overdue",
          severity: "error",
          title: "Invoice overdue",
          body: [
            inv.lease?.tenant?.name,
            inv.lease?.unit?.label,
            `${formatMoney(inv.amount, inv.currency)} due ${formatDate(inv.due_date)}`,
          ]
            .filter((x): x is string => typeof x === "string")
            .join(" · "),
          href: "/manager/invoices",
          date: inv.due_date,
        });
      } else if (inv.status === "sent") {
        // Sent invoices due within 3 days — a heads-up before they go overdue.
        const days = daysUntil(inv.due_date);
        if (days >= 0 && days <= 3) {
          const dayLabel = days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`;
          notes.push({
            id: `rent_due_soon-${inv.id}`,
            type: "rent_due_soon",
            severity: days === 0 ? "warning" : "info",
            title: `Invoice due ${dayLabel}`,
            body: [
              inv.lease?.tenant?.name,
              inv.lease?.unit?.label,
              formatMoney(inv.amount + inv.vat_amount, inv.currency),
            ]
              .filter((x): x is string => typeof x === "string")
              .join(" · "),
            href: `/manager/invoices/${inv.id}`,
            date: inv.due_date,
          });
        }
      }
    }

    // Submitted maintenance requests (priority sets severity)
    for (const req of maintenance) {
      if (req.status === "submitted") {
        const severity: NotificationSeverity =
          req.priority === "urgent"
            ? "error"
            : req.priority === "high"
              ? "warning"
              : "info";
        notes.push({
          id: `maintenance_submitted-${req.id}`,
          type: "maintenance_submitted",
          severity,
          title: "Maintenance request submitted",
          body: [req.reporter?.full_name, req.unit?.label, req.title]
            .filter((x): x is string => typeof x === "string")
            .join(" · "),
          href: "/manager/maintenance",
          date: req.created_at,
        });
      }
    }

    // Pending invitations
    for (const inv of invitations) {
      if (inv.status === "pending") {
        notes.push({
          id: `invite_pending-${inv.id}`,
          type: "invite_pending",
          severity: "info",
          title: "Invitation pending",
          body: `${inv.email} — awaiting sign-up`,
          href: "/manager/tenants",
          date: inv.created_at,
        });
      }
    }

    // Bounced cheques
    for (const c of cheques) {
      if (c.status === "bounced") {
        notes.push({
          id: `cheque_bounced-${c.id}`,
          type: "cheque_bounced",
          severity: "error",
          title: "Cheque bounced",
          body: [
            c.lease?.tenant?.name,
            c.lease?.unit?.label,
            formatMoney(c.amount, "AED"),
            `due ${formatDate(c.due_date)}`,
          ]
            .filter((x): x is string => typeof x === "string")
            .join(" · "),
          href: "/manager/cheques",
          date: c.due_date,
        });
      }
    }

    // Sort: errors first, then warnings, then info; newest within each tier
    notes.sort((a, b) => {
      const d = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      return d !== 0 ? d : b.date.localeCompare(a.date);
    });

    return notes;
  }, [leases, invoices, maintenance, invitations, cheques]);
}

export function useTenantNotifications(): AppNotification[] {
  const { data: leases = [] } = useTenantLeases();
  const { data: invoices = [] } = useTenantInvoices();
  const { data: maintenance = [] } = useMaintenance();

  return useMemo(() => {
    const notes: AppNotification[] = [];

    // Own lease expiring within 60 days
    for (const l of leases) {
      const days = daysUntil(l.end_date);
      if (l.status === "active" && days >= 0 && days <= 60) {
        const dayLabel = days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`;
        notes.push({
          id: `lease_expiring-${l.id}`,
          type: "lease_expiring",
          severity: days <= 14 ? "error" : "warning",
          title: `Your lease ends ${dayLabel}`,
          body: l.unit?.property ? `${l.unit.property.name} · ${l.unit.label}` : "",
          href: "/tenant",
          date: l.end_date,
        });
      }
    }

    // Rent overdue or due soon
    for (const inv of invoices) {
      const total = inv.amount + inv.vat_amount + inv.late_fee;
      if (inv.status === "overdue") {
        notes.push({
          id: `invoice_overdue-${inv.id}`,
          type: "invoice_overdue",
          severity: "error",
          title: "Rent overdue",
          body: `${formatMoney(total, inv.currency)} was due ${formatDate(inv.due_date)}`,
          href: "/tenant/invoices",
          date: inv.due_date,
        });
      } else if (inv.status === "sent") {
        const days = daysUntil(inv.due_date);
        if (days >= 0 && days <= 7) {
          const dayLabel = days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`;
          notes.push({
            id: `rent_due_soon-${inv.id}`,
            type: "rent_due_soon",
            severity: days <= 2 ? "warning" : "info",
            title: `Rent due ${dayLabel}`,
            body: formatMoney(total, inv.currency),
            href: "/tenant/invoices",
            date: inv.due_date,
          });
        }
      }
    }

    // Maintenance: recently resolved (good news) or actively being worked on
    for (const req of maintenance) {
      if (req.status === "resolved" && req.resolved_at) {
        if (daysUntil(req.resolved_at.slice(0, 10)) >= -14) {
          notes.push({
            id: `maintenance_update-${req.id}-resolved`,
            type: "maintenance_update",
            severity: "info",
            title: "Maintenance resolved",
            body: req.title,
            href: "/tenant/maintenance",
            date: req.resolved_at,
          });
        }
      } else if (req.status === "in_progress" || req.status === "on_hold") {
        notes.push({
          id: `maintenance_update-${req.id}-${req.status}`,
          type: "maintenance_update",
          severity: "info",
          title: req.status === "in_progress" ? "Maintenance in progress" : "Maintenance on hold",
          body: req.title,
          href: "/tenant/maintenance",
          date: req.updated_at,
        });
      }
    }

    notes.sort((a, b) => {
      const d = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      return d !== 0 ? d : b.date.localeCompare(a.date);
    });

    return notes;
  }, [leases, invoices, maintenance]);
}

// ── Read-state helpers (localStorage) ─────────────────────────────────────────

export function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem("prop-mgmt:notif-read");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

export function persistReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem("prop-mgmt:notif-read", JSON.stringify([...ids]));
  } catch {
    // localStorage quota exceeded — ignore
  }
}
