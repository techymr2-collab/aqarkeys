import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useLeases } from "@/data/leases";
import { useCreateInvoice, useUpdateInvoice, vatFor, type InvoiceWithRelations } from "@/data/invoices";
import { addMonths, MONTHS_BY_FREQUENCY } from "@/lib/invoicePeriods";
import { todayISO, formatMoney } from "@/lib/format";
import { friendlyError } from "@/lib/errors";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Provide to edit an existing invoice; omit to create a new one. */
  invoice?: InvoiceWithRelations;
}

export function InvoiceFormModal({ open, onClose, invoice }: Props) {
  const isEdit = !!invoice;
  const { data: leases = [] } = useLeases();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const [leaseId, setLeaseId] = useState(invoice?.lease_id ?? "");
  const [periodStart, setPeriodStart] = useState(invoice?.period_start ?? todayISO());
  const [periodEnd, setPeriodEnd] = useState(invoice?.period_end ?? addMonths(todayISO(), 1));
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? todayISO());
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [asDraft, setAsDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLeases = leases.filter((l) => l.status === "active");
  const leaseOptions = activeLeases.map((l) => ({
    value: l.id,
    label: [l.tenant?.name, l.unit?.label, l.unit?.property?.name].filter(Boolean).join(" · "),
  }));
  const selectedLease = leases.find((l) => l.id === leaseId);

  // Prefill rent amount + a sensible period end when a lease is first picked (create mode only).
  useEffect(() => {
    if (isEdit || !selectedLease) return;
    setAmount(String(selectedLease.rent_amount));
    setPeriodEnd(addMonths(periodStart, MONTHS_BY_FREQUENCY[selectedLease.frequency]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  const vatRate = selectedLease?.unit?.property?.vat_rate ?? 0;
  const parsedAmount = Number(amount) || 0;
  const vatAmount = vatFor(parsedAmount, vatRate);
  const currency = selectedLease?.currency ?? invoice?.currency ?? "AED";
  const canEditCore = !invoice || (invoice.status !== "paid" && invoice.status !== "void");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!leaseId) {
      setError("Select a lease.");
      return;
    }
    if (parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    try {
      if (isEdit && invoice) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          amount: parsedAmount,
          due_date: dueDate,
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes.trim() || null,
        });
      } else {
        await createInvoice.mutateAsync({
          lease_id: leaseId,
          period_start: periodStart,
          period_end: periodEnd,
          due_date: dueDate,
          amount: parsedAmount,
          vat_amount: vatAmount,
          currency,
          status: asDraft ? "draft" : "sent",
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not save the invoice."));
    }
  }

  const pending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit invoice" : "New invoice"}
      description={
        isEdit
          ? "Adjust the period, due date, amount, or notes."
          : "Bill an ad-hoc charge against a lease, outside the automatic rent schedule."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isEdit ? (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {[invoice?.lease?.tenant?.name, invoice?.lease?.unit?.label, invoice?.lease?.unit?.property?.name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        ) : (
          <Select
            label="Lease"
            placeholder="Select a lease"
            options={leaseOptions}
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Period start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            disabled={!canEditCore}
          />
          <Input
            label="Period end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={!canEditCore}
          />
        </div>

        <Input
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={!canEditCore}
        />

        <Input
          label={`Amount (${currency})`}
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!canEditCore}
        />

        {vatRate > 0 && !isEdit && (
          <p className="text-xs text-slate-500">
            + {formatMoney(vatAmount, currency)} VAT ({vatRate}%) · total{" "}
            {formatMoney(parsedAmount + vatAmount, currency)}
          </p>
        )}

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal note about this invoice"
        />

        {!isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={asDraft}
              onChange={(e) => setAsDraft(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-500"
            />
            Save as draft instead of sending now
          </label>
        )}

        {!canEditCore && (
          <p className="text-xs text-amber-600">
            This invoice is {invoice?.status} — only notes can typically change once settled.
          </p>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? "Save changes" : asDraft ? "Save draft" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
