import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { InvoiceLineItem } from "@/lib/database.types";

function key(invoiceId: string) {
  return ["invoice-line-items", invoiceId] as const;
}

export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: key(invoiceId ?? ""),
    enabled: !!invoiceId,
    queryFn: async (): Promise<InvoiceLineItem[]> => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("created_at")
        .returns<InvoiceLineItem[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useAddLineItem(invoiceId: string) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { description: string; amount: number }) => {
      if (!profile) throw new Error("Not signed in");
      const { error } = await supabase.from("invoice_line_items").insert({
        org_id: profile.org_id,
        invoice_id: invoiceId,
        description: input.description,
        amount: input.amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(invoiceId) });
      pushToast("Charge added", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not add the charge."), "error"),
  });
}

export function useDeleteLineItem(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoice_line_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(invoiceId) });
      pushToast("Charge removed", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not remove the charge."), "error"),
  });
}
