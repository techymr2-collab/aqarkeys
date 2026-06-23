import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type {
  CurrencyCode,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
} from "@/lib/database.types";

export interface MaintenanceWithRelations extends MaintenanceRequest {
  unit: {
    id: string;
    label: string;
    property: { id: string; name: string; currency: CurrencyCode } | null;
  } | null;
  reporter: { full_name: string } | null;
}

const SELECT =
  "*, unit:units(id, label, property:properties(id, name, currency)), reporter:profiles(full_name)";

const KEY = ["maintenance"] as const;

/** Units visible to the current user (RLS scopes tenants to their own). */
export function useMyUnits() {
  return useQuery({
    queryKey: ["my-units"],
    queryFn: async (): Promise<{ id: string; label: string }[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("id, label, property:properties(name)")
        .order("label")
        .returns<{ id: string; label: string; property: { name: string } | null }[]>();
      if (error) throw error;
      return data.map((u) => ({
        id: u.id,
        label: u.property ? `${u.property.name} · ${u.label}` : u.label,
      }));
    },
  });
}

export function useMaintenance() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<MaintenanceWithRelations[]> => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .returns<MaintenanceWithRelations[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface MaintenanceInput {
  unit_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: MaintenanceInput): Promise<MaintenanceRequest> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("maintenance_requests")
        .insert({ ...input, org_id: profile.org_id, reported_by: profile.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface MaintenanceUpdate {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  assignee?: string | null;
  vendor_id?: string | null;
  cost?: number | null;
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: MaintenanceUpdate }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      // a resolved request with a cost creates an expense + can change stats
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
    },
  });
}
