import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { MaintenanceFormModal } from "@/features/maintenance/MaintenanceFormModal";
import { MaintenanceDetailModal } from "@/features/maintenance/MaintenanceDetailModal";
import { useMaintenance, type MaintenanceWithRelations } from "@/data/maintenance";
import { useUnitOptions } from "@/data/units";
import { formatDate, formatMoney } from "@/lib/format";
import {
  maintenancePriorityLabel,
  maintenancePriorityTone,
  maintenanceStatusLabel,
  maintenanceStatusTone,
} from "@/lib/labels";
import { maintenanceStatusOptions } from "@/lib/options";
import type { MaintenanceStatus } from "@/lib/database.types";

const PAGE_SIZE = 20;
const statusFilterOptions = [{ value: "all", label: "All statuses" }, ...maintenanceStatusOptions];

export function ManagerMaintenancePage() {
  const { data, isLoading, isError, refetch } = useMaintenance();
  const { data: units = [] } = useUnitOptions();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<MaintenanceWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MaintenanceStatus>("all");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.property?.name ?? "Unknown"} · ${u.label}`,
  }));

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${r.title} ${r.unit?.label ?? ""} ${r.unit?.property?.name ?? ""} ${
        r.assignee ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter]);

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Maintenance"
        subtitle="Work orders across your portfolio. Resolve with a cost to log it to the owner."
        action={<Button onClick={() => setCreating(true)}>New work order</Button>}
      />

      {isLoading && <TableSkeleton rows={8} cols={5} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No work orders yet"
          description="Log a maintenance issue, or wait for a tenant to report one."
          action={<Button onClick={() => setCreating(true)}>New work order</Button>}
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search title, unit, assignee" />
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | MaintenanceStatus)}
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
                <TH>Issue</TH>
                <TH>Unit</TH>
                <TH>Priority</TH>
                <TH>Status</TH>
                <TH className="text-right">Cost</TH>
              </THead>
              <TBody>
                {paginate(filtered, page, PAGE_SIZE).map((r) => (
                  <TR key={r.id} onClick={() => setViewing(r)}>
                    <TD className="font-medium text-slate-900">
                      <div>{r.title}</div>
                      <div className="text-xs text-slate-500">{formatDate(r.created_at.slice(0, 10))}</div>
                      {r.reporter && (
                        <div className="text-xs text-brand-600">by {r.reporter.full_name}</div>
                      )}
                    </TD>
                    <TD>
                      <div>{r.unit?.label ?? "—"}</div>
                      <div className="text-xs text-slate-500">{r.unit?.property?.name ?? ""}</div>
                    </TD>
                    <TD>
                      <Badge tone={maintenancePriorityTone[r.priority]}>
                        {maintenancePriorityLabel[r.priority]}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={maintenanceStatusTone[r.status]}>
                        {maintenanceStatusLabel[r.status]}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {r.cost != null && r.unit?.property
                        ? formatMoney(r.cost, r.unit.property.currency)
                        : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {creating && (
        <MaintenanceFormModal open={creating} onClose={() => setCreating(false)} units={unitOptions} />
      )}
      {viewing && (
        <MaintenanceDetailModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          request={viewing}
        />
      )}
    </div>
  );
}
