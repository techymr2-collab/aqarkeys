import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useUpdateLease } from "@/data/leases";
import { frequencyOptions } from "@/lib/options";
import { friendlyError } from "@/lib/errors";
import type { LeaseWithRelations } from "@/data/leases";
import type { LeaseFrequency } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  lease: LeaseWithRelations;
}

export function EditLeaseModal({ open, onClose, lease }: Props) {
  const updateLease = useUpdateLease();
  const [rentAmount, setRentAmount] = useState(String(lease.rent_amount));
  const [frequency, setFrequency] = useState<LeaseFrequency>(lease.frequency);
  const [deposit, setDeposit] = useState(String(lease.deposit_amount));
  const [endDate, setEndDate] = useState(lease.end_date);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (new Date(endDate) < new Date(lease.start_date)) {
      setError("End date cannot be before the lease start date.");
      return;
    }
    try {
      await updateLease.mutateAsync({
        id: lease.id,
        rent_amount: Number(rentAmount) || 0,
        frequency,
        deposit_amount: Number(deposit) || 0,
        end_date: endDate,
        previous: {
          rent_amount: lease.rent_amount,
          frequency: lease.frequency,
          deposit_amount: lease.deposit_amount,
          end_date: lease.end_date,
        },
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not update the lease."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit lease terms"
      description={`Adjust the terms for ${lease.tenant?.name ?? "this tenant"} mid-term — e.g. a RERA-compliant rent change. Every edit is logged to this lease's history.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Rent (${lease.currency})`}
            type="number"
            min={0}
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
          />
          <Select
            label="Frequency"
            options={frequencyOptions}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as LeaseFrequency)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Deposit (${lease.currency})`}
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={endDate}
            min={lease.start_date}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Input
          label="Reason for this change (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Annual RERA rent increase"
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={updateLease.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
