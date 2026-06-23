import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { maintenanceCategoryOptions } from "@/lib/options";
import { useCreateVendor, useUpdateVendor } from "@/data/vendors";
import type { MaintenanceCategory, Vendor } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
}

const ratingOptions = [
  { value: "", label: "No rating" },
  { value: "5", label: "★★★★★ (5)" },
  { value: "4", label: "★★★★ (4)" },
  { value: "3", label: "★★★ (3)" },
  { value: "2", label: "★★ (2)" },
  { value: "1", label: "★ (1)" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function VendorFormModal({ open, onClose, vendor }: Props) {
  const editing = !!vendor;
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const [name, setName] = useState(vendor?.name ?? "");
  const [company, setCompany] = useState(vendor?.company ?? "");
  const [trade, setTrade] = useState<MaintenanceCategory>(vendor?.trade ?? "general");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    vendor?.hourly_rate != null ? String(vendor.hourly_rate) : "",
  );
  const [rating, setRating] = useState(vendor?.rating != null ? String(vendor.rating) : "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [status, setStatus] = useState(vendor?.is_active === false ? "inactive" : "active");
  const [error, setError] = useState<string | null>(null);

  const busy = createVendor.isPending || updateVendor.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the vendor a name.");
      return;
    }
    const input = {
      name: name.trim(),
      company: company.trim() || null,
      trade,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      hourly_rate: hourlyRate === "" ? null : Number(hourlyRate),
      rating: rating === "" ? null : Number(rating),
      is_active: status === "active",
    };
    try {
      if (editing) {
        await updateVendor.mutateAsync({ id: vendor.id, input });
      } else {
        await createVendor.mutateAsync(input);
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
      title={editing ? "Edit vendor" : "Add a vendor"}
      description="Contractors and tradespeople you hire. Assign them to work orders from the maintenance board."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact name"
            placeholder="Rashid Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Company"
            placeholder="Cool Breeze AC Services"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Primary trade"
            options={maintenanceCategoryOptions}
            value={trade}
            onChange={(e) => setTrade(e.target.value as MaintenanceCategory)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            placeholder="+971 50 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="vendor@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Hourly rate (AED)"
            type="number"
            min={0}
            placeholder="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          <Select
            label="Rating"
            options={ratingOptions}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Areas covered, callout fees, preferred contact hours…"
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
            {editing ? "Save changes" : "Add vendor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
