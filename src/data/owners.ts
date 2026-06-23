import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { Owner } from "@/lib/database.types";

const KEY = ["owners"] as const;

type OwnerRow = Owner & { properties: { id: string }[] };
export type OwnerWithCount = Owner & { property_count: number };

export function useOwners() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<OwnerWithCount[]> => {
      const { data, error } = await supabase
        .from("owners")
        .select("*, properties(id)")
        .order("name")
        .returns<OwnerRow[]>();
      if (error) throw error;
      return data.map((o) => ({
        ...o,
        property_count: o.properties?.length ?? 0,
      }));
    },
  });
}

export interface OwnerInput {
  name: string;
  email: string | null;
  phone: string | null;
}

export function useCreateOwner() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: OwnerInput): Promise<Owner> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("owners")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Owner added", "success");
    },
  });
}

export function useUpdateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: OwnerInput }) => {
      const { error } = await supabase.from("owners").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("owners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
