import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateOwner, useUpdateOwner } from "@/data/owners";
import type { Owner } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  owner?: Owner;
}

export function OwnerFormModal({ open, onClose, owner }: Props) {
  const editing = !!owner;
  const createOwner = useCreateOwner();
  const updateOwner = useUpdateOwner();
  const [name, setName] = useState(owner?.name ?? "");
  const [email, setEmail] = useState(owner?.email ?? "");
  const [phone, setPhone] = useState(owner?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const busy = createOwner.isPending || updateOwner.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the owner a name.");
      return;
    }
    const input = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    };
    try {
      if (editing) {
        await updateOwner.mutateAsync({ id: owner.id, input });
      } else {
        await createOwner.mutateAsync(input);
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
      title={editing ? "Edit owner" : "Add an owner"}
      description="Owners can be invited to a read only portal for their properties."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="Acme Holdings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="owner@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone"
          placeholder="+971 50 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Add owner"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
