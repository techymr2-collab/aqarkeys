import { Fragment, useMemo, useState } from "react";
import { usePdcCheques, useUpdateChequeStatus, useDeleteCheque } from "@/data/cheques";
import { ChequeFormModal } from "@/features/cheques/ChequeFormModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { ChequeIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatMoney, formatDate, todayISO } from "@/lib/format";
import { pdcStatusLabel, pdcStatusTone } from "@/lib/labels";
import { pdcStatusOptions } from "@/lib/options";
import { Select } from "@/components/ui/Select";
import type { PdcStatus } from "@/lib/database.types";
import type { PdcChequeRow } from "@/data/cheques";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeekFromNow(days: number): string {
  const d = new Date(todayISO());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueDateTone(due: string, status: PdcStatus): "green" | "amber" | "rose" | "slate" {
  if (status !== "pending") return "slate";
  const today = todayISO();
  if (due < today) return "rose";
  if (due <= isoWeekFromNow(7)) return "amber";
  return "green";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerChequesPage() {
  const { data: cheques = [], isLoading, isError, refetch } = usePdcCheques();
  const updateStatus = useUpdateChequeStatus();
  const deleteCheque = useDeleteCheque();

  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PdcStatus | "all">("all");
  const [propFilter, setPropFilter] = useState("all");

  // Property options for filter
  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cheques) {
      const prop = c.lease?.unit?.property;
      if (prop) map.set(prop.id, prop.name);
    }
    return [...map.entries()].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [cheques]);

  const filtered = useMemo(() => {
    return cheques.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (propFilter !== "all" && c.lease?.unit?.property?.id !== propFilter) return false;
      return true;
    });
  }, [cheques, statusFilter, propFilter]);

  // KPI calculations
  const today = todayISO();
  const weekEnd = isoWeekFromNow(7);

  const kpi = useMemo(() => {
    let pending = 0;
    let dueThisWeek = 0;
    let overdue = 0;
    let bounced = 0;
    for (const c of cheques) {
      if (c.status === "pending") {
        pending++;
        if (c.due_date < today) overdue++;
        else if (c.due_date <= weekEnd) dueThisWeek++;
      }
      if (c.status === "bounced") bounced++;
    }
    return { pending, dueThisWeek, overdue, bounced };
  }, [cheques, today, weekEnd]);

  function markDeposited(c: PdcChequeRow) {
    void updateStatus.mutateAsync({ id: c.id, status: "deposited", deposited_date: today });
  }

  function markCleared(c: PdcChequeRow) {
    void updateStatus.mutateAsync({ id: c.id, status: "cleared" });
  }

  function markBounced(c: PdcChequeRow) {
    void updateStatus.mutateAsync({ id: c.id, status: "bounced" });
  }

  function remove(c: PdcChequeRow) {
    if (!window.confirm("Remove this cheque?")) return;
    void deleteCheque.mutateAsync(c.id);
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-rose-700">Failed to load cheques.</p>
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
        title="PDC Cheques"
        subtitle="Post-dated cheques across all leases, sorted by due date."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <ChequeIcon className="mr-1.5 h-4 w-4" />
            Add cheques
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pending</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.pending > 0 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {kpi.pending}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">awaiting deposit</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Due This Week
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.dueThisWeek > 0 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {kpi.dueThisWeek}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">cheques</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overdue</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.overdue > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {kpi.overdue}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">past due date</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Bounced</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.bounced > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {kpi.bounced}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">this period</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          options={[{ value: "all", label: "All statuses" }, ...pdcStatusOptions]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PdcStatus | "all")}
        />

        <Select
          options={[
            { value: "all", label: "All properties" },
            ...propertyOptions.map(([id, name]) => ({ value: id, label: name })),
          ]}
          value={propFilter}
          onChange={(e) => setPropFilter(e.target.value)}
        />

        {filtered.length !== cheques.length && (
          <span className="text-sm text-slate-400">
            Showing {filtered.length} of {cheques.length}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          {cheques.length === 0 ? (
            <>
              <ChequeIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-lg font-semibold text-slate-600">No cheques yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Add post-dated cheques from a lease to start tracking payments.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  Add cheques
                </Button>
              </div>
            </>
          ) : (
            <p className="text-slate-500">No cheques match the current filters.</p>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Cheque #</TH>
                  <TH>Tenant</TH>
                  <TH>Property / Unit</TH>
                  <TH>Amount</TH>
                  <TH>Due Date</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {filtered.map((c) => {
                  const tone = dueDateTone(c.due_date, c.status);
                  const tenant = c.lease?.tenant?.name ?? "—";
                  const unit = c.lease?.unit?.label ?? "—";
                  const prop = c.lease?.unit?.property?.name ?? "—";
                  return (
                    <Fragment key={c.id}>
                      <tr className="transition-colors hover:bg-slate-50/70">
                        <TD className="font-mono text-slate-600">
                          {c.cheque_number ?? (
                            <span className="italic text-slate-300">—</span>
                          )}
                        </TD>
                        <TD className="font-medium text-slate-800">{tenant}</TD>
                        <TD className="text-slate-500">
                          {prop}
                          <span className="mx-1 text-slate-300">·</span>
                          {unit}
                          {c.bank_name && (
                            <span className="ml-2 text-xs text-slate-400">
                              ({c.bank_name})
                            </span>
                          )}
                        </TD>
                        <TD className="font-semibold text-slate-800">
                          {formatMoney(c.amount, "AED")}
                        </TD>
                        <TD>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              tone === "rose" && "bg-rose-50 text-rose-700",
                              tone === "amber" && "bg-amber-50 text-amber-700",
                              tone === "green" && "bg-emerald-50 text-emerald-700",
                              tone === "slate" && "bg-slate-100 text-slate-500",
                            )}
                          >
                            {formatDate(c.due_date)}
                          </span>
                        </TD>
                        <TD>
                          <Badge tone={pdcStatusTone[c.status]}>{pdcStatusLabel[c.status]}</Badge>
                          {c.invoice && c.status === "cleared" && (
                            <div className="mt-0.5 text-[11px] text-emerald-600">
                              Settles rent {formatDate(c.invoice.period_start)}
                            </div>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            {c.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => markDeposited(c)}
                                className="text-xs font-medium text-brand-600 hover:underline"
                              >
                                Deposit
                              </button>
                            )}
                            {c.status === "deposited" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => markCleared(c)}
                                  className="text-xs font-medium text-emerald-600 hover:underline"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markBounced(c)}
                                  className="text-xs font-medium text-rose-600 hover:underline"
                                >
                                  Bounce
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => remove(c)}
                              className="text-xs font-medium text-slate-400 hover:text-rose-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </TD>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kpi.bounced > 0 && (
        <p className="mt-4 text-center text-sm text-rose-600">
          {kpi.bounced} cheque{kpi.bounced > 1 ? "s have" : " has"} bounced — follow up with the
          tenant immediately.
        </p>
      )}

      <ChequeFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
