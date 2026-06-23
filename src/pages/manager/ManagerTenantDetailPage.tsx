import { type ReactNode, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { InviteModal } from "@/features/invites/InviteModal";
import { UserIcon, HomeIcon, BanknoteIcon } from "@/components/icons";
import { useTenants, useDeleteTenant } from "@/data/tenants";
import { useLeases } from "@/data/leases";
import { useInvoices } from "@/data/invoices";
import { useMaintenance } from "@/data/maintenance";
import { useInvitations } from "@/data/invitations";
import { formatDate, formatMoney } from "@/lib/format";
import {
  leaseStatusLabel,
  leaseStatusTone,
  invoiceStatusLabel,
  invoiceStatusTone,
  maintenanceStatusLabel,
  maintenanceStatusTone,
} from "@/lib/labels";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

function InfoCard({
  icon,
  iconClass,
  label,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ManagerTenantDetailPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const tenants = useTenants();
  const leases = useLeases();
  const invoices = useInvoices();
  const maintenance = useMaintenance();
  const invitations = useInvitations();
  const deleteTenant = useDeleteTenant();

  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tenant = tenants.data?.find((t) => t.id === tenantId);

  const tenantLeases = useMemo(
    () => (leases.data ?? []).filter((l) => l.tenant_id === tenantId),
    [leases.data, tenantId],
  );
  const tenantUnitIds = useMemo(
    () => new Set(tenantLeases.map((l) => l.unit_id)),
    [tenantLeases],
  );
  const tenantInvoices = useMemo(
    () => (invoices.data ?? []).filter((inv) => inv.lease?.tenant?.id === tenantId),
    [invoices.data, tenantId],
  );
  const tenantMaintenance = useMemo(
    () => (maintenance.data ?? []).filter((m) => tenantUnitIds.has(m.unit_id)),
    [maintenance.data, tenantUnitIds],
  );

  const currentLease = tenantLeases.find((l) => l.status === "active") ?? tenantLeases[0] ?? null;
  const hasAccess = !!tenant?.profile_id;
  const pendingInvite = (invitations.data ?? []).some(
    (i) => i.status === "pending" && i.tenant_id === tenantId,
  );

  const outstanding = tenantInvoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((s, inv) => s + inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0), 0);
  const totalPaid = tenantInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((s, inv) => s + inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0), 0);
  const currency = currentLease?.currency ?? tenantInvoices[0]?.currency ?? "AED";

  async function handleDelete() {
    if (!tenantId) return;
    try {
      await deleteTenant.mutateAsync(tenantId);
      pushToast("Tenant deleted", "success");
      navigate("/manager/tenants");
    } catch (err) {
      pushToast(friendlyError(err, "This tenant has a lease and cannot be deleted."), "error");
      setDeleting(false);
    }
  }

  if (tenants.isLoading) return <PageLoader label="Loading tenant" />;
  if (tenants.isError) return <ErrorState onRetry={() => void tenants.refetch()} />;
  if (!tenant) return <ErrorState message="Tenant not found." onRetry={() => navigate("/manager/tenants")} />;

  return (
    <div>
      <PageHeader
        back={{ label: "Tenants", to: "/manager/tenants" }}
        title={tenant.name}
        subtitle={tenant.email ?? tenant.phone ?? "No contact details"}
        action={
          <div className="flex gap-2">
            {!hasAccess && (
              <Button variant="secondary" onClick={() => setInviting(true)}>
                {pendingInvite ? "Resend invite" : "Invite to portal"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<HomeIcon className="h-5 w-5" />} iconClass="bg-brand-50 text-brand-600" label="Current unit">
          <p className="mt-1 truncate text-lg font-semibold text-slate-900">
            {currentLease?.unit?.label ?? "—"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {currentLease?.unit?.property?.name ?? "No active lease"}
          </p>
        </InfoCard>

        <InfoCard icon={<UserIcon className="h-5 w-5" />} iconClass="bg-slate-100 text-slate-600" label="Lease status">
          {currentLease ? (
            <p className="mt-1.5">
              <Badge tone={leaseStatusTone[currentLease.status]}>{leaseStatusLabel[currentLease.status]}</Badge>
            </p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-slate-400">—</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{tenantLeases.length} lease(s) on record</p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-rose-50 text-rose-600" label="Outstanding">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(outstanding, currency)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Unpaid or overdue invoices</p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-emerald-50 text-emerald-600" label="Paid to date">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(totalPaid, currency)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{tenantInvoices.length} invoice(s) total</p>
        </InfoCard>
      </div>

      {/* ── Leases ───────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Leases</h2>
        <p className="mt-0.5 text-sm text-slate-600">Current and past leases for this tenant.</p>
      </div>

      {leases.isLoading && <PageLoader label="Loading leases" />}
      {leases.isError && <ErrorState onRetry={() => void leases.refetch()} />}

      {leases.data && tenantLeases.length === 0 && (
        <EmptyState title="No leases yet" description="Create a lease to assign this tenant to a unit." />
      )}

      {tenantLeases.length > 0 && (
        <Table>
          <THead>
            <TH>Unit</TH>
            <TH>Term</TH>
            <TH className="text-right">Rent</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {tenantLeases.map((l) => (
              <TR key={l.id} onClick={() => navigate(`/manager/leases/${l.id}`)}>
                <TD className="font-medium text-slate-900">
                  {l.unit?.label ?? "—"}
                  <div className="text-xs font-normal text-slate-500">{l.unit?.property?.name ?? ""}</div>
                </TD>
                <TD className="whitespace-nowrap">{formatDate(l.start_date)} – {formatDate(l.end_date)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(l.rent_amount, l.currency)}</TD>
                <TD>
                  <Badge tone={leaseStatusTone[l.status]}>{leaseStatusLabel[l.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* ── Invoices ─────────────────────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Invoice history</h2>
        <p className="mt-0.5 text-sm text-slate-600">Rent invoices billed to this tenant.</p>
      </div>

      {invoices.isLoading && <PageLoader label="Loading invoices" />}
      {invoices.isError && <ErrorState onRetry={() => void invoices.refetch()} />}

      {invoices.data && tenantInvoices.length === 0 && (
        <EmptyState title="No invoices yet" description="Invoices for this tenant's lease will appear here." />
      )}

      {tenantInvoices.length > 0 && (
        <Table>
          <THead>
            <TH>Period</TH>
            <TH>Due</TH>
            <TH className="text-right">Amount</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {tenantInvoices.map((inv) => (
              <TR key={inv.id}>
                <TD>{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</TD>
                <TD>{formatDate(inv.due_date)}</TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0), inv.currency)}
                </TD>
                <TD>
                  <Badge tone={invoiceStatusTone[inv.status]}>{invoiceStatusLabel[inv.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* ── Maintenance ──────────────────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Maintenance requests</h2>
        <p className="mt-0.5 text-sm text-slate-600">Issues reported on units this tenant has leased.</p>
      </div>

      {maintenance.isLoading && <PageLoader label="Loading maintenance requests" />}
      {maintenance.isError && <ErrorState onRetry={() => void maintenance.refetch()} />}

      {maintenance.data && tenantMaintenance.length === 0 && (
        <EmptyState
          title="No maintenance requests"
          description="Issues reported for this tenant's units will appear here."
        />
      )}

      {tenantMaintenance.length > 0 && (
        <Table>
          <THead>
            <TH>Title</TH>
            <TH>Unit</TH>
            <TH>Reported</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {tenantMaintenance.map((m) => (
              <TR key={m.id} onClick={() => navigate("/manager/maintenance")}>
                <TD className="font-medium text-slate-900">{m.title}</TD>
                <TD>{m.unit?.label ?? "—"}</TD>
                <TD>{formatDate(m.created_at.slice(0, 10))}</TD>
                <TD>
                  <Badge tone={maintenanceStatusTone[m.status]}>{maintenanceStatusLabel[m.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {editing && <TenantFormModal open={editing} onClose={() => setEditing(false)} tenant={tenant} />}
      {inviting && (
        <InviteModal
          open={inviting}
          onClose={() => setInviting(false)}
          role="tenant"
          subjectName={tenant.name}
          defaultEmail={tenant.email ?? ""}
          tenantId={tenant.id}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={deleting}
          title="Delete tenant"
          message={`Delete ${tenant.name}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteTenant.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
