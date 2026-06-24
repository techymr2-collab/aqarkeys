import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useVoidPayout, type PayoutWithRelations } from "@/data/payouts";
import { formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";

interface Props {
  open: boolean;
  onClose: () => void;
  payout: PayoutWithRelations;
}

export function VoidPayoutModal({ open, onClose, payout }: Props) {
  const voidPayout = useVoidPayout();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await voidPayout.mutateAsync({ id: payout.id, reason: reason.trim() || null });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not void this payout."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Void payout"
      description={`Cancel the ${formatMoney(payout.net_amount, payout.currency)} payout to ${payout.owner?.name ?? "this owner"}${payout.status === "paid" ? " — it was already marked paid, so make sure any sent funds are handled outside the app" : ""}. The record stays for your audit trail.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Wrong property, expenses miscounted"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" loading={voidPayout.isPending}>
            Void payout
          </Button>
        </div>
      </form>
    </Modal>
  );
}
