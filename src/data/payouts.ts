import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { pushToast } from "@/lib/toast";
import type { CurrencyCode, Payout, PaymentMethod } from "@/lib/database.types";

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
