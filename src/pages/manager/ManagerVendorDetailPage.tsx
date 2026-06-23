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
import { VendorFormModal } from "@/features/vendors/VendorFormModal";
import { ToolboxIcon, ChartIcon, BanknoteIcon, MailIcon } from "@/components/icons";
import { useVendors, useDeleteVendor } from "@/data/vendors";
import { useMaintenance } from "@/data/maintenance";
import { formatDate, formatMoney } from "@/lib/format";
import { maintenanceCategoryLabel, maintenanceStatusLabel, maintenanceStatusTone } from "@/lib/labels";
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

export function ManagerVendorDetailPage() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const vendors = useVendors();
  const maintenance = useMaintenance();
  const deleteVendor = useDeleteVendor();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const vendor = vendors.data?.find((v) => v.id === vendorId);
  const jobs = useMemo(
    () => (maintenance.data ?? []).filter((m) => m.vendor_id === vendorId),
    [maintenance.data, vendorId],
  );

  const totalSpend = jobs.reduce((s, j) => s + (j.cost ?? 0), 0);
  const currency = jobs[0]?.unit?.property?.currency ?? "AED";
  const completedJobs = jobs.filter((j) => j.status === "resolved").length;

  async function handleDelete() {
    if (!vendorId) return;
    try {
      await deleteVendor.mutateAsync(vendorId);
      pushToast("Vendor deleted", "success");
      navigate("/manager/vendors");
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete this vendor."), "error");
      setDeleting(false);
    }
  }

  if (vendors.isLoading) return <PageLoader label="Loading vendor" />;
  if (vendors.isError) return <ErrorState onRetry={() => void vendors.refetch()} />;
  if (!vendor) return <ErrorState message="Vendor not found." onRetry={() => navigate("/manager/vendors")} />;

  return (
    <div>
      <PageHeader
        back={{ label: "Vendors", to: "/manager/vendors" }}
        title={vendor.name}
        subtitle={vendor.company ?? "Independent contractor"}
        action={
          <div className="flex gap-2">
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
        <InfoCard icon={<ToolboxIcon className="h-5 w-5" />} iconClass="bg-brand-50 text-brand-600" label="Trade">
          <p className="mt-1 text-lg font-semibold text-slate-900">{maintenanceCategoryLabel[vendor.trade]}</p>
          <p className="mt-0.5 text-xs text-slate-500">{vendor.is_active ? "Active" : "Inactive"}</p>
        </InfoCard>

        <InfoCard icon={<ChartIcon className="h-5 w-5" />} iconClass="bg-emerald-50 text-emerald-600" label="Work orders">
          <p className="mt-1 text-lg font-semibold text-slate-900">{vendor.job_count}</p>
          <p className="mt-0.5 text-xs text-slate-500">{completedJobs} completed</p>
        </InfoCard>

        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-amber-50 text-amber-600" label="Total spend">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(totalSpend, currency)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {vendor.hourly_rate != null ? `${formatMoney(vendor.hourly_rate, "AED")}/hr` : "No rate on file"}
          </p>
        </InfoCard>

        <InfoCard icon={<MailIcon className="h-5 w-5" />} iconClass="bg-slate-100 text-slate-600" label="Contact">
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{vendor.phone ?? vendor.email ?? "—"}</p>
          {vendor.rating != null && (
            <p className="mt-0.5 text-xs font-medium text-amber-500" aria-label={`${vendor.rating} out of 5`}>
              {"★".repeat(vendor.rating)}
              <span className="text-slate-300">{"★".repeat(5 - vendor.rating)}</span>
            </p>
          )}
        </InfoCard>
      </div>

      {/* ── Job history ──────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Job history</h2>
        <p className="mt-0.5 text-sm text-slate-600">Maintenance work orders assigned to this vendor.</p>
      </div>

      {maintenance.isLoading && <PageLoader label="Loading jobs" />}
      {maintenance.isError && <ErrorState onRetry={() => void maintenance.refetch()} />}

      {maintenance.data && jobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          description="Assign this vendor to a maintenance request to see their job history here."
        />
      )}

      {jobs.length > 0 && (
        <Table>
          <THead>
            <TH>Job</TH>
            <TH>Unit</TH>
            <TH>Reported</TH>
            <TH className="text-right">Cost</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {jobs.map((j) => (
              <TR key={j.id} onClick={() => navigate("/manager/maintenance")}>
                <TD className="font-medium text-slate-900">{j.title}</TD>
                <TD>
                  {j.unit?.label ?? "—"}
                  <div className="text-xs text-slate-500">{j.unit?.property?.name ?? ""}</div>
                </TD>
                <TD>{formatDate(j.created_at.slice(0, 10))}</TD>
                <TD className="text-right tabular-nums">
                  {j.cost != null ? formatMoney(j.cost, j.unit?.property?.currency ?? "AED") : "—"}
                </TD>
                <TD>
                  <Badge tone={maintenanceStatusTone[j.status]}>{maintenanceStatusLabel[j.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {editing && <VendorFormModal open={editing} onClose={() => setEditing(false)} vendor={vendor} />}
      {deleting && (
        <ConfirmDialog
          open={deleting}
          title="Delete vendor"
          message={`Delete ${vendor.name}? Existing work orders will keep their record but lose the link to this vendor.`}
          confirmLabel="Delete"
          destructive
          loading={deleteVendor.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
