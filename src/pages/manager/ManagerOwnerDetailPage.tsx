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
import { OwnerFormModal } from "@/features/owners/OwnerFormModal";
import { InviteModal } from "@/features/invites/InviteModal";
import { UserIcon, BuildingIcon, BanknoteIcon, ChartIcon } from "@/components/icons";
import { useOwners, useDeleteOwner } from "@/data/owners";
import { useProperties } from "@/data/properties";
import { usePayouts } from "@/data/payouts";
import { useInvitations } from "@/data/invitations";
import { formatDate, formatMoney } from "@/lib/format";
import { payoutStatusLabel, payoutStatusTone } from "@/lib/labels";
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

export function ManagerOwnerDetailPage() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const owners = useOwners();
  const properties = useProperties();
  const payouts = usePayouts();
  const invitations = useInvitations();
  const deleteOwner = useDeleteOwner();

  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const owner = owners.data?.find((o) => o.id === ownerId);
  const ownerProperties = useMemo(
    () => (properties.data ?? []).filter((p) => p.owner_id === ownerId),
    [properties.data, ownerId],
  );
  const ownerPayouts = useMemo(
    () => (payouts.data ?? []).filter((p) => p.owner?.id === ownerId),
    [payouts.data, ownerId],
  );
  const hasAccess = !!owner?.profile_id;
  const pendingInvite = (invitations.data ?? []).some(
    (i) => i.status === "pending" && i.owner_id === ownerId,
  );

  const totalUnits = ownerProperties.reduce((s, p) => s + p.unit_count, 0);
  const occupiedUnits = ownerProperties.reduce((s, p) => s + p.occupied_count, 0);
  const occupancy = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const portfolioCurrency = ownerProperties[0]?.currency ?? "AED";
  const totalPaidOut = ownerPayouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.net_amount, 0);

  async function handleDelete() {
    if (!ownerId) return;
    try {
      await deleteOwner.mutateAsync(ownerId);
      pushToast("Owner deleted", "success");
      navigate("/manager/owners");
    } catch (err) {
      pushToast(friendlyError(err, "This owner still has properties and cannot be deleted."), "error");
      setDeleting(false);
    }
  }

  if (owners.isLoading) return <PageLoader label="Loading owner" />;
  if (owners.isError) return <ErrorState onRetry={() => void owners.refetch()} />;
  if (!owner) return <ErrorState message="Owner not found." onRetry={() => navigate("/manager/owners")} />;

  return (
    <div>
      <PageHeader
        back={{ label: "Owners", to: "/manager/owners" }}
        title={owner.name}
        subtitle={owner.email ?? owner.phone ?? "No contact details"}
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
        <InfoCard icon={<BuildingIcon className="h-5 w-5" />} iconClass="bg-brand-50 text-brand-600" label="Properties">
          <p className="mt-1 text-lg font-semibold text-slate-900">{ownerProperties.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">{totalUnits} units total</p>
        </InfoCard>

        <InfoCard icon={<ChartIcon className="h-5 w-5" />} iconClass="bg-emerald-50 text-emerald-600" label="Occupancy">
          <p className="mt-1 text-lg font-semibold text-slate-900">{occupancy}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${occupancy}%` }}
              role="progressbar"
              aria-valuenow={occupancy}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{occupiedUnits} of {totalUnits} units</p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-amber-50 text-amber-600" label="Paid out to date">
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMoney(totalPaidOut, portfolioCurrency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{ownerPayouts.length} payout records</p>
        </InfoCard>

        <InfoCard icon={<UserIcon className="h-5 w-5" />} iconClass="bg-slate-100 text-slate-600" label="Portal access">
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {hasAccess ? "Active" : pendingInvite ? "Invited" : "Not invited"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{owner.phone ?? "—"}</p>
        </InfoCard>
      </div>

      {/* ── Properties ───────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Properties</h2>
        <p className="mt-0.5 text-sm text-slate-600">Everything in this owner's portfolio.</p>
      </div>

      {properties.isLoading && <PageLoader label="Loading properties" />}
      {properties.isError && <ErrorState onRetry={() => void properties.refetch()} />}

      {properties.data && ownerProperties.length === 0 && (
        <EmptyState title="No properties yet" description="Assign a property to this owner to see it here." />
      )}

      {ownerProperties.length > 0 && (
        <Table>
          <THead>
            <TH>Property</TH>
            <TH>City</TH>
            <TH>Units</TH>
            <TH className="text-right">Occupancy</TH>
            <TH className="text-right">Mgmt fee</TH>
          </THead>
          <TBody>
            {ownerProperties.map((p) => {
              const occ = p.unit_count ? Math.round((p.occupied_count / p.unit_count) * 100) : 0;
              return (
                <TR key={p.id} onClick={() => navigate(`/manager/properties/${p.id}`)}>
                  <TD className="font-medium text-slate-900">{p.name}</TD>
                  <TD>{p.city}</TD>
                  <TD>{p.unit_count}</TD>
                  <TD className="text-right tabular-nums">{occ}%</TD>
                  <TD className="text-right tabular-nums">{p.management_fee_percent}%</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      {/* ── Payouts ──────────────────────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Payout history</h2>
        <p className="mt-0.5 text-sm text-slate-600">Monthly net payouts generated for this owner.</p>
      </div>

      {payouts.isLoading && <PageLoader label="Loading payouts" />}
      {payouts.isError && <ErrorState onRetry={() => void payouts.refetch()} />}

      {payouts.data && ownerPayouts.length === 0 && (
        <EmptyState title="No payouts yet" description="Payouts generated for this owner will appear here." />
      )}

      {ownerPayouts.length > 0 && (
        <Table>
          <THead>
            <TH>Period</TH>
            <TH>Property</TH>
            <TH className="text-right">Net amount</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {ownerPayouts.map((p) => (
              <TR key={p.id}>
                <TD>{formatDate(p.period_start)} – {formatDate(p.period_end)}</TD>
                <TD>{p.property?.name ?? "—"}</TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(p.net_amount, p.property?.currency ?? "AED")}
                </TD>
                <TD>
                  <Badge tone={payoutStatusTone[p.status]}>{payoutStatusLabel[p.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {editing && <OwnerFormModal open={editing} onClose={() => setEditing(false)} owner={owner} />}
      {inviting && (
        <InviteModal
          open={inviting}
          onClose={() => setInviting(false)}
          role="owner"
          subjectName={owner.name}
          defaultEmail={owner.email ?? ""}
          ownerId={owner.id}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={deleting}
          title="Delete owner"
          message={`Delete ${owner.name}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteOwner.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
