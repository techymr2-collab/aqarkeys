import { useMemo, useState } from "react";
import { usePdcCheques } from "@/data/cheques";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { pdcStatusLabel, pdcStatusTone } from "@/lib/labels";
import { pdcStatusOptions } from "@/lib/options";
import { Select } from "@/components/ui/Select";
import type { PdcStatus } from "@/lib/database.types";
import { cn } from "@/lib/cn";

function dueDateBadge(dueDate: string): { tone: "rose" | "amber" | "green"; label: string } {
  const days = daysUntil(dueDate);
  if (days < 0) return { tone: "rose", label: `${Math.abs(days)}d overdue` };
  if (days <= 7) return { tone: "amber", label: `${days}d` };
  return { tone: "green", label: `${days}d` };
}

export function OwnerChequesPage() {
  const { data: cheques = [], isLoading } = usePdcCheques();
  const [statusFilter, setStatusFilter] = useState<PdcStatus | "all">("all");

  const { pendingCount, pendingAmount, dueSoon, bounced } = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let dueSoon = 0;
    let bounced = 0;
    for (const c of cheques) {
      if (c.status === "pending") {
        pendingCount++;
        pendingAmount += c.amount;
        if (daysUntil(c.due_date) <= 30) dueSoon++;
      }
      if (c.status === "bounced") bounced++;
    }
    return { pendingCount, pendingAmount, dueSoon, bounced };
  }, [cheques]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? cheques : cheques.filter((c) => c.status === statusFilter)),
    [cheques, statusFilter],
  );

  return (
    <div>
      <PageHeader
        title="Cheque Schedule"
        subtitle="Post-dated cheques for your properties — read-only view."
      />

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingCount}</p>
          <p className="mt-0.5 text-sm text-slate-500">{formatMoney(pendingAmount, "AED")}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Due in 30 days
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              dueSoon > 0 ? "text-amber-600" : "text-slate-900",
            )}
          >
            {dueSoon}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">pending cheques</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Bounced
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              bounced > 0 ? "text-rose-600" : "text-emerald-600",
            )}
          >
            {bounced}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {bounced > 0 ? "contact your manager" : "all clear"}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select
          options={[{ value: "all", label: "All statuses" }, ...pdcStatusOptions]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PdcStatus | "all")}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No cheques"
          description={
            statusFilter === "all"
              ? "Your manager hasn't logged any cheques yet."
              : `No ${pdcStatusLabel[statusFilter as PdcStatus].toLowerCase()} cheques.`
          }
        />
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Property / Unit</TH>
                  <TH>Tenant</TH>
                  <TH>Due Date</TH>
                  <TH>Amount</TH>
                  <TH>Cheque #</TH>
                  <TH>Bank</TH>
                  <TH>Status</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {filtered.map((c) => {
                  const badge = c.status === "pending" ? dueDateBadge(c.due_date) : null;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50/70">
                      <TD>
                        <div className="font-medium text-slate-800">
                          {c.lease?.unit?.property?.name ?? "—"}
                        </div>
                        <div className="text-xs text-slate-400">{c.lease?.unit?.label ?? "—"}</div>
                      </TD>
                      <TD>{c.lease?.tenant?.name ?? "—"}</TD>
                      <TD className="tabular-nums">
                        <div className="text-slate-700">{formatDate(c.due_date)}</div>
                        {badge && (
                          <div className="mt-1">
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          </div>
                        )}
                      </TD>
                      <TD className="tabular-nums font-semibold text-slate-900">
                        {formatMoney(c.amount, "AED")}
                      </TD>
                      <TD className="text-slate-500">{c.cheque_number ?? "—"}</TD>
                      <TD className="text-slate-500">{c.bank_name ?? "—"}</TD>
                      <TD>
                        <Badge tone={pdcStatusTone[c.status]}>{pdcStatusLabel[c.status]}</Badge>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
