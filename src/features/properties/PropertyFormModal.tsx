import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useOwners, useCreateOwner } from "@/data/owners";
import { useCreateProperty, useUpdateProperty, type PropertyWithStats } from "@/data/properties";

interface Props {
  open: boolean;
  onClose: () => void;
  property?: PropertyWithStats;
}

const NEW_OWNER = "__new__";

export function PropertyFormModal({ open, onClose, property }: Props) {
  const editing = !!property;
  const { data: owners = [] } = useOwners();
  const createOwner = useCreateOwner();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const [name, setName] = useState(property?.name ?? "");
  const [ownerId, setOwnerId] = useState(property?.owner_id ?? "");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [address, setAddress] = useState(property?.address ?? "");
  const [city, setCity] = useState(property?.city ?? "");
  const [feePercent, setFeePercent] = useState(String(property?.management_fee_percent ?? 5));
  // VAT treatment: residential rent is exempt (0%), commercial is standard-rated (5%).
  const [vatRate, setVatRate] = useState(String(property?.vat_rate ?? 0));
  const [error, setError] = useState<string | null>(null);

  const vatOptions = [
    { value: "0", label: "Residential — exempt (0%)" },
    { value: "5", label: "Commercial — standard-rated (5%)" },
  ];

  const ownerOptions = [
    ...owners.map((o) => ({ value: o.id, label: o.name })),
    { value: NEW_OWNER, label: "Add a new owner" },
  ];
  const creatingOwner = ownerId === NEW_OWNER || (!editing && owners.length === 0);
  const busy = createProperty.isPending || updateProperty.isPending || createOwner.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let resolvedOwnerId = ownerId;
      if (creatingOwner) {
        if (!newOwnerName.trim()) {
          setError("Give the new owner a name.");
          return;
        }
        const owner = await createOwner.mutateAsync({
          name: newOwnerName.trim(),
          email: newOwnerEmail.trim() || null,
          phone: null,
        });
        resolvedOwnerId = owner.id;
      }
      if (!resolvedOwnerId) {
        setError("Pick an owner for this property.");
        return;
      }
      const input = {
        name: name.trim(),
        owner_id: resolvedOwnerId,
        address,
        city,
        country: "United Arab Emirates",
        currency: "AED" as const,
        management_fee_percent: Number(feePercent) || 0,
        vat_rate: Number(vatRate) || 0,
      };
      if (editing) {
        await updateProperty.mutateAsync({ id: property.id, input });
      } else {
        await createProperty.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit property" : "Add a property"}
      description="Name it, assign an owner, and set the local currency."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Property name"
          placeholder="Marina Heights"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {!creatingOwner ? (
          <Select
            label="Owner"
            options={ownerOptions}
            placeholder="Select an owner"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
        ) : (
          <div className="grid gap-3 rounded-xl border border-slate-900/10 bg-slate-50 p-3 sm:grid-cols-2">
            <Input
              label="New owner name"
              placeholder="Acme Holdings"
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
            />
            <Input
              label="Owner email"
              type="email"
              placeholder="owner@email.com"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
            />
            {owners.length > 0 && (
              <button
                type="button"
                className="text-left text-xs text-brand-700 hover:text-brand-700 sm:col-span-2"
                onClick={() => setOwnerId(owners[0]?.id ?? "")}
              >
                Pick an existing owner instead
              </button>
            )}
          </div>
        )}

        <Input
          label="Address"
          placeholder="Dubai Marina, Plot 12"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" placeholder="Dubai" value={city} onChange={(e) => setCity(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Country</span>
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500">
              United Arab Emirates
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Currency</span>
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500">
              AED — UAE Dirham
            </div>
          </div>
          <Input
            label="Management fee (%)"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
          />
        </div>

        <div>
          <Select
            label="VAT treatment"
            options={vatOptions}
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            UAE: residential rent is VAT-exempt; commercial rent is standard-rated at 5%. Applied to
            new invoices going forward.
          </p>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Create property"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
