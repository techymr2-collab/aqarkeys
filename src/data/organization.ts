import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { pushToast } from "@/lib/toast";
import type { Organization, Profile } from "@/lib/database.types";

const KEY = ["organization"] as const;

export function useOrganization() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Organization | null> => {
      const { data, error } = await supabase.from("organizations").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface OrgUpdateInput {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  trn?: string | null;
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: OrgUpdateInput) => {
      const { error } = await supabase.from("organizations").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Organization updated", "success");
    },
  });
}

/** Team members in the org (managers can see all org profiles). */
export function useOrgMembers() {
  return useQuery({
    queryKey: ["org-members"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}
