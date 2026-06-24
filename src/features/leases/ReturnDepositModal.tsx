import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useReturnDeposit } from "@/data/leases";
import { todayISO, formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { LeaseWithRelations } from "@/data/leases";
import type { DepositStatus } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  lease: LeaseWithRelations;
}

const statusOptions: { value: Exclude<DepositStatus, "held">; label: string }[] = [
  { value: "returned", label: "Returned in full" },
  { value: "partially_returned", label: "Partially returned" },
  { value: "forfeited", label: "Forfeited (kept against damages/unpaid rent)" },
];

export function ReturnDepositModal({ open, onClose, lease }: Props) {
  const returnDeposit = useReturnDeposit();
  const [status, setStatus] = useState<Exclude<DepositStatus, "held">>("returned");
  const [amount, setAmount] = useState(String(lease.deposit_amount));
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onStatusChange(next: Exclude<DepositStatus, "held">) {
    setStatus(next);
    if (next === "returned") setAmount(String(lease.deposit_amount));
    if (next === "forfeited") setAmount("0");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (isNaN(parsed) || parsed < 0) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      await returnDeposit.mutateAsync({
        id: lease.id,
        status,
        amount: parsed,
        date,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not update the deposit."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Return security deposit"
      description={`Resolve the ${formatMoney(lease.deposit_amount, lease.currency)} deposit held for ${lease.tenant?.name ?? "this tenant"}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Outcome"
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as Exclude<DepositStatus, "held">)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Amount returned (${lease.currency})`}
            type="number"
            min={0}
            max={lease.deposit_amount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={status === "forfeited"}
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={status === "forfeited" ? "Reason for forfeiting the deposit" : "Deductions, condition of unit, etc."}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={returnDeposit.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
