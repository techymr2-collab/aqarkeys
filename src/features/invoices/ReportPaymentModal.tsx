import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { paymentMethodOptions } from "@/lib/options";
import { useReportPayment } from "@/data/tenantPortal";
import { formatMoney } from "@/lib/format";
import type { Invoice, PaymentMethod } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function ReportPaymentModal({ open, onClose, invoice }: Props) {
  const report = useReportPayment();
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await report.mutateAsync({ invoiceId: invoice.id, method });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report a payment"
      description={`Let your manager know you paid ${formatMoney(invoice.amount, invoice.currency)}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          We record this as sent for your manager to confirm. This does not move money.
        </p>
        <Select
          label="How did you pay?"
          options={paymentMethodOptions}
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={report.isPending}>
            Report payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
