import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { paymentMethodOptions } from "@/lib/options";
import { useBulkMarkPayoutsPaid, type PayoutWithRelations } from "@/data/payouts";
import { todayISO, formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { CurrencyCode, PaymentMethod } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  payouts: PayoutWithRelations[];
  onDone: () => void;
}

export function BulkMarkPayoutsPaidModal({ open, onClose, payouts, onDone }: Props) {
  const bulkMarkPaid = useBulkMarkPayoutsPaid();
  const [paidDate, setPaidDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [error, setError] = useState<string | null>(null);

  const totalsByCurrency = new Map<string, number>();
  for (const p of payouts) {
    totalsByCurrency.set(p.currency, (totalsByCurrency.get(p.currency) ?? 0) + p.net_amount);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await bulkMarkPaid.mutateAsync({
        ids: payouts.map((p) => p.id),
        paid_date: paidDate,
        method,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not mark these payouts paid."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark payouts paid"
      description={`Settle ${payouts.length} payout${payouts.length === 1 ? "" : "s"} for month-end.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {[...totalsByCurrency.entries()].map(([currency, amount]) => (
            <div key={currency}>{formatMoney(amount, currency as CurrencyCode)} total</div>
          ))}
        </div>
        <Input
          label="Payment date"
          type="date"
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
        />
        <Select
          label="Payment method"
          options={paymentMethodOptions}
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={bulkMarkPaid.isPending}>
            Mark {payouts.length} paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}
