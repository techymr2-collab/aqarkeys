import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { CurrencyCode, Payout, PayoutExpense, PaymentMethod } from "@/lib/database.types";

export interface PayoutWithRelations extends Payout {
  property: { id: string; name: string; currency: CurrencyCode } | null;
  owner: { id: string; name: string } | null;
}

const SELECT = "*, property:properties(id, name, currency), owner:owners(id, name)";
const KEY = ["payouts"] as const;

export function usePayouts() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PayoutWithRelations[]> => {
      const { data, error } = await supabase
        .from("payouts")
        .select(SELECT)
        .order("period_start", { ascending: false })
        .returns<PayoutWithRelations[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useGeneratePayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }): Promise<number> => {
      const { data, error } = await supabase.rpc("generate_payouts", {
        p_start: start,
        p_end: end,
      });
      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paid_date,
      method,
    }: {
      id: string;
      paid_date: string;
      method: PaymentMethod;
    }) => {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "paid", paid_date, method })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Payout marked paid", "success");
    },
  });
}

/** Marks every given (pending) payout paid in one go, for month-end settlement. */
export function useBulkMarkPayoutsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      paid_date,
      method,
    }: {
      ids: string[];
      paid_date: string;
      method: PaymentMethod;
    }) => {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "paid", paid_date, method })
        .in("id", ids)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_data, { ids }) => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast(`${ids.length} payout${ids.length === 1 ? "" : "s"} marked paid`, "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not mark those payouts paid."), "error"),
  });
}

export interface PayoutEdit {
  gross_collected: number;
  expenses_total: number;
  fee_percent: number;
  note: string | null;
}

/** Corrects a pending payout's numbers — for a reconciliation mistake caught before it's paid. */
export function useUpdatePayout() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PayoutEdit }) => {
      if (!profile) throw new Error("Not signed in");
      const fee_amount = Math.round(((input.gross_collected * input.fee_percent) / 100) * 100) / 100;
      const net_amount = input.gross_collected - input.expenses_total - fee_amount;
      const { error } = await supabase
        .from("payouts")
        .update({ ...input, fee_amount, net_amount })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;

      // A manual override invalidates the original itemized snapshot — replace
      // it with a single adjustment line so the breakdown an owner sees always
      // sums to the edited total, instead of silently drifting from it.
      await supabase.from("payout_expenses").delete().eq("payout_id", id);
      if (input.expenses_total > 0) {
        await supabase.from("payout_expenses").insert({
          org_id: profile.org_id,
          payout_id: id,
          category: "Manual adjustment",
          amount: input.expenses_total,
          expense_date: new Date().toISOString().slice(0, 10),
          note: input.note,
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["payout-expenses"] });
      pushToast("Payout updated", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not update the payout."), "error"),
  });
}

/** Voids a payout — pending (a mistake caught before paying) or paid (paid in error). */
export function useVoidPayout() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string | null }) => {
      if (!profile) throw new Error("Not signed in");
      const { error } = await supabase
        .from("payouts")
        .update({
          status: "void",
          void_reason: reason,
          voided_at: new Date().toISOString(),
          voided_by: profile.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Payout voided", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not void the payout."), "error"),
  });
}

/** The specific expenses snapshotted into a payout's expenses_total, for owner-facing transparency. */
export function usePayoutExpenses(payoutId: string | undefined) {
  return useQuery({
    queryKey: ["payout-expenses", payoutId],
    queryFn: async (): Promise<PayoutExpense[]> => {
      const { data, error } = await supabase
        .from("payout_expenses")
        .select("*")
        .eq("payout_id", payoutId!)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!payoutId,
  });
}
