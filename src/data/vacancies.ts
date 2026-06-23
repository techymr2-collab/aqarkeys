import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UnitStatus } from "@/lib/database.types";

// ── DB row types ───────────────────────────────────────────────────────────────

type UnitRow = {
  id: string;
  label: string;
  status: UnitStatus;
  property: { id: string; name: string; city: string } | null;
};

type LeaseRow = {
  unit_id: string;
  end_date: string;
  tenant: { name: string } | null;
};

// ── Public type ────────────────────────────────────────────────────────────────

export type VacantUnit = {
  unitId: string;
  label: string;
  status: "vacant" | "under_maintenance" | "reserved";
  propertyId: string;
  propertyName: string;
  propertyCity: string;
  lastLeaseEndDate: string | null;
  lastTenantName: string | null;
  /** Days since last lease ended. -1 means the unit was never leased. */
  daysVacant: number;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVacancies() {
  return useQuery({
    queryKey: ["vacancies"],
    queryFn: async (): Promise<VacantUnit[]> => {
      const [unitsRes, leasesRes] = await Promise.all([
        supabase
          .from("units")
          .select("id, label, status, property:properties(id, name, city)")
          .neq("status", "occupied")
          .returns<UnitRow[]>(),
        supabase
          .from("leases")
          .select("unit_id, end_date, tenant:tenants(name)")
          .order("end_date", { ascending: false })
          .returns<LeaseRow[]>(),
      ]);
      if (unitsRes.error) throw unitsRes.error;
      if (leasesRes.error) throw leasesRes.error;

      // Most recent lease per unit (already ordered by end_date desc)
      const recentLease = new Map<string, LeaseRow>();
      for (const l of leasesRes.data) {
        if (!recentLease.has(l.unit_id)) recentLease.set(l.unit_id, l);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return unitsRes.data
        .filter(
          (u): u is UnitRow & { status: "vacant" | "under_maintenance" | "reserved" } =>
            u.status === "vacant" ||
            u.status === "under_maintenance" ||
            u.status === "reserved",
        )
        .map((u) => {
          const last = recentLease.get(u.id);
          let daysVacant = -1;
          if (last) {
            const end = new Date(last.end_date);
            end.setHours(0, 0, 0, 0);
            daysVacant = Math.round((today.getTime() - end.getTime()) / 86_400_000);
          }
          return {
            unitId: u.id,
            label: u.label,
            status: u.status,
            propertyId: u.property?.id ?? "",
            propertyName: u.property?.name ?? "—",
            propertyCity: u.property?.city ?? "",
            lastLeaseEndDate: last?.end_date ?? null,
            lastTenantName: last?.tenant?.name ?? null,
            daysVacant,
          };
        })
        .sort((a, b) => {
          // Never-leased units last; then longest vacancy first
          if (a.daysVacant < 0 && b.daysVacant < 0) return 0;
          if (a.daysVacant < 0) return 1;
          if (b.daysVacant < 0) return -1;
          return b.daysVacant - a.daysVacant;
        });
    },
  });
}
