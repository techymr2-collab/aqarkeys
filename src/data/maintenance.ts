import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { todayISO } from "@/lib/format";
import type {
  CurrencyCode,
  MaintenanceApprovalStatus,
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

// reported_by and approved_by are both FKs to profiles, so the embed must
// name which relationship it means — PostgREST can't infer it anymore.
const SELECT =
  "*, unit:units(id, label, property:properties(id, name, currency)), reporter:profiles!maintenance_requests_reported_by_fkey(full_name)";

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
  due_date?: string | null;
  quoted_cost?: number | null;
  vendor_rating?: number | null;
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: MaintenanceUpdate }) => {
      const payload: MaintenanceUpdate & { cost_approval_status?: MaintenanceApprovalStatus } = {
        ...input,
      };
      // Entering or changing a quote (re-)opens the approval gate; clearing
      // it drops the requirement entirely. This is a deliberate reset — an
      // edited quote needs fresh sign-off, even if the old one was approved.
      if ("quoted_cost" in input) {
        payload.cost_approval_status = input.quoted_cost == null ? "not_required" : "pending";
      }
      const { error } = await supabase
        .from("maintenance_requests")
        .update(payload)
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

/** Approves a pending cost quote, recording who and when. */
export function useApproveQuote() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile) throw new Error("Not signed in");
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          cost_approval_status: "approved",
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Quote approved", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not approve the quote."), "error"),
  });
}

/** Rejects a pending cost quote — the manager will need a revised one. */
export function useRejectQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ cost_approval_status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Quote rejected", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not reject the quote."), "error"),
  });
}

const OPEN_STATUSES: MaintenanceStatus[] = ["submitted", "in_progress", "on_hold"];

/** True for an open request whose due_date has already passed. */
export function isOverdue(request: { status: MaintenanceStatus; due_date: string | null }): boolean {
  if (!request.due_date) return false;
  if (!OPEN_STATUSES.includes(request.status)) return false;
  return request.due_date < todayISO();
}
