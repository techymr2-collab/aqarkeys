import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRenewLease } from "@/data/leases";
import { useEjariRegistrations } from "@/data/ejari";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { formatDate, formatMoney } from "@/lib/format";
import type { LeaseWithRelations } from "@/data/leases";

interface Props {
  open: boolean;
  onClose: () => void;
  lease: LeaseWithRelations;
}

function addYear(iso: string): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function RenewLeaseModal({ open, onClose, lease }: Props) {
  const renew = useRenewLease();
  const ejari = useEjariRegistrations();
  const [endDate, setEndDate] = useState(addYear(lease.end_date));
  const [rentAmount, setRentAmount] = useState(String(lease.rent_amount));
  const [error, setError] = useState<string | null>(null);
  const [renewedTo, setRenewedTo] = useState<string | null>(null);

  const leaseEjari = ejari.data?.find((e) => e.lease_id === lease.id);
  const ejariStale = !leaseEjari || (leaseEjari.expires_at && leaseEjari.expires_at < endDate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (new Date(endDate) <= new Date(lease.end_date)) {
      setError("New end date must be after the current end date.");
      return;
    }
    const amount = Number(rentAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid rent amount.");
      return;
    }
    try {
      await renew.mutateAsync({
        id: lease.id,
        endDate,
        rentAmount: amount,
        previousEndDate: lease.end_date,
        previousRentAmount: lease.rent_amount,
        previousStatus: lease.status,
      });
      pushToast("Lease renewed", "success");
      setRenewedTo(endDate);
    } catch (err) {
      setError(friendlyError(err, "Could not renew the lease."));
    }
  }

  if (renewedTo) {
    return (
      <Modal open={open} onClose={onClose} title="Lease renewed">
        <p className="text-sm text-slate-600">
          {lease.tenant?.name ?? "This tenant"}'s lease now runs through{" "}
          {formatDate(renewedTo)}. Two things worth doing for the new term:
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            to="/manager/cheques"
            onClick={onClose}
            className="flex items-center justify-between rounded-xl border border-slate-900/10 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Schedule PDC cheques for the new term
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/manager/ejari"
            onClick={onClose}
            className="flex items-center justify-between rounded-xl border border-slate-900/10 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            {ejariStale ? "Renew the EJARI registration" : "Review the EJARI registration"}
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Renew lease"
      description={`Extend the lease for ${lease.tenant?.name ?? "this tenant"}.`}
    >
      {/* Current lease summary */}
      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-slate-400">Tenant</p>
            <p className="font-medium text-slate-800">{lease.tenant?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Unit</p>
            <p className="font-medium text-slate-800">
              {[lease.unit?.property?.name, lease.unit?.label].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current end date</p>
            <p className="font-medium text-slate-800">{formatDate(lease.end_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current rent</p>
            <p className="font-medium text-slate-800">{formatMoney(lease.rent_amount, "AED")}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="New end date"
            type="date"
            value={endDate}
            min={lease.end_date}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <Input
              label="New rent (AED)"
              type="number"
              min={0}
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Verify increase against the RERA rent calculator before raising.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={renew.isPending}>
            Renew lease
          </Button>
        </div>
      </form>
    </Modal>
  );
}
