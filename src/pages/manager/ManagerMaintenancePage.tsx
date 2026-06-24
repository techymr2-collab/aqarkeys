import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { PencilIcon, TrashIcon, RefreshCwIcon } from "@/components/icons";
import { MaintenanceFormModal } from "@/features/maintenance/MaintenanceFormModal";
import { MaintenanceDetailModal } from "@/features/maintenance/MaintenanceDetailModal";
import { ScheduleFormModal } from "@/features/maintenance/ScheduleFormModal";
import { useMaintenance, isOverdue, type MaintenanceWithRelations } from "@/data/maintenance";
import {
  useMaintenanceSchedules,
  useSetScheduleActive,
  useDeleteSchedule,
  useGenerateDueMaintenance,
  type ScheduleWithUnit,
} from "@/data/maintenanceSchedules";
import { useUnitOptions } from "@/data/units";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
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

const FREQUENCY_TEXT: Record<number, string> = {
  1: "Monthly",
  3: "Every 3 months",
  6: "Every 6 months",
  12: "Yearly",
};

function WorkOrdersTab({ onCreate }: { onCreate: () => void }) {
  const { data, isLoading, isError, refetch } = useMaintenance();
  const [viewing, setViewing] = useState<MaintenanceWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MaintenanceStatus>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, statusFilter, overdueOnly]);

  const overdueCount = (data ?? []).filter(isOverdue).length;

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (overdueOnly && !isOverdue(r)) return false;
      if (!q) return true;
      const hay = `${r.title} ${r.unit?.label ?? ""} ${r.unit?.property?.name ?? ""} ${
        r.assignee ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter, overdueOnly]);

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4">
      {isLoading && <TableSkeleton rows={8} cols={5} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No work orders yet"
          description="Log a maintenance issue, or wait for a tenant to report one."
          action={<Button onClick={onCreate}>New work order</Button>}
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search title, unit, assignee" />
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | MaintenanceStatus)}
              className="w-44"
            />
            <button
              type="button"
              onClick={() => setOverdueOnly((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                overdueOnly ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              {overdueCount} overdue
            </button>
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
                <TH>Due</TH>
                <TH>Status</TH>
                <TH className="text-right">Cost</TH>
              </THead>
              <TBody>
                {paginate(filtered, page, PAGE_SIZE).map((r) => {
                  const overdue = isOverdue(r);
                  return (
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
                        <span className={overdue ? "font-semibold text-rose-600" : "text-slate-600"}>
                          {r.due_date ? formatDate(r.due_date) : "—"}
                        </span>
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
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {viewing && (
        <MaintenanceDetailModal open={!!viewing} onClose={() => setViewing(null)} request={viewing} />
      )}
    </div>
  );
}

function SchedulesTab() {
  const { data, isLoading, isError, refetch } = useMaintenanceSchedules();
  const { data: units = [] } = useUnitOptions();
  const setActive = useSetScheduleActive();
  const deleteSchedule = useDeleteSchedule();
  const generateDue = useGenerateDueMaintenance();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ScheduleWithUnit | null>(null);
  const [deleting, setDeleting] = useState<ScheduleWithUnit | null>(null);

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.property?.name ?? "Unknown"} · ${u.label}`,
  }));

  const dueCount = (data ?? []).filter((s) => s.active && s.next_run_date <= todayISO()).length;

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteSchedule.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      // The mutation's onError already pushed a toast; leave the dialog
      // open so the manager can retry or cancel.
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Preventive jobs that repeat on a schedule, like quarterly AC servicing.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => generateDue.mutate(data ?? [])}
            loading={generateDue.isPending}
            disabled={dueCount === 0}
          >
            <RefreshCwIcon className="mr-1.5 h-4 w-4" />
            Generate due ({dueCount})
          </Button>
          <Button onClick={() => setCreating(true)}>New schedule</Button>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={4} cols={5} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No recurring jobs yet"
          description="Schedule preventive maintenance so it's never missed."
          action={<Button onClick={() => setCreating(true)}>New schedule</Button>}
        />
      )}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TH>Job</TH>
            <TH>Unit</TH>
            <TH>Repeats</TH>
            <TH>Next due</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {data.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium text-slate-900">{s.title}</TD>
                <TD>
                  <div>{s.unit?.label ?? "—"}</div>
                  <div className="text-xs text-slate-500">{s.unit?.property?.name ?? ""}</div>
                </TD>
                <TD>{FREQUENCY_TEXT[s.frequency_months] ?? `Every ${s.frequency_months} months`}</TD>
                <TD>
                  <span className={s.active && s.next_run_date <= todayISO() ? "font-semibold text-amber-600" : ""}>
                    {formatDate(s.next_run_date)}
                  </span>
                </TD>
                <TD>
                  <button
                    type="button"
                    onClick={() => setActive.mutate({ id: s.id, active: !s.active })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.active ? "Active" : "Paused"}
                  </button>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <ActionIcon label="Edit" onClick={() => setEditing(s)}>
                      <PencilIcon className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Delete" danger onClick={() => setDeleting(s)}>
                      <TrashIcon className="h-4 w-4" />
                    </ActionIcon>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {creating && (
        <ScheduleFormModal open={creating} onClose={() => setCreating(false)} units={unitOptions} />
      )}
      {editing && (
        <ScheduleFormModal
          open={!!editing}
          onClose={() => setEditing(null)}
          units={unitOptions}
          schedule={editing}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete schedule"
          message={`Stop "${deleting.title}" from recurring? Past jobs it already created are kept.`}
          confirmLabel="Delete"
          destructive
          loading={deleteSchedule.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export function ManagerMaintenancePage() {
  const [tab, setTab] = useState<"orders" | "schedules">("orders");
  const { data: units = [] } = useUnitOptions();
  const [creating, setCreating] = useState(false);

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.property?.name ?? "Unknown"} · ${u.label}`,
  }));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Maintenance"
        subtitle="Work orders across your portfolio. Resolve with a cost to log it to the owner."
        action={tab === "orders" && <Button onClick={() => setCreating(true)}>New work order</Button>}
      />

      <Tabs
        tabs={[
          { value: "orders", label: "Work orders" },
          { value: "schedules", label: "Recurring jobs" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as "orders" | "schedules")}
      />

      {tab === "orders" ? <WorkOrdersTab onCreate={() => setCreating(true)} /> : <SchedulesTab />}

      {creating && (
        <MaintenanceFormModal open={creating} onClose={() => setCreating(false)} units={unitOptions} />
      )}
    </div>
  );
}
