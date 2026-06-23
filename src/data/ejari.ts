import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { EjariRegistration } from "@/lib/database.types";

const KEY = ["ejari"] as const;

export function useEjariRegistrations() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<EjariRegistration[]> => {
      const { data, error } = await supabase
        .from("ejari_registrations")
        .select("*")
        .order("registered_at", { ascending: false })
        .returns<EjariRegistration[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface EjariInput {
  lease_id: string;
  ejari_number: string;
  registered_at: string;
  expires_at: string | null;
  notes: string | null;
}

export function useCreateEjari() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: EjariInput) => {
      const { error } = await supabase.from("ejari_registrations").insert({
        org_id: profile!.org_id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("EJARI registered", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to register EJARI"), "error"),
  });
}

export function useUpdateEjari() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: EjariInput & { id: string }) => {
      const { error } = await supabase
        .from("ejari_registrations")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("EJARI updated", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to update EJARI"), "error"),
  });
}

export function useDeleteEjari() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ejari_registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("EJARI removed", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Failed to remove EJARI"), "error"),
  });
}
