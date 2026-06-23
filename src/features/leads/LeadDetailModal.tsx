import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useUpdateLeadStage } from "@/data/leads";
import { leadStageLabel, leadStageTone } from "@/lib/labels";
import { leadStageOptions } from "@/lib/options";
import { formatDate, formatMoney } from "@/lib/format";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { LeadWithUnit } from "@/data/leads";
import type { LeadStage } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: LeadWithUnit;
  onEdit: () => void;
  onConvert: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function LeadDetailModal({ open, onClose, lead, onEdit, onConvert }: Props) {
  const updateStage = useUpdateLeadStage();
  const closed = lead.stage === "converted" || lead.stage === "lost";
  const unit = lead.unit ? `${lead.unit.property?.name ?? ""} · ${lead.unit.label}` : "No specific unit";

  async function changeStage(stage: LeadStage) {
    if (stage === lead.stage) return;
    try {
      await updateStage.mutateAsync({ id: lead.id, stage });
    } catch (err) {
      pushToast(friendlyError(err, "Could not move the lead."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={lead.name} description={unit}>
      <div className="mb-4">
        <Badge tone={leadStageTone[lead.stage]}>{leadStageLabel[lead.stage]}</Badge>
      </div>

      <div className="divide-y divide-slate-900/[0.06]">
        {lead.email && <Row label="Email" value={lead.email} />}
        {lead.phone && <Row label="Phone" value={lead.phone} />}
        <Row label="Source" value={lead.source ?? "—"} />
        <Row label="Budget" value={lead.budget != null ? formatMoney(lead.budget, "AED") : "—"} />
        <Row label="Desired move-in" value={lead.desired_move_in ? formatDate(lead.desired_move_in) : "—"} />
        <Row label="Added" value={formatDate(lead.created_at.slice(0, 10))} />
      </div>

      {lead.notes && (
        <p className="mt-3 rounded-xl bg-slate-900/[0.03] p-3 text-sm text-slate-700">{lead.notes}</p>
      )}

      {!closed && (
        <div className="mt-5">
          <Select
            label="Stage"
            options={leadStageOptions.filter((o) => o.value !== "converted")}
            value={lead.stage}
            onChange={(e) => void changeStage(e.target.value as LeadStage)}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Use “Convert to lease” to mark this lead won — it creates the tenant and opens a pre-filled lease.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!closed && <Button onClick={onConvert}>Convert to lease</Button>}
        </div>
      </div>
    </Modal>
  );
}
