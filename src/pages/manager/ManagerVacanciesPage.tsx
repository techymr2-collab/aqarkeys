import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVacancies, type VacantUnit } from "@/data/vacancies";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { BuildingIcon } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { unitStatusLabel } from "@/lib/labels";
import type { Tone } from "@/lib/labels";

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: VacantUnit["status"]): Tone {
  if (s === "vacant") return "rose";
  if (s === "under_maintenance") return "amber";
  return "brand";
}

function vacancyLabel(days: number): string {
  if (days < 0) return "Never leased";
  if (days === 0) return "Today";
  return `${days}d`;
}


// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerVacanciesPage() {
  const { data: units = [], isLoading, isError, refetch } = useVacancies();
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.propertyId) map.set(u.propertyId, u.propertyName);
    }
    return [...map.entries()].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [units]);

  const filtered = useMemo(
    () =>
      units.filter((u) => {
        if (propFilter !== "all" && u.propertyId !== propFilter) return false;
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        return true;
      }),
    [units, propFilter, statusFilter],
  );

  // Summary counts
  const { vacantCount, maintCount, reservedCount, avgDays } = useMemo(() => {
    let vacantCount = 0;
    let maintCount = 0;
    let reservedCount = 0;
    let daySum = 0;
    let dayCount = 0;
    for (const u of units) {
      if (u.status === "vacant") vacantCount++;
      else if (u.status === "under_maintenance") maintCount++;
      else reservedCount++;
      if (u.status === "vacant" && u.daysVacant >= 0) {
        daySum += u.daysVacant;
        dayCount++;
      }
    }
    return {
      vacantCount,
      maintCount,
      reservedCount,
      avgDays: dayCount > 0 ? Math.round(daySum / dayCount) : null,
    };
  }, [units]);

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-rose-700">Failed to load vacancy data.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-sm font-medium text-rose-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vacancy Tracking"
        subtitle="All non-occupied units, sorted by days vacant (longest first)."
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Vacant
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              vacantCount > 0 ? "text-rose-600" : "text-emerald-600",
            )}
          >
            {vacantCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">units</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Under Maintenance
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              maintCount > 0 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {maintCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">units</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Reserved
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              reservedCount > 0 ? "text-brand-600" : "text-slate-400",
            )}
          >
            {reservedCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">units</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Avg Days Vacant
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              avgDays == null
                ? "text-slate-400"
                : avgDays > 90
                  ? "text-rose-600"
                  : avgDays > 30
                    ? "text-amber-600"
                    : "text-emerald-600",
            )}
          >
            {avgDays == null ? "—" : `${avgDays}d`}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">vacant units only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          options={[
            { value: "all", label: "All Properties" },
            ...propertyOptions.map(([id, name]) => ({ value: id, label: name })),
          ]}
          value={propFilter}
          onChange={(e) => setPropFilter(e.target.value)}
        />

        <Select
          options={[
            { value: "all", label: "All statuses" },
            { value: "vacant", label: "Vacant only" },
            { value: "under_maintenance", label: "Under maintenance" },
            { value: "reserved", label: "Reserved" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />

        {filtered.length !== units.length && (
          <span className="text-sm text-slate-400">
            Showing {filtered.length} of {units.length}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          {units.length === 0 ? (
            <>
              <p className="text-lg font-semibold text-emerald-600">All units occupied</p>
              <p className="mt-1 text-sm text-slate-400">
                No vacant, under-maintenance, or reserved units found.
              </p>
            </>
          ) : (
            <p className="text-slate-500">No units match the current filters.</p>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Unit</TH>
                  <TH>Property</TH>
                  <TH>Status</TH>
                  <TH>Days Vacant</TH>
                  <TH>Last Tenant</TH>
                  <TH>Vacated On</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {filtered.map((u) => (
                  <tr key={u.unitId} className="transition-colors hover:bg-slate-50/70">
                    <TD className="font-semibold text-slate-800">{u.label}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <Link
                          to={`/manager/properties/${u.propertyId}`}
                          className="text-brand-600 hover:underline"
                        >
                          {u.propertyName}
                        </Link>
                        {u.propertyCity && (
                          <span className="text-xs text-slate-400">· {u.propertyCity}</span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={statusTone(u.status)}>
                        {unitStatusLabel[u.status]}
                      </Badge>
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          u.daysVacant < 0
                            ? "bg-slate-100 text-slate-500"
                            : u.daysVacant <= 30
                              ? "bg-emerald-50 text-emerald-700"
                              : u.daysVacant <= 90
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700",
                        )}
                      >
                        {vacancyLabel(u.daysVacant)}
                      </span>
                    </TD>
                    <TD className="text-slate-500">
                      {u.lastTenantName ?? <span className="text-slate-300 italic">None</span>}
                    </TD>
                    <TD className="text-slate-500">
                      {u.lastLeaseEndDate ? (
                        formatDate(u.lastLeaseEndDate)
                      ) : (
                        <span className="italic text-slate-300">Never leased</span>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actionable tip when vacancies are long */}
      {vacantCount > 0 && avgDays != null && avgDays > 60 && (
        <p className="mt-4 text-center text-sm text-amber-600">
          {vacantCount} unit{vacantCount > 1 ? "s have" : " has"} been vacant on average{" "}
          {avgDays} days —{" "}
          <Link to="/manager/leases" className="font-semibold underline">
            create a new lease
          </Link>{" "}
          to reduce vacancy loss.
        </p>
      )}
    </div>
  );
}
