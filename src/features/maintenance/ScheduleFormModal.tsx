import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { maintenanceCategoryOptions, maintenancePriorityOptions } from "@/lib/options";
import { useCreateSchedule, useUpdateSchedule, type ScheduleWithUnit } from "@/data/maintenanceSchedules";
import { todayISO } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { MaintenanceCategory, MaintenancePriority } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  units: SelectOption[];
  schedule?: ScheduleWithUnit;
}

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "1", label: "Every month" },
  { value: "3", label: "Every 3 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every year" },
];

export function ScheduleFormModal({ open, onClose, units, schedule }: Props) {
  const isEdit = !!schedule;
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const [unitId, setUnitId] = useState(schedule?.unit_id ?? (units.length === 1 ? units[0]!.value : ""));
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [description, setDescription] = useState(schedule?.description ?? "");
  const [category, setCategory] = useState<MaintenanceCategory>(schedule?.category ?? "general");
  const [priority, setPriority] = useState<MaintenancePriority>(schedule?.priority ?? "medium");
  const [frequencyMonths, setFrequencyMonths] = useState(String(schedule?.frequency_months ?? 3));
  const [nextRunDate, setNextRunDate] = useState(schedule?.next_run_date ?? todayISO());
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unitId) return setError("Pick a unit.");
    if (!title.trim()) return setError("Give the job a short title.");
    const input = {
      unit_id: unitId,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      frequency_months: Number(frequencyMonths) || 3,
      next_run_date: nextRunDate,
    };
    try {
      if (isEdit && schedule) {
        await update.mutateAsync({ id: schedule.id, ...input });
      } else {
        await create.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not save the schedule."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit recurring job" : "New recurring job"}
      description="Preventive maintenance that repeats on a schedule — e.g. AC servicing every 3 months."
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
          placeholder="AC filter service"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
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
            label="Priority"
            options={maintenancePriorityOptions}
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Repeats"
            options={FREQUENCY_OPTIONS}
            value={frequencyMonths}
            onChange={(e) => setFrequencyMonths(e.target.value)}
          />
          <Input
            label="Next due"
            type="date"
            value={nextRunDate}
            onChange={(e) => setNextRunDate(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {isEdit ? "Save changes" : "Create schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
