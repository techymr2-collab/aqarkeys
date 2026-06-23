import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type {
  CurrencyCode,
  Lease,
  LeaseFrequency,
  LeaseStatus,
} from "@/lib/database.types";

export interface LeaseWithRelations extends Lease {
  tenant: { id: string; name: string } | null;
  unit:
    | {
        id: string;
        label: string;
        property: { id: string; name: string; vat_rate: number } | null;
      }
    | null;
}

const SELECT =
  "*, tenant:tenants(id, name), unit:units(id, label, property:properties(id, name, vat_rate))";

const KEY = ["leases"] as const;

export function useLeases() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<LeaseWithRelations[]> => {
      const { data, error } = await supabase
        .from("leases")
        .select(SELECT)
        .order("end_date", { ascending: true })
        .returns<LeaseWithRelations[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface LeaseInput {
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  frequency: LeaseFrequency;
  deposit_amount: number;
  currency: CurrencyCode;
  status: LeaseStatus;
}

export function useCreateLease() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: LeaseInput): Promise<Lease> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("leases")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;

      // An active lease occupies its unit.
      if (input.status === "active") {
        const { error: unitErr } = await supabase
          .from("units")
          .update({ status: "occupied" })
          .eq("id", input.unit_id);
        if (unitErr) throw unitErr;
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      pushToast("Lease created", "success");
    },
  });
}

export function useUpdateLeaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeaseStatus }) => {
      const { error } = await supabase.from("leases").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** End a lease early and free its unit back to vacant. */
export function useTerminateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, unitId }: { id: string; unitId: string }) => {
      const { error } = await supabase
        .from("leases")
        .update({ status: "terminated" })
        .eq("id", id);
      if (error) throw error;
      const { error: unitErr } = await supabase
        .from("units")
        .update({ status: "vacant" })
        .eq("id", unitId);
      if (unitErr) throw unitErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
    },
  });
}

/** Extend a lease end date, update rent, and mark it active. */
export function useRenewLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      endDate,
      rentAmount,
    }: {
      id: string;
      endDate: string;
      rentAmount: number;
    }) => {
      const { error } = await supabase
        .from("leases")
        .update({ end_date: endDate, rent_amount: rentAmount, status: "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
    },
  });
}

/**
 * Delete a lease (its invoices cascade away). If it was the unit's active
 * lease, free the unit back to vacant.
 */
export function useDeleteLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      wasActive,
    }: {
      id: string;
      unitId: string;
      wasActive: boolean;
    }) => {
      const { error } = await supabase.from("leases").delete().eq("id", id);
      if (error) throw error;
      if (wasActive) {
        const { error: unitErr } = await supabase
          .from("units")
          .update({ status: "vacant" })
          .eq("id", unitId);
        if (unitErr) throw unitErr;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
    },
  });
}
