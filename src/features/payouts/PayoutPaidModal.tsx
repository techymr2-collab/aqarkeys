import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { paymentMethodOptions } from "@/lib/options";
import { useMarkPayoutPaid, type PayoutWithRelations } from "@/data/payouts";
import { formatMoney, todayISO } from "@/lib/format";
import type { PaymentMethod } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  payout: PayoutWithRelations;
}

export function PayoutPaidModal({ open, onClose, payout }: Props) {
  const markPaid = useMarkPayoutPaid();
  const [paidDate, setPaidDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await markPaid.mutateAsync({ id: payout.id, paid_date: paidDate, method });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payout"
      description={`Pay ${payout.owner?.name ?? "the owner"} ${formatMoney(payout.net_amount, payout.currency)} for ${payout.property?.name ?? "this property"}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Payout date"
          type="date"
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
        />
        <Select
          label="Method"
          options={paymentMethodOptions}
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={markPaid.isPending}>
            Mark paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}
