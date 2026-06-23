import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useVoidInvoice } from "@/data/invoices";
import { friendlyError } from "@/lib/errors";
import type { InvoiceWithRelations } from "@/data/invoices";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations;
}

export function VoidInvoiceModal({ open, onClose, invoice }: Props) {
  const voidInvoice = useVoidInvoice();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await voidInvoice.mutateAsync({ id: invoice.id, reason: reason.trim() || null });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not void this invoice."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Void invoice"
      description={`Cancel this invoice for ${invoice.lease?.tenant?.name ?? "this tenant"}. The record stays for your audit trail — it just stops counting as billed or outstanding.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate invoice, lease cancelled"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" loading={voidInvoice.isPending}>
            Void invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
