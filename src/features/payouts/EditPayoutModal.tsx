import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUpdatePayout, type PayoutWithRelations } from "@/data/payouts";
import { formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";

interface Props {
  open: boolean;
  onClose: () => void;
  payout: PayoutWithRelations;
}

export function EditPayoutModal({ open, onClose, payout }: Props) {
  const update = useUpdatePayout();
  const [gross, setGross] = useState(String(payout.gross_collected));
  const [expenses, setExpenses] = useState(String(payout.expenses_total));
  const [feePercent, setFeePercent] = useState(String(payout.fee_percent));
  const [note, setNote] = useState(payout.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const g = Number(gross) || 0;
  const e = Number(expenses) || 0;
  const f = Number(feePercent) || 0;
  const feeAmount = Math.round(((g * f) / 100) * 100) / 100;
  const net = g - e - feeAmount;

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        id: payout.id,
        input: { gross_collected: g, expenses_total: e, fee_percent: f, note: note.trim() || null },
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not update this payout."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit payout"
      description={`Fix the numbers for ${payout.owner?.name ?? "this owner"}'s ${payout.property?.name ?? "property"} payout before it's paid.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Collected (${payout.currency})`}
            type="number"
            min={0}
            value={gross}
            onChange={(ev) => setGross(ev.target.value)}
          />
          <Input
            label={`Expenses (${payout.currency})`}
            type="number"
            min={0}
            value={expenses}
            onChange={(ev) => setExpenses(ev.target.value)}
          />
        </div>
        <Input
          label="Management fee (%)"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={feePercent}
          onChange={(ev) => setFeePercent(ev.target.value)}
        />
        <div className="rounded-xl bg-slate-900/[0.03] p-3 text-sm text-slate-700">
          <div className="flex justify-between">
            <span>Fee amount</span>
            <span className="tabular-nums">{formatMoney(feeAmount, payout.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold text-slate-900">
            <span>Net to owner</span>
            <span className="tabular-nums">{formatMoney(net, payout.currency)}</span>
          </div>
        </div>
        <Input
          label="Note (optional)"
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          placeholder="e.g. Excluded a duplicate expense entry"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
