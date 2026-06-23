import { useMemo } from "react";
import { useLeases } from "@/data/leases";
import { useEjariRegistrations } from "@/data/ejari";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, daysUntil, todayISO } from "@/lib/format";
import type { EjariRegistration } from "@/lib/database.types";
import { cn } from "@/lib/cn";

type EjariStatus = "registered" | "expiring" | "pending";

function ejariStatus(reg: EjariRegistration | undefined, today: string): EjariStatus {
  if (!reg) return "pending";
  if (reg.expires_at && reg.expires_at <= addDays(today, 60)) return "expiring";
  return "registered";
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<EjariStatus, string> = {
  registered: "Registered",
  expiring: "Expiring soon",
  pending: "Not registered",
};

const STATUS_TONE: Record<EjariStatus, "green" | "amber" | "slate"> = {
  registered: "green",
  expiring: "amber",
  pending: "slate",
};

export function OwnerEjariPage() {
  const { data: leases = [], isLoading: leasesLoading } = useLeases();
  const { data: registrations = [], isLoading: ejariLoading } = useEjariRegistrations();

  const isLoading = leasesLoading || ejariLoading;
  const today = todayISO();

  const regMap = useMemo(() => {
    const m = new Map<string, EjariRegistration>();
    for (const r of registrations) m.set(r.lease_id, r);
    return m;
  }, [registrations]);

  const rows = useMemo(() => {
    return leases
      .filter((l) => l.status === "active" || l.status === "upcoming")
      .map((l) => {
        const reg = regMap.get(l.id);
        return { lease: l, reg, status: ejariStatus(reg, today) };
      })
      .sort((a, b) => {
        const order: EjariStatus[] = ["expiring", "pending", "registered"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
  }, [leases, regMap, today]);

  const registeredCount = rows.filter((r) => r.status === "registered").length;
  const expiringCount = rows.filter((r) => r.status === "expiring").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="EJARI Status"
        subtitle="Dubai tenancy registration status for your leases."
      />

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Registered
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{registeredCount}</p>
          <p className="mt-0.5 text-sm text-slate-500">active leases</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Expiring ≤60 days
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              expiringCount > 0 ? "text-rose-600" : "text-slate-900",
            )}
          >
            {expiringCount}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">renewals needed</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Not registered
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              pendingCount > 0 ? "text-amber-600" : "text-emerald-600",
            )}
          >
            {pendingCount}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {pendingCount > 0 ? "contact your manager" : "all registered"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No active leases"
          description="EJARI status appears once you have active or upcoming leases."
        />
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Property / Unit</TH>
                  <TH>Tenant</TH>
                  <TH>EJARI #</TH>
                  <TH>Registered</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {rows.map(({ lease, reg, status }) => {
                  const daysLeft = reg?.expires_at ? daysUntil(reg.expires_at) : null;
                  return (
                    <tr key={lease.id} className="transition-colors hover:bg-slate-50/70">
                      <TD>
                        <div className="font-medium text-slate-800">
                          {lease.unit?.property?.name ?? "—"}
                        </div>
                        <div className="text-xs text-slate-400">{lease.unit?.label ?? "—"}</div>
                      </TD>
                      <TD>{lease.tenant?.name ?? "—"}</TD>
                      <TD className="font-mono text-slate-700">
                        {reg?.ejari_number ?? <span className="text-slate-300">—</span>}
                      </TD>
                      <TD className="tabular-nums text-slate-500">
                        {reg ? formatDate(reg.registered_at) : <span className="text-slate-300">—</span>}
                      </TD>
                      <TD className="tabular-nums">
                        {reg?.expires_at ? (
                          <div>
                            <div className="text-slate-500">{formatDate(reg.expires_at)}</div>
                            {daysLeft !== null && daysLeft <= 60 && (
                              <div className="mt-1">
                                <Badge tone={daysLeft < 0 ? "rose" : "amber"}>
                                  {daysLeft < 0
                                    ? `${Math.abs(daysLeft)}d expired`
                                    : `${daysLeft}d left`}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
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
