import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { TableSkeleton } from "@/components/ui/Table";
import { PropertyFormModal } from "@/features/properties/PropertyFormModal";
import { useProperties } from "@/data/properties";
import { cn } from "@/lib/cn";

function occupancyTextClass(rate: number) {
  if (rate >= 80) return "text-emerald-700";
  if (rate >= 60) return "text-amber-700";
  return "text-rose-700";
}

function occupancyBarClass(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-amber-400";
  return "bg-rose-500";
}

export function ManagerPropertiesPage() {
  const { data, isLoading, isError, refetch } = useProperties();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const { filtered, totalUnits, avgOccupancy } = useMemo(() => {
    if (!data) return { filtered: [], totalUnits: 0, avgOccupancy: 0 };
    const q = search.trim().toLowerCase();
    const filtered = q
      ? data.filter((p) =>
          `${p.name} ${p.city} ${p.country} ${p.owner?.name ?? ""}`.toLowerCase().includes(q),
        )
      : data;
    const totalUnits = data.reduce((s, p) => s + p.unit_count, 0);
    const totalOccupied = data.reduce((s, p) => s + p.occupied_count, 0);
    const avgOccupancy = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
    return { filtered, totalUnits, avgOccupancy };
  }, [data, search]);

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Your buildings and the units inside them."
        action={<Button onClick={() => setAdding(true)}>Add property</Button>}
      />

      {isLoading && <TableSkeleton rows={3} cols={3} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No properties yet"
          description="Add your first building to start tracking units, leases, and rent."
          action={<Button onClick={() => setAdding(true)}>Add property</Button>}
        />
      )}

      {data && data.length > 0 && (
        <>
          {/* Portfolio summary */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{data.length}</span>{" "}
              {data.length === 1 ? "property" : "properties"}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{totalUnits}</span> units
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              <span className={cn("font-semibold", occupancyTextClass(avgOccupancy))}>
                {avgOccupancy}%
              </span>{" "}
              avg occupancy
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, city, owner"
            />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {data.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const occupancy = p.unit_count
                  ? Math.round((p.occupied_count / p.unit_count) * 100)
                  : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/manager/properties/${p.id}`}
                    className="glass-card p-5 transition-all hover:shadow-md hover:ring-1 hover:ring-brand-500/20"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {p.city || "—"}, {p.country || "—"}
                        </p>
                      </div>
                      <Badge tone="brand">{p.currency}</Badge>
                    </div>

                    {/* Owner */}
                    <div className="mt-3">
                      <p className="text-xs text-slate-400">Owner</p>
                      <p className="truncate text-sm font-medium text-slate-700">
                        {p.owner?.name ?? "—"}
                      </p>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mt-4 border-t border-slate-900/[0.06] pt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {p.occupied_count}/{p.unit_count} units &middot; Fee{" "}
                          {p.management_fee_percent}%
                        </span>
                        <span className={cn("font-semibold", occupancyTextClass(occupancy))}>
                          {occupancy}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            occupancyBarClass(occupancy),
                          )}
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <PropertyFormModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
