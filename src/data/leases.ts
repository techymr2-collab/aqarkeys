import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type {
  CurrencyCode,
  DepositStatus,
  Lease,
  LeaseAmendment,
  LeaseFrequency,
  LeaseStatus,
} from "@/lib/database.types";

type AmendmentChanges = Record<string, { from: unknown; to: unknown }>;

/** Best-effort audit log — a failure here must never block the underlying lease change. */
async function logAmendment(
  orgId: string,
  leaseId: string,
  changedBy: string | null,
  changeType: string,
  changes: AmendmentChanges,
  note?: string | null,
) {
  if (Object.keys(changes).length === 0 && !note) return;
  try {
    const { error } = await supabase.from("lease_amendments").insert({
      org_id: orgId,
      lease_id: leaseId,
      changed_by: changedBy,
      change_type: changeType,
      changes,
      note: note ?? null,
    });
    if (error) console.error("Failed to log lease amendment", error);
  } catch (err) {
    console.error("Failed to log lease amendment", err);
  }
}

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

export interface LeaseAmendmentWithProfile extends LeaseAmendment {
  changed_by_profile: { full_name: string } | null;
}

export function useLeaseAmendments(leaseId: string | undefined) {
  return useQuery({
    queryKey: ["lease-amendments", leaseId],
    enabled: !!leaseId,
    queryFn: async (): Promise<LeaseAmendmentWithProfile[]> => {
      const { data, error } = await supabase
        .from("lease_amendments")
        .select("*, changed_by_profile:profiles(full_name)")
        .eq("lease_id", leaseId!)
        .order("created_at", { ascending: false })
        .returns<LeaseAmendmentWithProfile[]>();
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
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      previousStatus,
    }: {
      id: string;
      unitId: string;
      previousStatus: LeaseStatus;
    }) => {
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
      if (profile) {
        await logAmendment(profile.org_id, id, profile.id, "terminate", {
          status: { from: previousStatus, to: "terminated" },
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["lease-amendments"] });
    },
  });
}

/** Extend a lease end date, update rent, and mark it active. */
export function useRenewLease() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      endDate,
      rentAmount,
      previousEndDate,
      previousRentAmount,
      previousStatus,
    }: {
      id: string;
      endDate: string;
      rentAmount: number;
      previousEndDate: string;
      previousRentAmount: number;
      previousStatus: LeaseStatus;
    }) => {
      const { error } = await supabase
        .from("leases")
        .update({ end_date: endDate, rent_amount: rentAmount, status: "active" })
        .eq("id", id);
      if (error) throw error;
      if (profile) {
        const changes: AmendmentChanges = {
          end_date: { from: previousEndDate, to: endDate },
        };
        if (rentAmount !== previousRentAmount) {
          changes.rent_amount = { from: previousRentAmount, to: rentAmount };
        }
        if (previousStatus !== "active") {
          changes.status = { from: previousStatus, to: "active" };
        }
        await logAmendment(profile.org_id, id, profile.id, "renew", changes);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["lease-amendments"] });
    },
  });
}

export interface UpdateLeaseInput {
  id: string;
  rent_amount: number;
  frequency: LeaseFrequency;
  deposit_amount: number;
  end_date: string;
  previous: {
    rent_amount: number;
    frequency: LeaseFrequency;
    deposit_amount: number;
    end_date: string;
  };
  note?: string;
}

/** Edits a lease's mid-term commercial fields (rent, frequency, deposit, end date). */
export function useUpdateLease() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, previous, note, ...input }: UpdateLeaseInput) => {
      const { error } = await supabase.from("leases").update(input).eq("id", id);
      if (error) throw error;
      if (profile) {
        const changes: AmendmentChanges = {};
        if (input.rent_amount !== previous.rent_amount) {
          changes.rent_amount = { from: previous.rent_amount, to: input.rent_amount };
        }
        if (input.frequency !== previous.frequency) {
          changes.frequency = { from: previous.frequency, to: input.frequency };
        }
        if (input.deposit_amount !== previous.deposit_amount) {
          changes.deposit_amount = { from: previous.deposit_amount, to: input.deposit_amount };
        }
        if (input.end_date !== previous.end_date) {
          changes.end_date = { from: previous.end_date, to: input.end_date };
        }
        await logAmendment(profile.org_id, id, profile.id, "edit", changes, note);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["lease-amendments"] });
      pushToast("Lease updated", "success");
    },
  });
}

export interface ReturnDepositInput {
  id: string;
  status: Exclude<DepositStatus, "held">;
  amount: number;
  date: string;
  notes: string | null;
}

/** Resolves a held security deposit — returned, partially returned, or forfeited. */
export function useReturnDeposit() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, amount, date, notes }: ReturnDepositInput) => {
      const { error } = await supabase
        .from("leases")
        .update({
          deposit_status: status,
          deposit_returned_amount: amount,
          deposit_returned_date: date,
          deposit_return_notes: notes,
        })
        .eq("id", id);
      if (error) throw error;
      if (profile) {
        await logAmendment(
          profile.org_id,
          id,
          profile.id,
          "deposit_return",
          { deposit_status: { from: "held", to: status }, deposit_returned_amount: { from: null, to: amount } },
          notes,
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["lease-amendments"] });
      pushToast("Deposit updated", "success");
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

export interface BulkTerminateRow {
  id: string;
  unitId: string;
  previousStatus: LeaseStatus;
}

/** Terminates several leases at once, freeing each unit back to vacant. */
export function useBulkTerminateLeases() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (rows: BulkTerminateRow[]): Promise<number> => {
      await Promise.all(
        rows.map(async (r) => {
          const { error } = await supabase
            .from("leases")
            .update({ status: "terminated" })
            .eq("id", r.id);
          if (error) throw error;
          const { error: unitErr } = await supabase
            .from("units")
            .update({ status: "vacant" })
            .eq("id", r.unitId);
          if (unitErr) throw unitErr;
          if (profile) {
            await logAmendment(profile.org_id, r.id, profile.id, "terminate", {
              status: { from: r.previousStatus, to: "terminated" },
            });
          }
        }),
      );
      return rows.length;
    },
    onSuccess: (count) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["lease-amendments"] });
      pushToast(`${count} lease${count === 1 ? "" : "s"} terminated`, "success");
    },
  });
}

export interface BulkDeleteLeaseRow {
  id: string;
  unitId: string;
  wasActive: boolean;
}

/** Deletes several leases at once (their invoices cascade away). */
export function useBulkDeleteLeases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: BulkDeleteLeaseRow[]): Promise<number> => {
      if (rows.length === 0) return 0;
      const { error } = await supabase
        .from("leases")
        .delete()
        .in("id", rows.map((r) => r.id));
      if (error) throw error;
      const activeUnitIds = rows.filter((r) => r.wasActive).map((r) => r.unitId);
      if (activeUnitIds.length > 0) {
        const { error: unitErr } = await supabase
          .from("units")
          .update({ status: "vacant" })
          .in("id", activeUnitIds);
        if (unitErr) throw unitErr;
      }
      return rows.length;
    },
    onSuccess: (count) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["unit-options"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      pushToast(`${count} lease${count === 1 ? "" : "s"} deleted`, "success");
    },
  });
}
