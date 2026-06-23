import { Fragment, useMemo, useState } from "react";
import { useLeases } from "@/data/leases";
import { useEjariRegistrations, useDeleteEjari } from "@/data/ejari";
import { EjariFormModal } from "@/features/ejari/EjariFormModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { ClipboardCheckIcon } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { formatDate, todayISO } from "@/lib/format";
import type { EjariRegistration } from "@/lib/database.types";
import type { LeaseWithRelations } from "@/data/leases";

// ── Helpers ───────────────────────────────────────────────────────────────────

type EjariStatus = "registered" | "expiring" | "pending";

function ejariStatus(reg: EjariRegistration | undefined, today: string): EjariStatus {
  if (!reg) return "pending";
  if (reg.expires_at) {
    const daysLeft = Math.ceil(
      (new Date(reg.expires_at).getTime() - new Date(today).getTime()) / 86400000,
    );
    if (daysLeft <= 60) return "expiring";
  }
  return "registered";
}

function leaseLabel(l: LeaseWithRelations): string {
  return [
    l.tenant?.name ?? "Unknown tenant",
    l.unit?.label ?? "Unknown unit",
    l.unit?.property?.name ?? "Unknown property",
  ].join(" · ");
}

// ── Modal state ───────────────────────────────────────────────────────────────

interface ModalState {
  leaseId: string;
  leaseLabel: string;
  existing?: EjariRegistration;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerEjariPage() {
  const { data: leases = [], isLoading: leasesLoading, isError: leasesError } = useLeases();
  const { data: registrations = [], isLoading: ejariLoading } = useEjariRegistrations();
  const deleteEjari = useDeleteEjari();
  const today = todayISO();

  const [modal, setModal] = useState<ModalState | null>(null);
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EjariStatus | "all">("all");

  // Only show active or upcoming leases
  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === "active" || l.status === "upcoming"),
    [leases],
  );

  // Build a map from lease_id → registration for O(1) lookups
  const regByLease = useMemo(() => {
    const map = new Map<string, EjariRegistration>();
    for (const r of registrations) map.set(r.lease_id, r);
    return map;
  }, [registrations]);

  // Property options for filter
  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of activeLeases) {
      const prop = l.unit?.property;
      if (prop) map.set(prop.id, prop.name);
    }
    return [...map.entries()].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [activeLeases]);

  const filtered = useMemo(() => {
    return activeLeases.filter((l) => {
      if (propFilter !== "all" && l.unit?.property?.id !== propFilter) return false;
      if (statusFilter !== "all") {
        const reg = regByLease.get(l.id);
        if (ejariStatus(reg, today) !== statusFilter) return false;
      }
      return true;
    });
  }, [activeLeases, propFilter, statusFilter, regByLease, today]);

  // KPI counts
  const kpi = useMemo(() => {
    let registered = 0;
    let pending = 0;
    let expiring = 0;
    for (const l of activeLeases) {
      const reg = regByLease.get(l.id);
      const s = ejariStatus(reg, today);
      if (s === "registered") registered++;
      else if (s === "expiring") expiring++;
      else pending++;
    }
    return { registered, pending, expiring };
  }, [activeLeases, regByLease, today]);

  const isLoading = leasesLoading || ejariLoading;

  function openRegister(l: LeaseWithRelations) {
    setModal({ leaseId: l.id, leaseLabel: leaseLabel(l) });
  }

  function openEdit(l: LeaseWithRelations, reg: EjariRegistration) {
    setModal({ leaseId: l.id, leaseLabel: leaseLabel(l), existing: reg });
  }

  function remove(reg: EjariRegistration) {
    if (!window.confirm("Remove this EJARI registration?")) return;
    void deleteEjari.mutateAsync(reg.id);
  }

  if (leasesError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-rose-700">Failed to load EJARI data.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="EJARI Tracking"
        subtitle="Dubai tenancy registration status for all active and upcoming leases."
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Registered
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{kpi.registered}</p>
          <p className="mt-0.5 text-xs text-slate-400">leases</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Pending Registration
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.pending > 0 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {kpi.pending}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">leases</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Expiring ≤60 days
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              kpi.expiring > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {kpi.expiring}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">registrations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          options={[
            { value: "all", label: "All properties" },
            ...propertyOptions.map(([id, name]) => ({ value: id, label: name })),
          ]}
          value={propFilter}
          onChange={(e) => setPropFilter(e.target.value)}
        />

        <Select
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending registration" },
            { value: "registered", label: "Registered" },
            { value: "expiring", label: "Expiring soon" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EjariStatus | "all")}
        />

        {filtered.length !== activeLeases.length && (
          <span className="text-sm text-slate-400">
            Showing {filtered.length} of {activeLeases.length}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : activeLeases.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardCheckIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-lg font-semibold text-slate-600">No active leases</p>
          <p className="mt-1 text-sm text-slate-400">
            Create a lease first, then register EJARI for each tenancy.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500">No leases match the current filters.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Tenant</TH>
                  <TH>Property / Unit</TH>
                  <TH>Lease period</TH>
                  <TH>EJARI #</TH>
                  <TH>Reg. date</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {filtered.map((l) => {
                  const reg = regByLease.get(l.id);
                  const status = ejariStatus(reg, today);
                  const prop = l.unit?.property?.name ?? "—";
                  const unit = l.unit?.label ?? "—";
                  return (
                    <Fragment key={l.id}>
                      <tr className="transition-colors hover:bg-slate-50/70">
                        <TD className="font-medium text-slate-800">
                          {l.tenant?.name ?? "—"}
                        </TD>
                        <TD className="text-slate-500">
                          {prop}
                          <span className="mx-1 text-slate-300">·</span>
                          {unit}
                        </TD>
                        <TD className="text-slate-500">
                          {formatDate(l.start_date)}
                          <span className="mx-1 text-slate-300">–</span>
                          {formatDate(l.end_date)}
                        </TD>
                        <TD className="font-mono text-slate-600">
                          {reg ? (
                            reg.ejari_number
                          ) : (
                            <span className="italic text-slate-300">—</span>
                          )}
                        </TD>
                        <TD className="text-slate-500">
                          {reg ? formatDate(reg.registered_at) : <span className="italic text-slate-300">—</span>}
                        </TD>
                        <TD className="text-slate-500">
                          {reg?.expires_at ? formatDate(reg.expires_at) : <span className="italic text-slate-300">—</span>}
                        </TD>
                        <TD>
                          {status === "registered" && (
                            <Badge tone="green">Registered</Badge>
                          )}
                          {status === "expiring" && (
                            <Badge tone="amber">Expiring soon</Badge>
                          )}
                          {status === "pending" && (
                            <Badge tone="rose">Pending</Badge>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            {!reg ? (
                              <button
                                type="button"
                                onClick={() => openRegister(l)}
                                className="text-xs font-medium text-brand-600 hover:underline"
                              >
                                Register
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(l, reg)}
                                  className="text-xs font-medium text-brand-600 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(reg)}
                                  className="text-xs font-medium text-slate-400 hover:text-rose-500 hover:underline"
                                >
                                  Remove
                                </button>
                              </>
                            )}
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

      {kpi.pending > 0 && (
        <p className="mt-4 text-center text-sm text-amber-600">
          {kpi.pending} lease{kpi.pending > 1 ? "s are" : " is"} missing EJARI registration —
          register them to comply with Dubai tenancy law.
        </p>
      )}

      {modal && (
        <EjariFormModal
          open
          onClose={() => setModal(null)}
          leaseId={modal.leaseId}
          leaseLabel={modal.leaseLabel}
          existing={modal.existing}
        />
      )}
    </div>
  );
}
