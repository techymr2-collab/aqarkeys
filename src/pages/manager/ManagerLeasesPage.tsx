import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { RefreshCwIcon, XCircleIcon, TrashIcon, FileTextIcon } from "@/components/icons";
import { LeaseDocumentsModal } from "@/features/documents/LeaseDocumentsModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { LeaseFormModal } from "@/features/leases/LeaseFormModal";
import { RenewLeaseModal } from "@/features/leases/RenewLeaseModal";
import {
  useLeases,
  useTerminateLease,
  useDeleteLease,
  type LeaseWithRelations,
} from "@/data/leases";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { frequencyLabel, leaseStatusLabel, leaseStatusTone } from "@/lib/labels";
import { leaseStatusOptions } from "@/lib/options";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { LeaseStatus } from "@/lib/database.types";

const PAGE_SIZE = 20;
const statusFilterOptions = [{ value: "all", label: "All statuses" }, ...leaseStatusOptions];

export function ManagerLeasesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useLeases();
  const terminate = useTerminateLease();
  const deleteLease = useDeleteLease();
  const [adding, setAdding] = useState(false);
  const [renewing, setRenewing] = useState<LeaseWithRelations | null>(null);
  const [terminating, setTerminating] = useState<LeaseWithRelations | null>(null);
  const [deleting, setDeleting] = useState<LeaseWithRelations | null>(null);
  const [documenting, setDocumenting] = useState<LeaseWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeaseStatus>("all");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${l.tenant?.name ?? ""} ${l.unit?.label ?? ""} ${
        l.unit?.property?.name ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter]);

  async function handleTerminate() {
    if (!terminating?.unit) return;
    try {
      await terminate.mutateAsync({ id: terminating.id, unitId: terminating.unit.id });
      pushToast("Lease terminated. Unit is now vacant.", "success");
      setTerminating(null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not terminate the lease."), "error");
    }
  }

  async function handleDelete() {
    if (!deleting?.unit) return;
    try {
      await deleteLease.mutateAsync({
        id: deleting.id,
        unitId: deleting.unit.id,
        wasActive: deleting.status === "active",
      });
      pushToast("Lease deleted.", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the lease."), "error");
    }
  }

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Leases"
        subtitle="Who is renting what, and until when. We warn you 60 days before expiry."
        action={<Button onClick={() => setAdding(true)}>Create lease</Button>}
      />

      {isLoading && <TableSkeleton rows={8} cols={6} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No leases yet"
          description="Create a lease to assign a tenant to a unit and start rent."
          action={<Button onClick={() => setAdding(true)}>Create lease</Button>}
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search tenant, unit, property" />
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | LeaseStatus)}
              className="w-44"
            />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {data.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search or filter." />
          ) : (
            <Table
              className="h-full"
              footer={
                <Pagination
                  page={page}
                  pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPage={setPage}
                />
              }
            >
              <THead>
                <TH>Tenant</TH>
                <TH>Unit</TH>
                <TH>Term</TH>
                <TH className="text-right">Rent</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {paginate(filtered, page, PAGE_SIZE).map((l) => {
                  const days = daysUntil(l.end_date);
                  const expiringSoon = l.status === "active" && days >= 0 && days <= 60;
                  const canTerminate = l.status === "active" || l.status === "upcoming";
                  const canRenew = l.status === "active" || l.status === "expired";
                  return (
                    <TR key={l.id} onClick={() => navigate(`/manager/leases/${l.id}`)}>
                      <TD className="font-medium text-slate-900">{l.tenant?.name ?? "—"}</TD>
                      <TD>
                        <div>{l.unit?.label ?? "—"}</div>
                        <div className="text-xs text-slate-500">{l.unit?.property?.name ?? ""}</div>
                      </TD>
                      <TD>
                        <p className="whitespace-nowrap">
                          {formatDate(l.start_date)} – {formatDate(l.end_date)}
                        </p>
                        {expiringSoon && (
                          <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                            Expires in {days} days
                          </p>
                        )}
                      </TD>
                      <TD className="text-right">
                        <div className="whitespace-nowrap">{formatMoney(l.rent_amount, l.currency)}</div>
                        <div className="text-xs text-slate-500">{frequencyLabel[l.frequency]}</div>
                      </TD>
                      <TD>
                        <Badge tone={leaseStatusTone[l.status]}>{leaseStatusLabel[l.status]}</Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {canRenew && (
                            <ActionIcon label="Renew" onClick={(e) => { e.stopPropagation(); setRenewing(l); }}>
                              <RefreshCwIcon className="h-4 w-4" />
                            </ActionIcon>
                          )}
                          {canTerminate && (
                            <ActionIcon label="Terminate" danger onClick={(e) => { e.stopPropagation(); setTerminating(l); }}>
                              <XCircleIcon className="h-4 w-4" />
                            </ActionIcon>
                          )}
                          <ActionIcon label="Documents" onClick={(e) => { e.stopPropagation(); setDocumenting(l); }}>
                            <FileTextIcon className="h-4 w-4" />
                          </ActionIcon>
                          <ActionIcon label="Delete" danger onClick={(e) => { e.stopPropagation(); setDeleting(l); }}>
                            <TrashIcon className="h-4 w-4" />
                          </ActionIcon>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {documenting && (
        <LeaseDocumentsModal
          open={!!documenting}
          onClose={() => setDocumenting(null)}
          lease={documenting}
        />
      )}
      <LeaseFormModal open={adding} onClose={() => setAdding(false)} />
      {renewing && (
        <RenewLeaseModal open={!!renewing} onClose={() => setRenewing(null)} lease={renewing} />
      )}
      {terminating && (
        <ConfirmDialog
          open={!!terminating}
          title="Terminate lease"
          message={`End the lease for ${terminating.tenant?.name ?? "this tenant"}? The unit will be marked vacant.`}
          confirmLabel="Terminate"
          destructive
          loading={terminate.isPending}
          onConfirm={() => void handleTerminate()}
          onClose={() => setTerminating(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete lease"
          message={`Delete the lease for ${deleting.tenant?.name ?? "this tenant"}? This also deletes its invoices and cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteLease.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
