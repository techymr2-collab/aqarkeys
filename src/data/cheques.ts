import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { PdcCheque, PdcStatus } from "@/lib/database.types";

export type PdcChequeRow = PdcCheque & {
  lease: {
    tenant: { name: string } | null;
    unit: { label: string; property: { id: string; name: string } | null } | null;
  } | null;
  invoice: { period_start: string; period_end: string; status: string } | null;
};

const KEY = ["pdc_cheques"] as const;

export function usePdcCheques() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PdcChequeRow[]> => {
      const { data, error } = await supabase
        .from("pdc_cheques")
        .select(
          "*, lease:leases(tenant:tenants(name), unit:units(label, property:properties(id, name))), invoice:invoices(period_start, period_end, status)",
        )
        .order("due_date", { ascending: true })
        .returns<PdcChequeRow[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface CreateChequesInput {
  lease_id: string;
  cheques: {
    amount: number;
    due_date: string;
    cheque_number: string | null;
    bank_name: string | null;
  }[];
}

export function useCreateCheques() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateChequesInput) => {
      const rows = input.cheques.map((c) => ({
        org_id: profile!.org_id,
        lease_id: input.lease_id,
        amount: c.amount,
        due_date: c.due_date,
        cheque_number: c.cheque_number,
        bank_name: c.bank_name,
        status: "pending" as PdcStatus,
      }));
      const { error } = await supabase.from("pdc_cheques").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, input) => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast(`${input.cheques.length} cheque(s) added`, "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to add cheques"), "error"),
  });
}

export function useUpdateChequeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      deposited_date,
    }: {
      id: string;
      status: PdcStatus;
      deposited_date?: string;
    }) => {
      const update: Partial<PdcCheque> = { status };
      if (deposited_date) update.deposited_date = deposited_date;
      const { error } = await supabase.from("pdc_cheques").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      void qc.invalidateQueries({ queryKey: KEY });
      // clearing/bouncing a cheque syncs the linked invoice server-side,
      // so refresh anything derived from invoices.
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
      const label =
        status === "deposited"
          ? "Deposited"
          : status === "cleared"
            ? "Cleared — rent invoice marked paid"
            : status === "bounced"
              ? "Bounced — invoice reopened"
              : "Updated";
      pushToast(`Cheque marked ${label}`, "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to update cheque"), "error"),
  });
}

export function useDeleteCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pdc_cheques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Cheque removed", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to remove cheque"), "error"),
  });
}
