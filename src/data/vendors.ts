import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import type { MaintenanceCategory, Vendor } from "@/lib/database.types";

const KEY = ["vendors"] as const;
const PICKER_KEY = ["vendor-picker"] as const;

type VendorRow = Vendor & { maintenance_requests: { id: string }[] };
export type VendorWithCount = Vendor & { job_count: number };
export type VendorOption = Pick<Vendor, "id" | "name" | "trade">;

export function useVendors() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<VendorWithCount[]> => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*, maintenance_requests(id)")
        .order("name")
        .returns<VendorRow[]>();
      if (error) throw error;
      return data.map((v) => ({
        ...v,
        job_count: v.maintenance_requests?.length ?? 0,
      }));
    },
  });
}

/** Lightweight list of active vendors for assignment pickers. */
export function useVendorOptions() {
  return useQuery({
    queryKey: PICKER_KEY,
    queryFn: async (): Promise<VendorOption[]> => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, trade")
        .eq("is_active", true)
        .order("name")
        .returns<VendorOption[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface VendorInput {
  name: string;
  company: string | null;
  trade: MaintenanceCategory;
  email: string | null;
  phone: string | null;
  notes: string | null;
  hourly_rate: number | null;
  rating: number | null;
  is_active: boolean;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: KEY });
  void qc.invalidateQueries({ queryKey: PICKER_KEY });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: VendorInput): Promise<Vendor> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("vendors")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate(qc);
      pushToast("Vendor added", "success");
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VendorInput }) => {
      const { error } = await supabase.from("vendors").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(qc);
      // a work order may have just lost its vendor link
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
}
