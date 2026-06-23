import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { unitStatusOptions } from "@/lib/options";
import { useCreateUnit, useUpdateUnit } from "@/data/units";
import type { Unit, UnitStatus } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  unit?: Unit;
}

export function UnitFormModal({ open, onClose, propertyId, unit }: Props) {
  const editing = !!unit;
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

  const [label, setLabel] = useState(unit?.label ?? "");
  const [beds, setBeds] = useState(String(unit?.beds ?? 1));
  const [baths, setBaths] = useState(String(unit?.baths ?? 1));
  const [status, setStatus] = useState<UnitStatus>(unit?.status ?? "vacant");
  const [marketRent, setMarketRent] = useState(String(unit?.market_rent ?? ""));
  const [error, setError] = useState<string | null>(null);

  const busy = createUnit.isPending || updateUnit.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!label.trim()) {
      setError("Give the unit a label, like Apt 101.");
      return;
    }
    const input = {
      property_id: propertyId,
      label: label.trim(),
      beds: Number(beds) || 0,
      baths: Number(baths) || 0,
      status,
      market_rent: Number(marketRent) || 0,
    };
    try {
      if (editing) {
        await updateUnit.mutateAsync({ id: unit.id, input });
      } else {
        await createUnit.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit unit" : "Add a unit"}
      description="Label the unit and set its market rent."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Label"
          placeholder="Apt 101"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Beds"
            type="number"
            min={0}
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
          />
          <Input
            label="Baths"
            type="number"
            min={0}
            step={0.5}
            value={baths}
            onChange={(e) => setBaths(e.target.value)}
          />
        </div>
        <Select
          label="Status"
          options={unitStatusOptions}
          value={status}
          onChange={(e) => setStatus(e.target.value as UnitStatus)}
        />
        <Input
          label="Market rent (per month)"
          type="number"
          min={0}
          placeholder="9000"
          value={marketRent}
          onChange={(e) => setMarketRent(e.target.value)}
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Add unit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
