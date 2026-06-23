import { Fragment, useMemo, useState } from "react";
import { useLeases } from "@/data/leases";
import type { CurrencyCode, LeaseFrequency, LeaseStatus } from "@/lib/database.types";
// CurrencyCode kept for per-row display of historical multi-currency seed data
import { formatMoney, formatDate, daysUntil } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TH, TD, TableSkeleton } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { BuildingIcon, DownloadIcon, PrinterIcon } from "@/components/icons";
import type { Tone } from "@/lib/labels";
import { Select } from "@/components/ui/Select";

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQ_FACTOR: Record<LeaseFrequency, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
};

const FREQ_SHORT: Record<LeaseFrequency, string> = {
  monthly: "mo",
  quarterly: "qtr",
  semiannual: "6mo",
  annual: "yr",
};

const COLS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function leaseStatusTone(s: LeaseStatus): Tone {
  if (s === "active") return "green";
  if (s === "upcoming") return "brand";
  if (s === "expired") return "slate";
  return "rose";
}

function daysBadgeTone(days: number): Tone {
  if (days <= 30) return "rose";
  if (days <= 60) return "amber";
  return "green";
}

// ── Data types ────────────────────────────────────────────────────────────────

interface RentRollRow {
  leaseId: string;
  unit: string;
  tenant: string;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  currency: CurrencyCode;
  rentAmount: number;
  frequency: LeaseFrequency;
  monthlyEquiv: number;
  depositAmount: number;
  daysRemaining: number;
}

interface PropertyGroup {
  propertyId: string;
  propertyName: string;
  rows: RentRollRow[];
  totalByCurrency: Map<CurrencyCode, number>;
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(grouped: PropertyGroup[]): void {
  const headers = [
    "Property",
    "Unit",
    "Tenant",
    "Start Date",
    "End Date",
    "Status",
    "Rent Amount",
    "Currency",
    "Frequency",
    "Monthly Equiv",
    "Annual Equiv",
    "Deposit",
  ];
  const lines = [
    headers.join(","),
    ...grouped.flatMap((g) =>
      g.rows.map((r) =>
        [
          g.propertyName,
          r.unit,
          r.tenant,
          r.startDate,
          r.endDate,
          r.status,
          r.rentAmount,
          r.currency,
          r.frequency,
          Math.round(r.monthlyEquiv),
          Math.round(r.monthlyEquiv * 12),
          r.depositAmount,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rent-roll-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerRentRollPage() {
  const { data: leases = [], isLoading } = useLeases();
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming">("active");

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leases) {
      const p = l.unit?.property;
      if (p) map.set(p.id, p.name);
    }
    return [...map.entries()].sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? ""));
  }, [leases]);

  const grouped = useMemo((): PropertyGroup[] => {
    const filtered = leases.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (propFilter !== "all" && l.unit?.property?.id !== propFilter) return false;
      return true;
    });

    const propMap = new Map<string, PropertyGroup>();
    for (const l of filtered) {
      const prop = l.unit?.property;
      const propId = prop?.id ?? "__none__";
      const propName = prop?.name ?? "No Property";

      let group = propMap.get(propId);
      if (!group) {
        group = {
          propertyId: propId,
          propertyName: propName,
          rows: [],
          totalByCurrency: new Map(),
        };
        propMap.set(propId, group);
      }

      const monthly = l.rent_amount * (FREQ_FACTOR[l.frequency] ?? 1);
      group.totalByCurrency.set(
        l.currency,
        (group.totalByCurrency.get(l.currency) ?? 0) + monthly,
      );
      group.rows.push({
        leaseId: l.id,
        unit: l.unit?.label ?? "—",
        tenant: l.tenant?.name ?? "—",
        startDate: l.start_date,
        endDate: l.end_date,
        status: l.status,
        currency: l.currency,
        rentAmount: l.rent_amount,
        frequency: l.frequency,
        monthlyEquiv: monthly,
        depositAmount: l.deposit_amount,
        daysRemaining: daysUntil(l.end_date),
      });
    }
    return [...propMap.values()].sort((a, b) =>
      a.propertyName.localeCompare(b.propertyName),
    );
  }, [leases, propFilter, statusFilter]);

  const { totalRows, activeCount, expiringCount, grandTotals } = useMemo(() => {
    let totalRows = 0;
    let activeCount = 0;
    let expiringCount = 0;
    const grandMap = new Map<CurrencyCode, number>();
    for (const g of grouped) {
      totalRows += g.rows.length;
      for (const r of g.rows) {
        if (r.status === "active") activeCount++;
        if (r.status === "active" && r.daysRemaining >= 0 && r.daysRemaining <= 60)
          expiringCount++;
        grandMap.set(r.currency, (grandMap.get(r.currency) ?? 0) + r.monthlyEquiv);
      }
    }
    return { totalRows, activeCount, expiringCount, grandTotals: grandMap };
  }, [grouped]);

  const grandEntries = [...grandTotals.entries()];

  return (
    <div>
      <PageHeader
        title="Rent Roll"
        subtitle="Lease schedules grouped by property, normalized to monthly-equivalent rent"
      />

      {/* Filter + actions bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
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
            { value: "active", label: "Active leases" },
            { value: "upcoming", label: "Upcoming leases" },
            { value: "all", label: "All statuses" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => exportCsv(grouped)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 print:hidden">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Leases shown
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalRows}</p>
          <p className="mt-0.5 text-xs text-slate-500">{activeCount} active</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Monthly rent
          </p>
          {grandEntries.length === 0 ? (
            <p className="mt-1 text-2xl font-bold text-slate-400">—</p>
          ) : (
            grandEntries.map(([cur, total]) => (
              <p key={cur} className="mt-1 text-2xl font-bold text-slate-900">
                {formatMoney(total, cur)}
              </p>
            ))
          )}
          <p className="mt-0.5 text-xs text-slate-500">monthly equivalent</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Annual equivalent
          </p>
          {grandEntries.length === 0 ? (
            <p className="mt-1 text-2xl font-bold text-slate-400">—</p>
          ) : (
            grandEntries.map(([cur, total]) => (
              <p key={cur} className="mt-1 text-2xl font-bold text-slate-900">
                {formatMoney(total * 12, cur)}
              </p>
            ))
          )}
          <p className="mt-0.5 text-xs text-slate-500">annualized</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Expiring ≤60 days
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              expiringCount > 0 ? "text-amber-600" : "text-emerald-600",
            )}
          >
            {expiringCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">active leases</p>
        </div>
      </div>

      {/* Grouped table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={COLS} />
      ) : grouped.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-500">No leases match the current filters.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                <tr>
                  <TH>Unit</TH>
                  <TH>Tenant</TH>
                  <TH>Lease Period</TH>
                  <TH>Status</TH>
                  <TH>Contracted Rent</TH>
                  <TH>Freq</TH>
                  <TH>Monthly Equiv</TH>
                  <TH>Deposit</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/[0.04]">
                {grouped.map((group) => (
                  <Fragment key={group.propertyId}>
                    {/* Property header row */}
                    <tr className="bg-slate-50/80 border-t border-slate-200/80">
                      <td colSpan={COLS} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <BuildingIcon className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                            {group.propertyName}
                          </span>
                          <span className="text-xs text-slate-400">
                            · {group.rows.length}{" "}
                            {group.rows.length === 1 ? "lease" : "leases"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Lease rows */}
                    {group.rows.map((row) => (
                      <tr
                        key={row.leaseId}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <TD className="font-medium text-slate-800">{row.unit}</TD>
                        <TD>{row.tenant}</TD>
                        <TD className="tabular-nums text-slate-500 whitespace-nowrap">
                          {formatDate(row.startDate)} – {formatDate(row.endDate)}
                        </TD>
                        <TD>
                          <div className="flex flex-col gap-1">
                            <Badge tone={leaseStatusTone(row.status)}>
                              {row.status}
                            </Badge>
                            {row.status === "active" &&
                              row.daysRemaining >= 0 &&
                              row.daysRemaining <= 60 && (
                                <Badge tone={daysBadgeTone(row.daysRemaining)}>
                                  {row.daysRemaining}d left
                                </Badge>
                              )}
                          </div>
                        </TD>
                        <TD className="tabular-nums font-medium">
                          {formatMoney(row.rentAmount, row.currency)}
                        </TD>
                        <TD className="text-slate-400 text-xs uppercase tracking-wide">
                          {FREQ_SHORT[row.frequency]}
                        </TD>
                        <TD className="tabular-nums font-semibold text-slate-800">
                          {formatMoney(row.monthlyEquiv, row.currency)}
                        </TD>
                        <TD className="tabular-nums text-slate-500">
                          {formatMoney(row.depositAmount, row.currency)}
                        </TD>
                      </tr>
                    ))}

                    {/* Property subtotal */}
                    <tr className="bg-brand-50/40">
                      <td
                        colSpan={6}
                        className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400"
                      >
                        {group.propertyName} subtotal
                      </td>
                      <TD className="tabular-nums font-bold text-brand-700">
                        {[...group.totalByCurrency.entries()].map(([cur, total]) => (
                          <div key={cur}>{formatMoney(total, cur)}</div>
                        ))}
                      </TD>
                      <TD />
                    </tr>
                  </Fragment>
                ))}

                {/* Grand total */}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-500"
                  >
                    Grand total / month
                  </td>
                  <TD className="tabular-nums text-base font-extrabold text-slate-900">
                    {grandEntries.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      grandEntries.map(([cur, total]) => (
                        <div key={cur}>{formatMoney(total, cur)}</div>
                      ))
                    )}
                  </TD>
                  <TD />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
