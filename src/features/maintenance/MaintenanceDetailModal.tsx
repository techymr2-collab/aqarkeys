import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  maintenanceCategoryOptions,
  maintenancePriorityOptions,
  maintenanceStatusOptions,
} from "@/lib/options";
import { maintenanceCategoryLabel } from "@/lib/labels";
import { useUpdateMaintenance, type MaintenanceWithRelations } from "@/data/maintenance";
import { useVendorOptions } from "@/data/vendors";
import { formatDate, formatMoney } from "@/lib/format";
import { pushToast } from "@/lib/toast";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  request: MaintenanceWithRelations;
}

export function MaintenanceDetailModal({ open, onClose, request }: Props) {
  const update = useUpdateMaintenance();
  const { data: vendors = [] } = useVendorOptions();
  const currency = request.unit?.property?.currency ?? "AED";

  const [status, setStatus] = useState<MaintenanceStatus>(request.status);
  const [priority, setPriority] = useState<MaintenancePriority>(request.priority);
  const [category, setCategory] = useState<MaintenanceCategory>(request.category);
  const [vendorId, setVendorId] = useState(request.vendor_id ?? "");
  const [assignee, setAssignee] = useState(request.assignee ?? "");
  const [cost, setCost] = useState(request.cost != null ? String(request.cost) : "");
  const [error, setError] = useState<string | null>(null);

  const vendorOptions = [
    { value: "", label: "— No vendor —" },
    ...vendors.map((v) => ({
      value: v.id,
      label: `${v.name} · ${maintenanceCategoryLabel[v.trade]}`,
    })),
  ];

  // Picking a vendor fills in the assignee name (still editable) so the
  // contractor shows up everywhere the assignee text is displayed.
  function chooseVendor(id: string) {
    setVendorId(id);
    const vendor = vendors.find((v) => v.id === id);
    if (vendor) setAssignee(vendor.name);
  }

  const willLogExpense =
    status === "resolved" && Number(cost) > 0 && !request.expense_id;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        id: request.id,
        input: {
          status,
          priority,
          category,
          vendor_id: vendorId || null,
          assignee: assignee.trim() || null,
          cost: cost === "" ? null : Number(cost),
        },
      });
      pushToast(
        willLogExpense ? "Resolved. Cost logged to the owner statement." : "Work order updated",
        "success",
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={request.title} description={`${request.unit?.property?.name ?? ""} · ${request.unit?.label ?? ""}`} size="lg">
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Category {maintenanceCategoryLabel[request.category]}</span>
          <span>·</span>
          <span>Reported {formatDate(request.created_at.slice(0, 10))}</span>
          {request.reporter?.full_name && (
            <>
              <span>·</span>
              <span>by {request.reporter.full_name}</span>
            </>
          )}
        </div>
        {request.description && (
          <p className="rounded-xl bg-slate-900/[0.03] p-3 text-sm text-slate-700">
            {request.description}
          </p>
        )}
        {request.expense_id && (
          <Badge tone="green">Cost logged to owner statement</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            options={maintenanceStatusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
          />
          <Select
            label="Priority"
            options={maintenancePriorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
          />
          <Select
            label="Category"
            options={maintenanceCategoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
          />
          <Select
            label="Vendor"
            options={vendorOptions}
            placeholder="— No vendor —"
            value={vendorId}
            onChange={(e) => chooseVendor(e.target.value)}
          />
        </div>
        <Input
          label="Assigned to"
          placeholder="Contractor or staff name"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <Input
          label={`Cost (${currency})`}
          type="number"
          min={0}
          placeholder="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        {willLogExpense && (
          <p className="text-sm text-emerald-700">
            Resolving with a cost of {formatMoney(Number(cost), currency)} will add a Maintenance
            expense to this property.
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
