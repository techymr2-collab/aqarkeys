import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { leadStageLabel } from "@/lib/labels";
import type { Lead, LeadStage } from "@/lib/database.types";

export type LeadWithUnit = Lead & {
  unit: { id: string; label: string; property: { id: string; name: string } | null } | null;
};

const KEY = ["leads"] as const;

export function useLeads() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<LeadWithUnit[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, unit:units(id, label, property:properties(id, name))")
        .order("created_at", { ascending: false })
        .returns<LeadWithUnit[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface LeadInput {
  name: string;
  email: string | null;
  phone: string | null;
  unit_id: string | null;
  stage: LeadStage;
  source: string | null;
  budget: number | null;
  desired_move_in: string | null;
  notes: string | null;
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: LeadInput): Promise<Lead> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Lead added", "success");
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Lead> }) => {
      const { error } = await supabase.from("leads").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Quick stage change from the pipeline board. */
export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LeadStage }) => {
      const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { stage }) => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast(`Moved to ${leadStageLabel[stage]}`, "success");
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Lead removed", "success");
    },
  });
}
