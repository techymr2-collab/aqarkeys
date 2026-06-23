import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VendorFormModal } from "@/features/vendors/VendorFormModal";
import { useVendors, useDeleteVendor, type VendorWithCount } from "@/data/vendors";
import { maintenanceCategoryLabel } from "@/lib/labels";
import { maintenanceCategoryOptions } from "@/lib/options";
import { formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { Tone } from "@/lib/labels";
import type { MaintenanceCategory } from "@/lib/database.types";

const tradeTone: Record<MaintenanceCategory, Tone> = {
  plumbing: "blue",
  electrical: "amber",
  hvac: "brand",
  appliance: "slate",
  structural: "rose",
  general: "slate",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const tradeFilterOptions = [
  { value: "all", label: "All trades" },
  ...maintenanceCategoryOptions,
];
const statusFilterOptions = [
  { value: "all", label: "Active & inactive" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
];

export function ManagerVendorsPage() {
  const navigate = useNavigate();
  const vendors = useVendors();
  const deleteVendor = useDeleteVendor();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<VendorWithCount | null>(null);
  const [deleting, setDeleting] = useState<VendorWithCount | null>(null);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState<"all" | MaintenanceCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { filtered, activeCount } = useMemo(() => {
    if (!vendors.data) return { filtered: [], activeCount: 0 };
    const q = search.trim().toLowerCase();
    const filtered = vendors.data.filter((v) => {
      if (tradeFilter !== "all" && v.trade !== tradeFilter) return false;
      if (statusFilter === "active" && !v.is_active) return false;
      if (statusFilter === "inactive" && v.is_active) return false;
      if (!q) return true;
      return `${v.name} ${v.company ?? ""} ${v.email ?? ""} ${v.phone ?? ""}`
        .toLowerCase()
        .includes(q);
    });
    const activeCount = vendors.data.filter((v) => v.is_active).length;
    return { filtered, activeCount };
  }, [vendors.data, search, tradeFilter, statusFilter]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteVendor.mutateAsync(deleting.id);
      pushToast("Vendor deleted", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete this vendor."), "error");
    }
  }

  const hasData = !!vendors.data && vendors.data.length > 0;

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Your directory of contractors and tradespeople. Assign them to work orders."
        action={<Button onClick={() => setAdding(true)}>Add vendor</Button>}
      />

      {vendors.isLoading && <TableSkeleton rows={3} cols={3} />}
      {vendors.isError && <ErrorState onRetry={() => void vendors.refetch()} />}

      {vendors.data && vendors.data.length === 0 && (
        <EmptyState
          title="No vendors yet"
          description="Add the plumbers, electricians and handymen you work with, then assign them to maintenance jobs."
          action={<Button onClick={() => setAdding(true)}>Add vendor</Button>}
        />
      )}

      {hasData && (
        <>
          {/* Summary bar */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{vendors.data!.length}</span>{" "}
              {vendors.data!.length === 1 ? "vendor" : "vendors"}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              <span className="font-semibold text-emerald-700">{activeCount}</span> active
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, company, contact" />
            <Select
              options={tradeFilterOptions}
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value as "all" | MaintenanceCategory)}
              className="w-44"
            />
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="w-44"
            />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {vendors.data!.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search or filter." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/manager/vendors/${v.id}`)}
                  className="glass-card flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-700">
                      {initials(v.name) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-900">{v.name}</p>
                      <p className="truncate text-sm text-slate-500">{v.company ?? "Independent"}</p>
                    </div>
                    {!v.is_active && (
                      <span className="shrink-0 text-xs font-medium text-slate-400">Inactive</span>
                    )}
                  </div>

                  {/* Trade */}
                  <div className="mt-3">
                    <Badge tone={tradeTone[v.trade]}>{maintenanceCategoryLabel[v.trade]}</Badge>
                  </div>

                  {/* Contact */}
                  <div className="mt-4 space-y-1 text-sm">
                    {v.phone && (
                      <p className="truncate text-slate-700">
                        <span className="text-slate-400">Phone </span>
                        {v.phone}
                      </p>
                    )}
                    {v.email && (
                      <p className="truncate text-slate-700">
                        <span className="text-slate-400">Email </span>
                        {v.email}
                      </p>
                    )}
                    {!v.phone && !v.email && (
                      <p className="text-slate-400">No contact details</p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-900/[0.06] pt-4">
                    <div>
                      <p className="text-xs text-slate-400">Work orders</p>
                      <p className="text-sm font-semibold text-slate-900">{v.job_count}</p>
                    </div>
                    {v.hourly_rate != null && (
                      <div>
                        <p className="text-xs text-slate-400">Rate</p>
                        <p className="text-sm font-medium text-slate-700">
                          {formatMoney(v.hourly_rate, "AED")}/hr
                        </p>
                      </div>
                    )}
                    {v.rating != null && (
                      <div className="ml-auto text-right">
                        <p className="text-xs text-slate-400">Rating</p>
                        <p className="text-sm font-medium text-amber-500" aria-label={`${v.rating} out of 5`}>
                          {"★".repeat(v.rating)}
                          <span className="text-slate-300">{"★".repeat(5 - v.rating)}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="mt-4 flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(v)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <VendorFormModal open={adding} onClose={() => setAdding(false)} />
      {editing && (
        <VendorFormModal open={!!editing} onClose={() => setEditing(null)} vendor={editing} />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete vendor"
          message={`Delete ${deleting.name}? Existing work orders will keep their record but lose the link to this vendor.`}
          confirmLabel="Delete"
          destructive
          loading={deleteVendor.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
