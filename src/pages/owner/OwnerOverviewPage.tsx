import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { BuildingIcon, BanknoteIcon, UsersIcon, ReceiptIcon } from "@/components/icons";
import { useOwnerStats } from "@/data/ownerStats";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

function occupancyBarClass(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-amber-400";
  return "bg-rose-500";
}

function occupancyTextClass(rate: number) {
  if (rate >= 80) return "text-emerald-700";
  if (rate >= 60) return "text-amber-700";
  return "text-rose-700";
}

export function OwnerOverviewPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch } = useOwnerStats();

  if (isLoading) return <PageLoader label="Loading your portfolio" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const totalUnits = data.properties.reduce((s, p) => s + p.totalUnits, 0);
  const occupied = data.properties.reduce((s, p) => s + p.occupiedUnits, 0);
  const occupancy = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;
  const totals = data.totalsByCurrency;

  if (data.properties.length === 0) {
    return (
      <div>
        <PageHeader title={`Welcome, ${firstName}`} subtitle="Your properties and income." />
        <EmptyState
          title="No properties yet"
          description="Once your manager assigns properties to you, they show up here."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Welcome, ${firstName}`} subtitle="Your properties and income." />

      {/* ── Summary stat cards ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={data.properties.length}
          icon={<BuildingIcon className="h-5 w-5" />}
          accentClass="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Occupancy"
          value={`${occupancy}%`}
          hint={`${occupied} of ${totalUnits} units`}
          icon={<UsersIcon className="h-5 w-5" />}
          accentClass="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Collected this month"
          value={
            totals.length ? formatMoney(totals[0]!.collectedThisMonth, totals[0]!.currency) : "—"
          }
          hint={
            totals.length > 1 ? (
              <div className="space-y-0.5">
                {totals.slice(1).map((c) => (
                  <div key={c.currency}>{formatMoney(c.collectedThisMonth, c.currency)}</div>
                ))}
              </div>
            ) : undefined
          }
          icon={<BanknoteIcon className="h-5 w-5" />}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Outstanding"
          value={
            totals.length ? formatMoney(totals[0]!.outstanding, totals[0]!.currency) : "—"
          }
          hint={
            totals.length > 1 ? (
              <div className="space-y-0.5">
                {totals.slice(1).map((c) => (
                  <div key={c.currency}>{formatMoney(c.outstanding, c.currency)}</div>
                ))}
              </div>
            ) : undefined
          }
          icon={<ReceiptIcon className="h-5 w-5" />}
          accentClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* ── Property cards ───────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.properties.map((p) => (
          <div key={p.id} className="glass-card p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {p.city}, {p.country}
                </p>
              </div>
              <Badge tone="brand">{p.currency}</Badge>
            </div>

            {/* Occupancy bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {p.occupiedUnits}/{p.totalUnits} units occupied
                </span>
                <span className={cn("font-semibold", occupancyTextClass(p.occupancyRate))}>
                  {p.occupancyRate}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", occupancyBarClass(p.occupancyRate))}
                  style={{ width: `${p.occupancyRate}%` }}
                  role="progressbar"
                  aria-valuenow={p.occupancyRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Financials */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/[0.06] pt-4">
              <div>
                <p className="text-xs text-slate-400">Collected</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">
                  {formatMoney(p.collectedThisMonth, p.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Outstanding</p>
                <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", p.outstanding > 0 ? "text-rose-600" : "text-slate-400")}>
                  {formatMoney(p.outstanding, p.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Net income</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                  {formatMoney(p.net, p.currency)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
