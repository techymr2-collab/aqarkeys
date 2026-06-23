import { useMemo, useState } from "react";
import { useLeases, type LeaseWithRelations } from "@/data/leases";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { RenewLeaseModal } from "@/features/leases/RenewLeaseModal";
import { formatDate, formatMoney, daysUntil } from "@/lib/format";
import { cn } from "@/lib/cn";
import { RefreshCwIcon } from "@/components/icons";
import type { Tone } from "@/lib/labels";

type UrgencyFilter = "all" | "expired" | "30" | "60" | "90";

function urgencyBand(days: number): { label: string; tone: Tone } {
  if (days < 0) return { label: "Expired", tone: "rose" };
  if (days === 0) return { label: "Today", tone: "rose" };
  if (days <= 30) return { label: `${days}d`, tone: "rose" };
  if (days <= 60) return { label: `${days}d`, tone: "amber" };
  return { label: `${days}d`, tone: "slate" };
}

export function ManagerRenewalsPage() {
  const { data: leases = [], isLoading } = useLeases();
  const [filter, setFilter] = useState<UrgencyFilter>("all");
  const [renewing, setRenewing] = useState<LeaseWithRelations | null>(null);

  const renewalLeases = useMemo(() => {
    return leases
      .filter((l) => {
        if (l.status !== "active" && l.status !== "expired") return false;
        return daysUntil(l.end_date) <= 90;
      })
      .sort((a, b) => a.end_date.localeCompare(b.end_date));
  }, [leases]);

  const kpi = useMemo(() => {
    let expired = 0, d30 = 0, d60 = 0, d90 = 0;
    for (const l of renewalLeases) {
      const days = daysUntil(l.end_date);
      if (days < 0) expired++;
      else if (days <= 30) d30++;
      else if (days <= 60) d60++;
      else d90++;
    }
    return { expired, d30, d60, d90 };
  }, [renewalLeases]);

  const filtered = useMemo(() => {
    if (filter === "all") return renewalLeases;
    return renewalLeases.filter((l) => {
      const days = daysUntil(l.end_date);
      if (filter === "expired") return days < 0;
      if (filter === "30") return days >= 0 && days <= 30;
      if (filter === "60") return days > 30 && days <= 60;
      if (filter === "90") return days > 60 && days <= 90;
      return true;
    });
  }, [renewalLeases, filter]);

  return (
    <div>
      <PageHeader
        title="Lease Renewals"
        subtitle="Active leases expiring within 90 days — sorted by urgency."
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Expired
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.expired > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {kpi.expired}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">past end date</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            ≤ 30 days
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.d30 > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {kpi.d30}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">renew now</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            31 – 60 days
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.d60 > 0 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {kpi.d60}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">plan ahead</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            61 – 90 days
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.d90 > 0 ? "text-brand-600" : "text-slate-400",
            )}
          >
            {kpi.d90}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">on the horizon</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select
          options={[
            { value: "all", label: "All upcoming renewals" },
            { value: "expired", label: "Already expired" },
            { value: "30", label: "Expiring in ≤ 30 days" },
            { value: "60", label: "Expiring in 31 – 60 days" },
            { value: "90", label: "Expiring in 61 – 90 days" },
          ]}
          value={filter}
          onChange={(e) => setFilter(e.target.value as UrgencyFilter)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : renewalLeases.length === 0 ? (
        <EmptyState
          title="No renewals due"
          description="All leases end more than 90 days out. Nothing to action right now."
        />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500">No leases in this range.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Tenant</TH>
                  <TH>Unit / Property</TH>
                  <TH>End date</TH>
                  <TH>Days left</TH>
                  <TH className="text-right">Current rent</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {filtered.map((l) => {
                  const days = daysUntil(l.end_date);
                  const band = urgencyBand(days);
                  return (
                    <tr key={l.id} className="transition-colors hover:bg-slate-50/70">
                      <TD className="font-medium text-slate-800">{l.tenant?.name ?? "—"}</TD>
                      <TD>
                        <div className="font-medium text-slate-700">{l.unit?.label ?? "—"}</div>
                        <div className="text-xs text-slate-400">
                          {l.unit?.property?.name ?? "—"}
                        </div>
                      </TD>
                      <TD className="tabular-nums text-slate-600">{formatDate(l.end_date)}</TD>
                      <TD>
                        <Badge tone={band.tone}>{band.label}</Badge>
                      </TD>
                      <TD className="tabular-nums text-right font-semibold text-slate-900">
                        {formatMoney(l.rent_amount, "AED")}
                      </TD>
                      <TD className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenewing(l)}
                        >
                          <RefreshCwIcon className="h-3.5 w-3.5" />
                          Renew
                        </Button>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renewing && (
        <RenewLeaseModal open onClose={() => setRenewing(null)} lease={renewing} />
      )}
    </div>
  );
}
