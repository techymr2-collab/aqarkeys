import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { useMaintenance } from "@/data/maintenance";
import { formatDate, formatMoney } from "@/lib/format";
import {
  maintenancePriorityLabel,
  maintenancePriorityTone,
  maintenanceStatusLabel,
  maintenanceStatusTone,
} from "@/lib/labels";

export function OwnerMaintenancePage() {
  const { data, isLoading, isError, refetch } = useMaintenance();

  if (isLoading) return <PageLoader label="Loading maintenance" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Work orders on your properties and what they cost."
      />

      {data.length === 0 ? (
        <EmptyState
          title="No work orders"
          description="Maintenance raised on your properties will appear here."
        />
      ) : (
        <Table>
          <THead>
            <TH>Issue</TH>
            <TH>Unit</TH>
            <TH>Priority</TH>
            <TH>Status</TH>
            <TH className="text-right">Cost</TH>
          </THead>
          <TBody>
            {data.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium text-slate-900">
                  <div>{r.title}</div>
                  <div className="text-xs text-slate-500">{formatDate(r.created_at.slice(0, 10))}</div>
                </TD>
                <TD>
                  <div>{r.unit?.label ?? "—"}</div>
                  <div className="text-xs text-slate-500">{r.unit?.property?.name ?? ""}</div>
                </TD>
                <TD>
                  <Badge tone={maintenancePriorityTone[r.priority]}>
                    {maintenancePriorityLabel[r.priority]}
                  </Badge>
                </TD>
                <TD>
                  <Badge tone={maintenanceStatusTone[r.status]}>
                    {maintenanceStatusLabel[r.status]}
                  </Badge>
                </TD>
                <TD className="text-right">
                  {r.cost != null && r.unit?.property
                    ? formatMoney(r.cost, r.unit.property.currency)
                    : "—"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
