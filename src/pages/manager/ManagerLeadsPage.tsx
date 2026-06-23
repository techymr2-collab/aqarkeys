import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableSkeleton } from "@/components/ui/Table";
import { LeadFormModal } from "@/features/leads/LeadFormModal";
import { LeadDetailModal } from "@/features/leads/LeadDetailModal";
import { LeaseFormModal } from "@/features/leases/LeaseFormModal";
import { useLeads, useUpdateLead, type LeadWithUnit } from "@/data/leads";
import { useCreateTenant } from "@/data/tenants";
import { leadStageLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import type { LeadStage } from "@/lib/database.types";

const PIPELINE: LeadStage[] = ["new", "viewing", "application", "approved"];

const COLUMN_ACCENT: Record<string, string> = {
  new: "bg-blue-400",
  viewing: "bg-brand-400",
  application: "bg-amber-400",
  approved: "bg-emerald-400",
};

interface ConvertState {
  lead: LeadWithUnit;
  tenantId: string;
}

export function ManagerLeadsPage() {
  const leads = useLeads();
  const createTenant = useCreateTenant();
  const updateLead = useUpdateLead();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LeadWithUnit | null>(null);
  const [viewing, setViewing] = useState<LeadWithUnit | null>(null);
  const [converting, setConverting] = useState<ConvertState | null>(null);

  const { byStage, won, lost, conversionRate, activeCount } = useMemo(() => {
    const byStage = new Map<LeadStage, LeadWithUnit[]>();
    for (const s of PIPELINE) byStage.set(s, []);
    let won = 0;
    let lost = 0;
    for (const l of leads.data ?? []) {
      if (l.stage === "converted") won++;
      else if (l.stage === "lost") lost++;
      else byStage.get(l.stage)?.push(l);
    }
    const closed = won + lost;
    const activeCount = PIPELINE.reduce((n, s) => n + (byStage.get(s)?.length ?? 0), 0);
    return {
      byStage,
      won,
      lost,
      conversionRate: closed ? Math.round((won / closed) * 100) : 0,
      activeCount,
    };
  }, [leads.data]);

  async function startConvert(lead: LeadWithUnit) {
    setViewing(null);
    try {
      const tenant = await createTenant.mutateAsync({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      });
      setConverting({ lead, tenantId: tenant.id });
    } catch (err) {
      pushToast(friendlyError(err, "Could not start conversion."), "error");
    }
  }

  const hasData = !!leads.data && leads.data.length > 0;

  return (
    <div>
      <PageHeader
        title="Leasing Pipeline"
        subtitle="Track prospective tenants from first enquiry to a signed lease."
        action={<Button onClick={() => setAdding(true)}>Add lead</Button>}
      />

      {leads.isLoading && <TableSkeleton rows={4} cols={4} />}
      {leads.isError && <ErrorState onRetry={() => void leads.refetch()} />}

      {leads.data && leads.data.length === 0 && (
        <EmptyState
          title="No leads yet"
          description="Add a prospective tenant to start tracking your leasing pipeline."
          action={<Button onClick={() => setAdding(true)}>Add lead</Button>}
        />
      )}

      {hasData && (
        <>
          {/* KPI strip */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="In pipeline" value={String(activeCount)} hint="active leads" />
            <Kpi label="Converted" value={String(won)} hint="won" tone="emerald" />
            <Kpi label="Lost" value={String(lost)} hint="closed out" tone="rose" />
            <Kpi label="Conversion" value={`${conversionRate}%`} hint="won of closed" tone="brand" />
          </div>

          {/* Pipeline board */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((stage) => {
              const items = byStage.get(stage) ?? [];
              return (
                <div key={stage} className="flex flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", COLUMN_ACCENT[stage])} />
                    <h3 className="text-sm font-semibold text-slate-700">{leadStageLabel[stage]}</h3>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {items.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                        Nothing here
                      </p>
                    )}
                    {items.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setViewing(l)}
                        className="glass-card cursor-pointer p-3.5 text-left transition-shadow hover:shadow-md"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{l.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {l.unit ? `${l.unit.property?.name ?? ""} · ${l.unit.label}` : "No unit"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {l.budget != null && (
                            <span className="font-medium text-slate-700">{formatMoney(l.budget, "AED")}</span>
                          )}
                          {l.source && <span className="text-slate-400">{l.source}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <LeadFormModal open={adding} onClose={() => setAdding(false)} />
      {editing && (
        <LeadFormModal open onClose={() => setEditing(null)} lead={editing} />
      )}
      {viewing && (
        <LeadDetailModal
          open
          onClose={() => setViewing(null)}
          lead={viewing}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onConvert={() => void startConvert(viewing)}
        />
      )}
      {converting && (
        <LeaseFormModal
          open
          onClose={() => setConverting(null)}
          defaultUnitId={converting.lead.unit_id ?? undefined}
          defaultTenantId={converting.tenantId}
          defaultRent={converting.lead.budget}
          onCreated={(lease) => {
            void updateLead.mutateAsync({
              id: converting.lead.id,
              input: { stage: "converted", tenant_id: converting.tenantId, lease_id: lease.id },
            });
            pushToast("Lead converted to a lease", "success");
            setConverting(null);
          }}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "emerald" | "rose" | "brand";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "rose"
        ? "text-rose-600"
        : tone === "brand"
          ? "text-brand-600"
          : "text-slate-900";
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold", color)}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
