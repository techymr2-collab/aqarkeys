import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { daysUntil } from "@/lib/format";
import { useLeases } from "@/data/leases";
import { useInvoices } from "@/data/invoices";
import { useMaintenance } from "@/data/maintenance";
import type { CurrencyCode, InvoiceStatus, MaintenanceStatus, UnitStatus } from "@/lib/database.types";

export interface CurrencyTotal {
  currency: CurrencyCode;
  collectedThisMonth: number;
  outstanding: number;
}

export interface ExpiringLease {
  id: string;
  end_date: string;
  days: number;
  tenant: string;
  unit: string;
  property: string;
}

export interface MonthlyActivity {
  month: string;
  paid: number;
}

export interface PropertyOccupancy {
  name: string;
  occupied: number;
  total: number;
  rate: number;
}

export interface ManagerStats {
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  collectionRate: number;
  invoiceStatusCounts: Record<InvoiceStatus, number>;
  byCurrency: CurrencyTotal[];
  expiring: ExpiringLease[];
  totalProperties: number;
  totalTenants: number;
  activeLeases: number;
  maintenanceCounts: Record<MaintenanceStatus, number>;
  monthlyActivity: MonthlyActivity[];
  propertyOccupancy: PropertyOccupancy[];
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function last6MonthKeys(): { key: string; label: string }[] {
  const now = new Date();
  const result: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    result.push({ key, label });
  }
  return result;
}

interface UnitRow {
  status: UnitStatus;
  property: { id: string; name: string } | null;
}

/**
 * units/properties/tenants have no other simultaneous consumer on first
 * dashboard load, so they stay direct narrow queries. leases/invoices/
 * maintenance are deliberately NOT fetched here — useLeases/useInvoices/
 * useMaintenance already run (and are cached) for the notification
 * center, which mounts at the same time. Re-deriving stats from that
 * shared data avoids firing 3 duplicate round trips on every login.
 */
function useStatsBaseQueries() {
  const units = useQuery({
    queryKey: ["manager-stats", "units"],
    queryFn: async (): Promise<UnitRow[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("status, property:properties(id, name)")
        .returns<UnitRow[]>();
      if (error) throw error;
      return data;
    },
  });
  const properties = useQuery({
    queryKey: ["manager-stats", "properties"],
    queryFn: async (): Promise<{ id: string }[]> => {
      const { data, error } = await supabase.from("properties").select("id");
      if (error) throw error;
      return data;
    },
  });
  const tenants = useQuery({
    queryKey: ["manager-stats", "tenants"],
    queryFn: async (): Promise<{ id: string }[]> => {
      const { data, error } = await supabase.from("tenants").select("id");
      if (error) throw error;
      return data;
    },
  });
  return { units, properties, tenants };
}

export function useManagerStats() {
  const leasesQ = useLeases();
  const invoicesQ = useInvoices();
  const maintenanceQ = useMaintenance();
  const { units: unitsQ, properties: propertiesQ, tenants: tenantsQ } = useStatsBaseQueries();

  const queries = [leasesQ, invoicesQ, maintenanceQ, unitsQ, propertiesQ, tenantsQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const data = useMemo((): ManagerStats | undefined => {
    if (!leasesQ.data || !invoicesQ.data || !maintenanceQ.data) return undefined;
    if (!unitsQ.data || !propertiesQ.data || !tenantsQ.data) return undefined;

    const units = unitsQ.data;
    const invoices = invoicesQ.data;
    const leases = leasesQ.data.filter((l) => l.status === "active");
    const maintenanceItems = maintenanceQ.data;

    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === "occupied").length;

    const invoiceStatusCounts: Record<InvoiceStatus, number> = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      void: 0,
    };
    const monthStart = startOfMonthISO();
    const totals = new Map<CurrencyCode, CurrencyTotal>();
    const ensure = (c: CurrencyCode) => {
      let t = totals.get(c);
      if (!t) {
        t = { currency: c, collectedThisMonth: 0, outstanding: 0 };
        totals.set(c, t);
      }
      return t;
    };

    let dueCount = 0;
    let paidCount = 0;
    for (const inv of invoices) {
      invoiceStatusCounts[inv.status] += 1;
      const t = ensure(inv.currency);
      if (inv.status === "paid") {
        paidCount += 1;
        dueCount += 1;
        if (inv.paid_date && inv.paid_date >= monthStart) {
          t.collectedThisMonth += inv.amount;
        }
      } else if (inv.status === "sent" || inv.status === "overdue") {
        dueCount += 1;
        t.outstanding += inv.amount;
      }
    }

    // Monthly payments collected (last 6 months, grouped by paid_date)
    const months = last6MonthKeys();
    const monthlyActivity: MonthlyActivity[] = months.map(({ key, label }) => ({
      month: label,
      paid: invoices.filter(
        (inv) => inv.status === "paid" && inv.paid_date?.startsWith(key),
      ).length,
    }));

    // Per-property occupancy derived from units
    const propMap = new Map<string, { name: string; occupied: number; total: number }>();
    for (const u of units) {
      const propId = u.property?.id ?? "__none__";
      const propName = u.property?.name ?? "Unassigned";
      let p = propMap.get(propId);
      if (!p) {
        p = { name: propName, occupied: 0, total: 0 };
        propMap.set(propId, p);
      }
      p.total += 1;
      if (u.status === "occupied") p.occupied += 1;
    }
    const propertyOccupancy: PropertyOccupancy[] = [...propMap.values()]
      .map((p) => ({ ...p, rate: p.total ? Math.round((p.occupied / p.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Maintenance counts by status
    const maintenanceCounts: Record<MaintenanceStatus, number> = {
      submitted: 0,
      in_progress: 0,
      on_hold: 0,
      resolved: 0,
      cancelled: 0,
    };
    for (const m of maintenanceItems) {
      maintenanceCounts[m.status] += 1;
    }

    const expiring: ExpiringLease[] = leases
      .map((l) => ({
        id: l.id,
        end_date: l.end_date,
        days: daysUntil(l.end_date),
        tenant: l.tenant?.name ?? "—",
        unit: l.unit?.label ?? "—",
        property: l.unit?.property?.name ?? "—",
      }))
      .filter((l) => l.days >= 0 && l.days <= 60)
      .sort((a, b) => a.days - b.days);

    return {
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      collectionRate: dueCount ? Math.round((paidCount / dueCount) * 100) : 0,
      invoiceStatusCounts,
      byCurrency: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      expiring,
      totalProperties: propertiesQ.data?.length ?? 0,
      totalTenants: tenantsQ.data?.length ?? 0,
      activeLeases: leases.length,
      maintenanceCounts,
      monthlyActivity,
      propertyOccupancy,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leasesQ.data, invoicesQ.data, maintenanceQ.data, unitsQ.data, propertiesQ.data, tenantsQ.data]);

  function refetch() {
    void leasesQ.refetch();
    void invoicesQ.refetch();
    void maintenanceQ.refetch();
    void unitsQ.refetch();
    void propertiesQ.refetch();
    void tenantsQ.refetch();
  }

  return { data, isLoading, isError, refetch };
}

