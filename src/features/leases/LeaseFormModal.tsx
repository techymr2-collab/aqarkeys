import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { frequencyOptions, leaseStatusOptions } from "@/lib/options";
import { useUnitOptions } from "@/data/units";
import { useTenants } from "@/data/tenants";
import { useCreateLease } from "@/data/leases";
import { todayISO } from "@/lib/format";
import type { CurrencyCode, Lease, LeaseFrequency, LeaseStatus } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Prefill when opened from the leasing funnel's "convert to lease". */
  defaultUnitId?: string;
  defaultTenantId?: string;
  defaultRent?: number | null;
  /** Fired with the created lease so callers (e.g. convert flow) can react. */
  onCreated?: (lease: Lease) => void;
}

function plusOneYear(iso: string): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function LeaseFormModal({
  open,
  onClose,
  defaultUnitId,
  defaultTenantId,
  defaultRent,
  onCreated,
}: Props) {
  const { data: units = [] } = useUnitOptions();
  const { data: tenants = [] } = useTenants();
  const createLease = useCreateLease();

  const [unitId, setUnitId] = useState(defaultUnitId ?? "");
  const [tenantId, setTenantId] = useState(defaultTenantId ?? "");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusOneYear(todayISO()));
  const [rent, setRent] = useState(defaultRent != null ? String(defaultRent) : "");
  const [frequency, setFrequency] = useState<LeaseFrequency>("annual");
  const [deposit, setDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");
  const [errors, setErrors] = useState<{
    unit?: string;
    tenant?: string;
    date?: string;
    form?: string;
  }>({});

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === unitId),
    [units, unitId],
  );
  const currency = (selectedUnit?.property?.currency ?? "AED") as CurrencyCode;

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.property?.name ?? "Unknown"} · ${u.label}`,
  }));
  const tenantOptions = tenants.map((t) => ({ value: t.id, label: t.name }));

  function onUnitChange(id: string) {
    setUnitId(id);
    const u = units.find((x) => x.id === id);
    if (u && !rent) setRent(String(u.market_rent || ""));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!unitId) next.unit = "Pick a unit.";
    if (!tenantId) next.tenant = "Pick a tenant.";
    if (new Date(endDate) < new Date(startDate)) {
      next.date = "The end date cannot be before the start date.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      const lease = await createLease.mutateAsync({
        unit_id: unitId,
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
        rent_amount: Number(rent) || 0,
        frequency,
        deposit_amount: Number(deposit) || 0,
        currency,
        status,
      });
      onCreated?.(lease);
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  const noInventory = units.length === 0 || tenants.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a lease"
      description="Assign a tenant to a unit and set the rent terms."
      size="lg"
    >
      {noInventory ? (
        <div className="text-sm text-slate-600">
          You need at least one unit and one tenant first. Add a property with units,
          and add a tenant, then come back.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Unit"
              options={unitOptions}
              placeholder="Select a unit"
              value={unitId}
              error={errors.unit}
              onChange={(e) => onUnitChange(e.target.value)}
            />
            <Select
              label="Tenant"
              options={tenantOptions}
              placeholder="Select a tenant"
              value={tenantId}
              error={errors.tenant}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              error={errors.date}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={`Rent (${currency})`}
              type="number"
              min={0}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
            <Select
              label="Frequency"
              options={frequencyOptions}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as LeaseFrequency)}
            />
            <Input
              label={`Deposit (${currency})`}
              type="number"
              min={0}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>

          <Select
            label="Status"
            options={leaseStatusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as LeaseStatus)}
          />

          {errors.form && <p className="text-sm text-rose-600">{errors.form}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createLease.isPending}>
              Create lease
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
