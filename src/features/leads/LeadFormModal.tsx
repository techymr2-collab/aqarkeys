import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useUnitOptions } from "@/data/units";
import { useCreateLead, useUpdateLead, type LeadWithUnit } from "@/data/leads";
import { leadSourceOptions } from "@/lib/options";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { LeadStage } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: LeadWithUnit;
  /** Prefill the unit when opened from a vacant unit. */
  defaultUnitId?: string;
}

const NO_UNIT = "__none__";

export function LeadFormModal({ open, onClose, lead, defaultUnitId }: Props) {
  const editing = !!lead;
  const { data: units = [] } = useUnitOptions();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const [name, setName] = useState(lead?.name ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [unitId, setUnitId] = useState(lead?.unit_id ?? defaultUnitId ?? NO_UNIT);
  const [source, setSource] = useState(lead?.source ?? "Website");
  const [budget, setBudget] = useState(lead?.budget != null ? String(lead.budget) : "");
  const [moveIn, setMoveIn] = useState(lead?.desired_move_in ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const busy = createLead.isPending || updateLead.isPending;

  const unitOptions = [
    { value: NO_UNIT, label: "No specific unit" },
    ...units.map((u) => ({
      value: u.id,
      label: `${u.property?.name ?? "Unknown"} · ${u.label}`,
    })),
  ];
  const sourceOptions = [{ value: "", label: "Unknown source" }, ...leadSourceOptions];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the lead a name.");
      return;
    }
    const input = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      unit_id: unitId === NO_UNIT ? null : unitId,
      source: source || null,
      budget: budget === "" ? null : Number(budget),
      desired_move_in: moveIn || null,
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateLead.mutateAsync({ id: lead.id, input });
        pushToast("Lead updated", "success");
      } else {
        await createLead.mutateAsync({ ...input, stage: "new" as LeadStage });
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Something went wrong."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit lead" : "Add a lead"}
      description="A prospective tenant enquiring about a unit. Move them through the pipeline as they progress."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            placeholder="Prospective tenant"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Select label="Interested in" options={unitOptions} value={unitId} onChange={(e) => setUnitId(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" placeholder="prospect@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone" placeholder="+971 50 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Source" options={sourceOptions} value={source} onChange={(e) => setSource(e.target.value)} />
          <Input label="Budget (AED)" type="number" min={0} placeholder="e.g. 90000" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <Input label="Desired move-in" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Requirements, follow-up notes, viewing feedback…"
            rows={3}
            className="rounded-xl border border-slate-900/10 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Add lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
