import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { CurrencyCode, Property } from "@/lib/database.types";

export interface PropertyWithStats extends Property {
  owner: { id: string; name: string } | null;
  unit_count: number;
  occupied_count: number;
}

const KEY = ["properties"] as const;

export function useProperties() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PropertyWithStats[]> => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, owner:owners(id, name), units(status)")
        .order("name")
        .returns<
          (Property & {
            owner: { id: string; name: string } | null;
            units: { status: string }[];
          })[]
        >();
      if (error) throw error;
      return data.map((p) => {
        const { units, ...rest } = p;
        return {
          ...rest,
          unit_count: units.length,
          occupied_count: units.filter((u) => u.status === "occupied").length,
        };
      });
    },
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["properties", id],
    enabled: !!id,
    queryFn: async (): Promise<PropertyWithStats> => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, owner:owners(id, name), units(status)")
        .eq("id", id!)
        .single<
          Property & {
            owner: { id: string; name: string } | null;
            units: { status: string }[];
          }
        >();
      if (error) throw error;
      const { units, ...rest } = data;
      return {
        ...rest,
        unit_count: units.length,
        occupied_count: units.filter((u) => u.status === "occupied").length,
      };
    },
  });
}

export interface PropertyInput {
  name: string;
  owner_id: string;
  address: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  management_fee_percent: number;
  vat_rate: number;
}

export function useCreateProperty() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: PropertyInput): Promise<Property> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Property created", "success");
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PropertyInput }) => {
      const { error } = await supabase.from("properties").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["properties", vars.id] });
      pushToast("Property updated", "success");
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
