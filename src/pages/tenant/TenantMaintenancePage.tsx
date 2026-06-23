import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { MaintenanceFormModal } from "@/features/maintenance/MaintenanceFormModal";
import { TenantMaintenanceDetailModal } from "@/features/maintenance/TenantMaintenanceDetailModal";
import { useMaintenance, useMyUnits, type MaintenanceWithRelations } from "@/data/maintenance";
import { formatDate } from "@/lib/format";
import {
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenancePriorityTone,
  maintenanceStatusLabel,
  maintenanceStatusTone,
} from "@/lib/labels";

export function TenantMaintenancePage() {
  const { data, isLoading, isError, refetch } = useMaintenance();
  const { data: units = [] } = useMyUnits();
  const [reporting, setReporting] = useState(false);
  const [viewing, setViewing] = useState<MaintenanceWithRelations | null>(null);

  const unitOptions = units.map((u) => ({ value: u.id, label: u.label }));

  if (isLoading) return <PageLoader label="Loading your requests" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Report an issue and track its progress."
        action={<Button onClick={() => setReporting(true)}>Report an issue</Button>}
      />

      {data.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Something not working? Report it and we will take care of it."
          action={<Button onClick={() => setReporting(true)}>Report an issue</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div
              key={r.id}
              className="glass-card cursor-pointer p-5 transition-shadow hover:shadow-md"
              onClick={() => setViewing(r)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{r.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {maintenanceCategoryLabel[r.category]} · reported{" "}
                    {formatDate(r.created_at.slice(0, 10))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={maintenanceStatusTone[r.status]}>
                    {maintenanceStatusLabel[r.status]}
                  </Badge>
                  <Badge tone={maintenancePriorityTone[r.priority]}>
                    {maintenancePriorityLabel[r.priority]}
                  </Badge>
                </div>
              </div>
              {r.description && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{r.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                {r.assignee ? (
                  <p className="text-xs text-slate-500">Assigned to {r.assignee}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs font-medium text-brand-600">View details →</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {reporting && (
        <MaintenanceFormModal
          open={reporting}
          onClose={() => setReporting(false)}
          units={unitOptions}
          variant="tenant"
        />
      )}
      {viewing && (
        <TenantMaintenanceDetailModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          request={viewing}
        />
      )}
    </div>
  );
}
