import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateEjari, useUpdateEjari, type EjariInput } from "@/data/ejari";
import { todayISO } from "@/lib/format";
import type { EjariRegistration } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a lease when registering from a lease row. */
  leaseId: string;
  leaseLabel: string;
  /** Pass existing registration to enter edit mode. */
  existing?: EjariRegistration;
}

export function EjariFormModal({ open, onClose, leaseId, leaseLabel, existing }: Props) {
  const createEjari = useCreateEjari();
  const updateEjari = useUpdateEjari();

  const isEdit = Boolean(existing);

  const [ejariNumber, setEjariNumber] = useState(existing?.ejari_number ?? "");
  const [registeredAt, setRegisteredAt] = useState(existing?.registered_at ?? todayISO());
  const [expiresAt, setExpiresAt] = useState(existing?.expires_at ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ejariNumber.trim()) {
      setError("EJARI number is required.");
      return;
    }
    setError("");
    const input: EjariInput = {
      lease_id: leaseId,
      ejari_number: ejariNumber.trim(),
      registered_at: registeredAt,
      expires_at: expiresAt.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit && existing) {
        await updateEjari.mutateAsync({ id: existing.id, ...input });
      } else {
        await createEjari.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const isPending = createEjari.isPending || updateEjari.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit EJARI registration" : "Register EJARI"}
      description={`Dubai tenancy contract registration for: ${leaseLabel}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="EJARI number"
          value={ejariNumber}
          placeholder="e.g. 5123456789"
          onChange={(e) => setEjariNumber(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Registration date"
            type="date"
            value={registeredAt}
            onChange={(e) => setRegisteredAt(e.target.value)}
          />
          <Input
            label="Expiry date (optional)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes about this registration..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Register EJARI"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
