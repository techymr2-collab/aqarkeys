import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { todayISO } from "@/lib/format";
import type { MaintenanceCategory, MaintenancePriority, MaintenanceSchedule } from "@/lib/database.types";

export interface ScheduleWithUnit extends MaintenanceSchedule {
  unit: { id: string; label: string; property: { id: string; name: string } | null } | null;
}

const SELECT = "*, unit:units(id, label, property:properties(id, name))";
const KEY = ["maintenance-schedules"] as const;

export function useMaintenanceSchedules() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ScheduleWithUnit[]> => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select(SELECT)
        .order("next_run_date")
        .returns<ScheduleWithUnit[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface ScheduleInput {
  unit_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  frequency_months: number;
  next_run_date: string;
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: ScheduleInput) => {
      if (!profile) throw new Error("Not signed in");
      const { error } = await supabase
        .from("maintenance_schedules")
        .insert({ ...input, org_id: profile.org_id, created_by: profile.id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Recurring job scheduled", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not create the schedule."), "error"),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ScheduleInput & { id: string }) => {
      const { error } = await supabase.from("maintenance_schedules").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Schedule updated", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not update the schedule."), "error"),
  });
}

export function useSetScheduleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("maintenance_schedules").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      pushToast("Schedule removed", "success");
    },
    onError: (err) => pushToast(friendlyError(err, "Could not delete the schedule."), "error"),
  });
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates a maintenance request for every due schedule (next_run_date in
 * the past or today), then advances each schedule's next_run_date by its
 * frequency — mirroring how rent invoices are generated from the lease
 * schedule.
 */
export function useGenerateDueMaintenance() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (schedules: ScheduleWithUnit[]): Promise<number> => {
      if (!profile) throw new Error("Not signed in");
      const today = todayISO();
      const due = schedules.filter((s) => s.active && s.next_run_date <= today);
      if (due.length === 0) return 0;

      const rows = due.map((s) => ({
        org_id: profile.org_id,
        unit_id: s.unit_id,
        title: s.title,
        description: s.description,
        category: s.category,
        priority: s.priority,
        status: "submitted" as const,
      }));
      const { error: insertErr } = await supabase.from("maintenance_requests").insert(rows);
      if (insertErr) throw insertErr;

      await Promise.all(
        due.map((s) =>
          supabase
            .from("maintenance_schedules")
            .update({ next_run_date: addMonths(s.next_run_date, s.frequency_months) })
            .eq("id", s.id),
        ),
      );
      return due.length;
    },
    onSuccess: (count) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      pushToast(
        count > 0 ? `${count} job${count === 1 ? "" : "s"} created` : "Nothing due yet",
        "success",
      );
    },
    onError: (err) => pushToast(friendlyError(err, "Could not generate due jobs."), "error"),
  });
}
