import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { paymentMethodOptions } from "@/lib/options";
import { useBulkMarkPaid, type InvoiceWithRelations } from "@/data/invoices";
import { todayISO, formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { PaymentMethod } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  invoices: InvoiceWithRelations[];
  onDone: () => void;
}

export function BulkMarkPaidModal({ open, onClose, invoices, onDone }: Props) {
  const bulkMarkPaid = useBulkMarkPaid();
  const [paidDate, setPaidDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [error, setError] = useState<string | null>(null);

  const total = invoices.reduce((s, i) => s + i.amount + i.vat_amount + i.late_fee, 0);
  const currency = invoices[0]?.currency ?? "AED";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await bulkMarkPaid.mutateAsync({
        rows: invoices.map((i) => ({ id: i.id, amount: i.amount, vat_amount: i.vat_amount, late_fee: i.late_fee })),
        date: paidDate,
        method,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not mark these invoices paid."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark invoices paid"
      description={`Mark ${invoices.length} invoice${invoices.length === 1 ? "" : "s"} as fully paid.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Total {formatMoney(total, currency)} across {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
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
            Mark {invoices.length} paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}
