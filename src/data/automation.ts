import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { pushToast } from "@/lib/toast";
import type { AutomationRun } from "@/lib/database.types";

const KEY = ["automation-last-run"] as const;

/** The most recent scheduled-jobs run (cron or manual), or null if never run. */
export function useLastAutomationRun() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AutomationRun | null> => {
      const { data, error } = await supabase
        .from("automation_runs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Build a short human summary of what a run changed. */
export function summariseRun(run: AutomationRun): string {
  const parts: string[] = [];
  if (run.invoices_created) parts.push(`${run.invoices_created} invoice${run.invoices_created === 1 ? "" : "s"} generated`);
  if (run.leases_activated) parts.push(`${run.leases_activated} lease${run.leases_activated === 1 ? "" : "s"} activated`);
  if (run.leases_expired) parts.push(`${run.leases_expired} lease${run.leases_expired === 1 ? "" : "s"} expired`);
  if (run.invoices_flagged) parts.push(`${run.invoices_flagged} flagged overdue`);
  return parts.length ? parts.join(" · ") : "Nothing to do — everything was up to date";
}

/** Manager-triggered "Run now". Calls the same jobs the daily cron runs. */
export function useRunAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<AutomationRun> => {
      const { data, error } = await supabase.rpc("trigger_scheduled_jobs");
      if (error) throw error;
      return data as AutomationRun;
    },
    onSuccess: (run) => {
      void qc.invalidateQueries({ queryKey: KEY });
      // the jobs may have changed invoices and lease statuses
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["leases"] });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
      pushToast(`Automation ran — ${summariseRun(run)}`, "success");
    },
  });
}
