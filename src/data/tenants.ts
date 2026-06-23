import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { Tenant } from "@/lib/database.types";

const KEY = ["tenants"] as const;

export function useTenants() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase.from("tenants").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export interface TenantInput {
  name: string;
  email: string | null;
  phone: string | null;
}

export function useCreateTenant() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: TenantInput): Promise<Tenant> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tenants")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Tenant added", "success");
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TenantInput }) => {
      const { error } = await supabase.from("tenants").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
