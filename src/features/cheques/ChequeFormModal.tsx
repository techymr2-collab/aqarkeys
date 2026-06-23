import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useLeases } from "@/data/leases";
import { useCreateCheques } from "@/data/cheques";
import { todayISO } from "@/lib/format";
import { formatMoney } from "@/lib/format";
import type { LeaseFrequency } from "@/lib/database.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FREQ_FACTOR: Record<LeaseFrequency, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
};

function annualRent(amount: number, frequency: LeaseFrequency): number {
  return amount * FREQ_FACTOR[frequency] * 12;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const NUM_OPTIONS = [
  { value: "1", label: "1 cheque (full year)" },
  { value: "2", label: "2 cheques (semi-annual)" },
  { value: "4", label: "4 cheques (quarterly)" },
  { value: "6", label: "6 cheques (bi-monthly)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a specific lease when opening from a lease context. */
  defaultLeaseId?: string;
}

export function ChequeFormModal({ open, onClose, defaultLeaseId }: Props) {
  const { data: leases = [] } = useLeases();
  const create = useCreateCheques();

  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === "active" || l.status === "upcoming"),
    [leases],
  );

  const leaseOptions = activeLeases.map((l) => ({
    value: l.id,
    label: [
      l.tenant?.name ?? "Unknown tenant",
      l.unit?.label ?? "Unknown unit",
      l.unit?.property?.name ?? "Unknown property",
    ].join(" · "),
  }));

  const [leaseId, setLeaseId] = useState(defaultLeaseId ?? "");
  const [numCheques, setNumCheques] = useState("4");
  const [totalAmount, setTotalAmount] = useState("");
  const [firstDueDate, setFirstDueDate] = useState(todayISO());
  const [bankName, setBankName] = useState("");
  const [startChequeNum, setStartChequeNum] = useState("");
  const [errors, setErrors] = useState<{ lease?: string; amount?: string; form?: string }>({});

  const selectedLease = useMemo(
    () => activeLeases.find((l) => l.id === leaseId),
    [activeLeases, leaseId],
  );

  function onLeaseChange(id: string) {
    setLeaseId(id);
    const lease = activeLeases.find((l) => l.id === id);
    if (lease) {
      const yr = Math.round(annualRent(lease.rent_amount, lease.frequency));
      setTotalAmount(String(yr));
      setFirstDueDate(lease.start_date);
    }
  }

  const n = Number(numCheques);
  const perCheque = totalAmount ? Math.round(Number(totalAmount) / n) : 0;
  const interval = 12 / n;
  const currency = selectedLease?.currency ?? "AED";

  function buildCheques() {
    return Array.from({ length: n }, (_, i) => ({
      amount: perCheque,
      due_date: i === 0 ? firstDueDate : addMonths(firstDueDate, i * interval),
      cheque_number: startChequeNum ? String(Number(startChequeNum) + i) : null,
      bank_name: bankName.trim() || null,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!leaseId) next.lease = "Pick a lease.";
    if (!totalAmount || Number(totalAmount) <= 0) next.amount = "Enter the total annual rent.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await create.mutateAsync({ lease_id: leaseId, cheques: buildCheques() });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add PDC cheques"
      description="Generate post-dated cheques for a lease. Cheque dates are spread evenly across 12 months."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Lease"
          options={leaseOptions}
          placeholder="Select a lease"
          value={leaseId}
          error={errors.lease}
          onChange={(e) => onLeaseChange(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Number of cheques"
            options={NUM_OPTIONS}
            value={numCheques}
            onChange={(e) => setNumCheques(e.target.value)}
          />
          <Input
            label={`Total annual amount (${currency})`}
            type="number"
            min={0}
            value={totalAmount}
            error={errors.amount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First cheque due date"
            type="date"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
          />
          <Input
            label="Bank name (optional)"
            value={bankName}
            placeholder="e.g. Emirates NBD"
            onChange={(e) => setBankName(e.target.value)}
          />
        </div>

        <Input
          label="Starting cheque number (optional)"
          value={startChequeNum}
          placeholder="e.g. 123456 — numbers will increment"
          onChange={(e) => setStartChequeNum(e.target.value)}
        />

        {/* Preview */}
        {leaseId && Number(totalAmount) > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Preview — {n} cheque{n > 1 ? "s" : ""}
            </p>
            <div className="divide-y divide-slate-200">
              {buildCheques().map((c, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-slate-600">{c.due_date}</span>
                  <span className="font-semibold text-slate-800">
                    {formatMoney(c.amount, currency)}
                    {c.cheque_number && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        #{c.cheque_number}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.form && <p className="text-sm text-rose-600">{errors.form}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Add {n} cheque{n > 1 ? "s" : ""}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
