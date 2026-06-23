import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { Expense } from "@/lib/database.types";

export const EXPENSE_CATEGORIES = [
  "Maintenance",
  "Repairs",
  "Service charge",
  "Cleaning",
  "Utilities",
  "Insurance",
  "Management fee",
  "Other",
];

export function useExpenses(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["expenses", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("property_id", propertyId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface ExpenseInput {
  property_id: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
}

function invalidate(propertyId: string, qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["expenses", propertyId] });
  void qc.invalidateQueries({ queryKey: ["owner-stats"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: ExpenseInput): Promise<Expense> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.property_id, qc);
      pushToast("Expense added", "success");
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ExpenseInput }) => {
      const { error } = await supabase.from("expenses").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.input.property_id, qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.propertyId, qc),
  });
}
