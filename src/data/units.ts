import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { Unit, UnitStatus } from "@/lib/database.types";

export interface UnitOption {
  id: string;
  label: string;
  market_rent: number;
  property: { id: string; name: string; currency: string } | null;
}

/** All units across the portfolio, with their property name and currency. */
export function useUnitOptions() {
  return useQuery({
    queryKey: ["unit-options"],
    queryFn: async (): Promise<UnitOption[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("id, label, market_rent, property:properties(id, name, currency)")
        .order("label")
        .returns<UnitOption[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["units", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("property_id", propertyId!)
        .order("label");
      if (error) throw error;
      return data;
    },
  });
}

export interface UnitInput {
  property_id: string;
  label: string;
  beds: number;
  baths: number;
  status: UnitStatus;
  market_rent: number;
}

export function useCreateUnit() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: UnitInput): Promise<Unit> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("units")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["units", vars.property_id] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      pushToast("Unit added", "success");
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UnitInput> }) => {
      const { error } = await supabase.from("units").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["units"] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
      pushToast("Unit updated", "success");
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["units", vars.propertyId] });
      void qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
