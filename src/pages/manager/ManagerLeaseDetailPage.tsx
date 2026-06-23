import { type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { RenewLeaseModal } from "@/features/leases/RenewLeaseModal";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { HomeIcon, BanknoteIcon, ClipboardCheckIcon, RefreshCwIcon, XCircleIcon, TrashIcon } from "@/components/icons";
import { useLeases, useTerminateLease, useDeleteLease } from "@/data/leases";
import { useInvoices } from "@/data/invoices";
import { usePdcCheques } from "@/data/cheques";
import { useEjariRegistrations } from "@/data/ejari";
import { useOrganization } from "@/data/organization";
import { formatDate, formatMoney } from "@/lib/format";
import {
  leaseStatusLabel,
  leaseStatusTone,
  invoiceStatusLabel,
  invoiceStatusTone,
  pdcStatusLabel,
  pdcStatusTone,
  frequencyLabel,
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

export function ManagerLeaseDetailPage() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const leases = useLeases();
  const invoices = useInvoices();
  const cheques = usePdcCheques();
  const ejari = useEjariRegistrations();
  const org = useOrganization();
  const terminate = useTerminateLease();
  const deleteLease = useDeleteLease();

  const [renewing, setRenewing] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lease = leases.data?.find((l) => l.id === leaseId);
  const leaseInvoices = useMemo(
    () => (invoices.data ?? []).filter((inv) => inv.lease_id === leaseId),
    [invoices.data, leaseId],
  );
  const leaseCheques = useMemo(
    () => (cheques.data ?? []).filter((c) => c.lease_id === leaseId),
    [cheques.data, leaseId],
  );
  const leaseEjari = ejari.data?.find((e) => e.lease_id === leaseId) ?? null;

  const canTerminate = lease?.status === "active" || lease?.status === "upcoming";
  const canRenew = lease?.status === "active" || lease?.status === "expired";

  async function handleTerminate() {
    if (!lease?.unit) return;
    try {
      await terminate.mutateAsync({ id: lease.id, unitId: lease.unit.id });
      pushToast("Lease terminated. Unit is now vacant.", "success");
      setTerminating(false);
    } catch (err) {
      pushToast(friendlyError(err, "Could not terminate the lease."), "error");
    }
  }

  async function handleDelete() {
    if (!lease?.unit) return;
    try {
      await deleteLease.mutateAsync({
        id: lease.id,
        unitId: lease.unit.id,
        wasActive: lease.status === "active",
      });
      pushToast("Lease deleted.", "success");
      navigate("/manager/leases");
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the lease."), "error");
      setDeleting(false);
    }
  }

  if (leases.isLoading) return <PageLoader label="Loading lease" />;
  if (leases.isError) return <ErrorState onRetry={() => void leases.refetch()} />;
  if (!lease) return <ErrorState message="Lease not found." onRetry={() => navigate("/manager/leases")} />;

  return (
    <div>
      <PageHeader
        back={{ label: "Leases", to: "/manager/leases" }}
        title={lease.tenant?.name ?? "Unnamed tenant"}
        subtitle={`${lease.unit?.label ?? "—"} · ${lease.unit?.property?.name ?? "—"}`}
        action={
          <div className="flex gap-2">
            {canRenew && (
              <Button variant="secondary" onClick={() => setRenewing(true)}>
                <RefreshCwIcon className="mr-1.5 h-4 w-4" />
                Renew
              </Button>
            )}
            {canTerminate && (
              <Button variant="ghost" onClick={() => setTerminating(true)}>
                <XCircleIcon className="mr-1.5 h-4 w-4" />
                Terminate
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDeleting(true)}>
              <TrashIcon className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<HomeIcon className="h-5 w-5" />} iconClass="bg-slate-100 text-slate-600" label="Status">
          <p className="mt-1.5">
            <Badge tone={leaseStatusTone[lease.status]}>{leaseStatusLabel[lease.status]}</Badge>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
          </p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-brand-50 text-brand-600" label="Rent">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(lease.rent_amount, lease.currency)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{frequencyLabel[lease.frequency]}</p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-amber-50 text-amber-600" label="Deposit">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(lease.deposit_amount, lease.currency)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Held against this lease</p>
        </InfoCard>

        <InfoCard icon={<ClipboardCheckIcon className="h-5 w-5" />} iconClass="bg-emerald-50 text-emerald-600" label="EJARI">
          {leaseEjari ? (
            <>
              <p className="mt-1 truncate text-lg font-semibold text-slate-900">{leaseEjari.ejari_number}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {leaseEjari.expires_at ? `Expires ${formatDate(leaseEjari.expires_at)}` : "No expiry on file"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-medium text-slate-400">Not registered</p>
              <Link to="/manager/ejari" className="mt-0.5 text-xs text-brand-600 hover:underline">
                Register EJARI →
              </Link>
            </>
          )}
        </InfoCard>
      </div>

      {/* ── Invoices ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
          <p className="mt-0.5 text-sm text-slate-600">Rent invoices issued for this lease.</p>
        </div>
        <Link to="/manager/invoices" className="text-sm font-medium text-brand-600 hover:underline">
          View all invoices →
        </Link>
      </div>

      {invoices.isLoading && <PageLoader label="Loading invoices" />}
      {invoices.isError && <ErrorState onRetry={() => void invoices.refetch()} />}

      {invoices.data && leaseInvoices.length === 0 && (
        <EmptyState title="No invoices yet" description="Generate invoices to start billing this lease." />
      )}

      {leaseInvoices.length > 0 && (
        <Table>
          <THead>
            <TH>Period</TH>
            <TH>Due</TH>
            <TH className="text-right">Amount</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {leaseInvoices.map((inv) => (
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

      {/* ── PDC cheques ──────────────────────────────────────────────── */}
      <div className="mt-10 mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Post-dated cheques</h2>
          <p className="mt-0.5 text-sm text-slate-600">PDCs scheduled against this lease.</p>
        </div>
        <Link to="/manager/cheques" className="text-sm font-medium text-brand-600 hover:underline">
          Manage cheques →
        </Link>
      </div>

      {cheques.isLoading && <PageLoader label="Loading cheques" />}
      {cheques.isError && <ErrorState onRetry={() => void cheques.refetch()} />}

      {cheques.data && leaseCheques.length === 0 && (
        <EmptyState title="No cheques on file" description="Add PDCs for this lease from the Cheques page." />
      )}

      {leaseCheques.length > 0 && (
        <Table>
          <THead>
            <TH>Cheque #</TH>
            <TH>Bank</TH>
            <TH>Due</TH>
            <TH className="text-right">Amount</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {leaseCheques.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-900">{c.cheque_number ?? "—"}</TD>
                <TD>{c.bank_name ?? "—"}</TD>
                <TD>{formatDate(c.due_date)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(c.amount, lease.currency)}</TD>
                <TD>
                  <Badge tone={pdcStatusTone[c.status]}>{pdcStatusLabel[c.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* ── Documents ────────────────────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
        <p className="mt-0.5 text-sm text-slate-600">The signed lease agreement and related files.</p>
      </div>
      {leaseId && org.data && <DocumentsPanel entityType="lease" entityId={leaseId} orgId={org.data.id} />}

      {renewing && <RenewLeaseModal open={renewing} onClose={() => setRenewing(false)} lease={lease} />}
      {terminating && (
        <ConfirmDialog
          open={terminating}
          title="Terminate lease"
          message={`End the lease for ${lease.tenant?.name ?? "this tenant"}? The unit will be marked vacant.`}
          confirmLabel="Terminate"
          destructive
          loading={terminate.isPending}
          onConfirm={() => void handleTerminate()}
          onClose={() => setTerminating(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={deleting}
          title="Delete lease"
          message={`Delete the lease for ${lease.tenant?.name ?? "this tenant"}? This also deletes its invoices and cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteLease.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
