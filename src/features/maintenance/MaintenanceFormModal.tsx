import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { maintenanceCategoryOptions, maintenancePriorityOptions } from "@/lib/options";
import { useCreateMaintenance } from "@/data/maintenance";
import { pushToast } from "@/lib/toast";
import type { MaintenanceCategory, MaintenancePriority } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  units: SelectOption[];
  /** Tenant-facing copy vs manager-facing copy. */
  variant?: "tenant" | "manager";
}

export function MaintenanceFormModal({ open, onClose, units, variant = "manager" }: Props) {
  const create = useCreateMaintenance();
  const [unitId, setUnitId] = useState(units.length === 1 ? units[0]!.value : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory>("general");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unitId) return setError("Pick a unit.");
    if (!title.trim()) return setError("Give the issue a short title.");
    try {
      await create.mutateAsync({
        unit_id: unitId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      });
      pushToast("Request submitted", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={variant === "tenant" ? "Report an issue" : "New work order"}
      description={
        variant === "tenant"
          ? "Tell us what needs fixing and we will take it from here."
          : "Log a maintenance issue for a unit."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Unit"
          options={units}
          placeholder="Select a unit"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
        />
        <Input
          label="Title"
          placeholder="Leaking kitchen tap"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any detail that helps, like where it is and when it started."
            rows={3}
            className="rounded-xl border border-slate-900/10 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            options={maintenanceCategoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
          />
          <Select
            label={variant === "tenant" ? "Urgency" : "Priority"}
            options={maintenancePriorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            {variant === "tenant" ? "Submit request" : "Create work order"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
