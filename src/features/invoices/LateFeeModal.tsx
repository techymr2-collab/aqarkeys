import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApplyLateFee } from "@/data/invoices";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { InvoiceWithRelations } from "@/data/invoices";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations;
}

const PRESETS = [
  { label: "5%", pct: 0.05 },
  { label: "10%", pct: 0.10 },
  { label: "15%", pct: 0.15 },
];

export function LateFeeModal({ open, onClose, invoice }: Props) {
  const applyLateFee = useApplyLateFee();
  const [amount, setAmount] = useState(
    invoice.late_fee > 0 ? String(invoice.late_fee) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount) || 0;
  const total = invoice.amount + parsedAmount;

  function applyPreset(pct: number) {
    setAmount(String(Math.round(invoice.amount * pct)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (parsedAmount < 0) {
      setError("Late fee cannot be negative.");
      return;
    }
    try {
      await applyLateFee.mutateAsync({ id: invoice.id, lateFee: parsedAmount });
      pushToast(
        parsedAmount > 0
          ? `Late fee of ${formatMoney(parsedAmount, "AED")} applied`
          : "Late fee removed",
        "success",
      );
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not apply late fee."));
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await applyLateFee.mutateAsync({ id: invoice.id, lateFee: 0 });
      pushToast("Late fee removed", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not remove late fee."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Late fee"
      description={`Add a penalty to the overdue invoice for ${invoice.lease?.tenant?.name ?? "this tenant"}.`}
    >
      {/* Invoice summary */}
      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-slate-400">Base rent</p>
            <p className="font-semibold text-slate-800">
              {formatMoney(invoice.amount, "AED")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Unit</p>
            <p className="font-medium text-slate-800">
              {[invoice.lease?.unit?.property?.name, invoice.lease?.unit?.label]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Preset buttons */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Quick presets
          </p>
          <div className="flex gap-2">
            {PRESETS.map((p) => {
              const suggested = Math.round(invoice.amount * p.pct);
              const active = parsedAmount === suggested && amount !== "";
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.pct)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-center text-sm transition-colors",
                    active
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50/50",
                  )}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-xs text-slate-400">
                    {formatMoney(suggested, "AED")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom amount */}
        <Input
          label="Custom amount (AED)"
          type="number"
          min={0}
          value={amount}
          placeholder="Enter late fee"
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Total preview */}
        {parsedAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm">
            <span className="text-slate-600">Total payable</span>
            <span className="font-bold text-rose-700">{formatMoney(total, "AED")}</span>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            {invoice.late_fee > 0 && (
              <button
                type="button"
                onClick={() => void handleRemove()}
                className="text-sm text-slate-400 hover:text-rose-500 hover:underline"
              >
                Remove late fee
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={applyLateFee.isPending}>
              Apply late fee
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
