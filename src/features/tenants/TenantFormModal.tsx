import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateTenant, useUpdateTenant } from "@/data/tenants";
import type { Tenant } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  tenant?: Tenant;
}

export function TenantFormModal({ open, onClose, tenant }: Props) {
  const editing = !!tenant;
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  const [name, setName] = useState(tenant?.name ?? "");
  const [email, setEmail] = useState(tenant?.email ?? "");
  const [phone, setPhone] = useState(tenant?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const busy = createTenant.isPending || updateTenant.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the tenant a name.");
      return;
    }
    const input = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
    };
    try {
      if (editing) {
        await updateTenant.mutateAsync({ id: tenant.id, input });
      } else {
        await createTenant.mutateAsync(input);
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
      title={editing ? "Edit tenant" : "Add a tenant"}
      description="A tenant can be assigned to a unit through a lease."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          placeholder="Sara Khan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="sara@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone"
          placeholder="+971 50 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Add tenant"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
