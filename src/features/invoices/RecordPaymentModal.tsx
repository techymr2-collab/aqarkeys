import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { paymentMethodOptions } from "@/lib/options";
import { useRecordPayment } from "@/data/invoices";
import { useInvoiceLineItems } from "@/data/invoiceLineItems";
import { todayISO, formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { InvoiceWithRelations } from "@/data/invoices";
import type { PaymentMethod } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations;
}

export function RecordPaymentModal({ open, onClose, invoice }: Props) {
  const recordPayment = useRecordPayment();
  const lineItems = useInvoiceLineItems(invoice.id);
  const lineItemsTotal = (lineItems.data ?? []).reduce((s, li) => s + li.amount, 0);
  const total = invoice.amount + invoice.vat_amount + invoice.late_fee + lineItemsTotal;
  const remaining = Math.max(total - invoice.amount_paid, 0);

  const [amount, setAmount] = useState(String(remaining));
  const [amountTouched, setAmountTouched] = useState(false);
  const [paidDate, setPaidDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>(
    invoice.payment_reported_method ?? "bank_transfer",
  );
  const [error, setError] = useState<string | null>(null);

  // Line items load async; once they resolve, refresh the prefilled amount
  // to the now-accurate remaining balance — unless the user already typed
  // their own value.
  useEffect(() => {
    if (!amountTouched) setAmount(String(remaining));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const parsedAmount = Number(amount) || 0;
  const willFullyPay = invoice.amount_paid + parsedAmount >= total;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (parsedAmount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    try {
      await recordPayment.mutateAsync({
        id: invoice.id,
        amount: parsedAmount,
        total,
        amountPaidSoFar: invoice.amount_paid,
        date: paidDate,
        method,
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not record the payment."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={`Record a payment for ${invoice.lease?.tenant?.name ?? "the tenant"}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {invoice.payment_reported_at && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-800">
            The tenant reported this as paid. Confirm the details below.
          </div>
        )}
        {invoice.amount_paid > 0 && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {formatMoney(invoice.amount_paid, invoice.currency)} already paid · {formatMoney(remaining, invoice.currency)} remaining of {formatMoney(total, invoice.currency)}
          </div>
        )}
        <Input
          label={`Payment amount (${invoice.currency})`}
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
        />
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
        {!willFullyPay && parsedAmount > 0 && (
          <p className="text-xs text-amber-600">
            This is a partial payment — the invoice will stay {invoice.status} with{" "}
            {formatMoney(total - invoice.amount_paid - parsedAmount, invoice.currency)} still owing.
          </p>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={recordPayment.isPending}>
            {willFullyPay ? "Mark as paid" : "Record partial payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
