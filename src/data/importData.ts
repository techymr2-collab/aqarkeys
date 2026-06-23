import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import {
  emptyContext,
  norm,
  unitKey,
  type ImportContext,
  type ImportEntityKey,
  type OwnerImportRow,
  type PropertyImportRow,
  type UnitImportRow,
  type TenantImportRow,
  type LeaseImportRow,
} from "@/lib/importSchemas";

const CTX_KEY = ["import-context"] as const;

/**
 * Seeds the relationship resolver from whatever already exists in the org,
 * so importing into a non-empty org still resolves names against
 * pre-existing rows (not just rows created earlier in the same session).
 */
export function useImportContext() {
  return useQuery({
    queryKey: CTX_KEY,
    queryFn: async (): Promise<ImportContext> => {
      const ctx = emptyContext();
      const [owners, properties, units, tenants] = await Promise.all([
        supabase.from("owners").select("id, name").returns<{ id: string; name: string }[]>(),
        supabase.from("properties").select("id, name").returns<{ id: string; name: string }[]>(),
        supabase
          .from("units")
          .select("id, label, property:properties(name)")
          .returns<{ id: string; label: string; property: { name: string } | null }[]>(),
        supabase.from("tenants").select("id, name").returns<{ id: string; name: string }[]>(),
      ]);
      if (owners.error) throw owners.error;
      if (properties.error) throw properties.error;
      if (units.error) throw units.error;
      if (tenants.error) throw tenants.error;

      for (const o of owners.data) ctx.ownersByName.set(norm(o.name), o.id);
      for (const p of properties.data) ctx.propertiesByName.set(norm(p.name), p.id);
      for (const u of units.data) {
        if (u.property) ctx.unitsByKey.set(unitKey(u.property.name, u.label), u.id);
      }
      for (const t of tenants.data) ctx.tenantsByName.set(norm(t.name), t.id);
      return ctx;
    },
  });
}

const INVALIDATE_KEYS: Record<ImportEntityKey, string[][]> = {
  owners: [["owners"], ["import-context"]],
  properties: [["properties"], ["unit-options"], ["import-context"]],
  units: [["unit-options"], ["units"], ["properties"], ["import-context"]],
  tenants: [["tenants"], ["import-context"]],
  leases: [["leases"], ["units"], ["unit-options"], ["properties"], ["manager-stats"], ["import-context"]],
};

export interface BulkImportArgs {
  key: ImportEntityKey;
  /** Rows produced by that same key's parseRow; narrowed below by the key discriminant. */
  rows: unknown[];
}

/** Bulk-insert validated, relationship-resolved rows for one entity type. */
export function useBulkImportEntity() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ key, rows }: BulkImportArgs): Promise<{ id: string }[]> => {
      if (!profile) throw new Error("Not signed in");
      const org_id = profile.org_id;

      switch (key) {
        case "owners": {
          const payload = (rows as OwnerImportRow[]).map((r) => ({ ...r, org_id }));
          const { data, error } = await supabase.from("owners").insert(payload).select("id");
          if (error) throw error;
          return data;
        }
        case "properties": {
          const payload = (rows as PropertyImportRow[]).map((r) => ({ ...r, org_id }));
          const { data, error } = await supabase.from("properties").insert(payload).select("id");
          if (error) throw error;
          return data;
        }
        case "units": {
          const payload = (rows as UnitImportRow[]).map(({ property_name: _propertyName, ...r }) => ({
            ...r,
            org_id,
          }));
          const { data, error } = await supabase.from("units").insert(payload).select("id");
          if (error) throw error;
          return data;
        }
        case "tenants": {
          const payload = (rows as TenantImportRow[]).map((r) => ({ ...r, org_id }));
          const { data, error } = await supabase.from("tenants").insert(payload).select("id");
          if (error) throw error;
          return data;
        }
        case "leases": {
          const leaseRows = rows as LeaseImportRow[];
          const payload = leaseRows.map((r) => ({ ...r, org_id }));
          const { data, error } = await supabase.from("leases").insert(payload).select("id");
          if (error) throw error;
          // Mirrors useCreateLease's side effect: an active lease occupies its unit.
          const activeUnitIds = leaseRows.filter((r) => r.status === "active").map((r) => r.unit_id);
          if (activeUnitIds.length > 0) {
            const { error: unitErr } = await supabase
              .from("units")
              .update({ status: "occupied" })
              .in("id", activeUnitIds);
            if (unitErr) throw unitErr;
          }
          return data;
        }
        default: {
          throw new Error(`Unknown import entity: ${key}`);
        }
      }
    },
    onSuccess: (_d, { key }) => {
      for (const queryKey of INVALIDATE_KEYS[key]) void qc.invalidateQueries({ queryKey });
    },
  });
}
