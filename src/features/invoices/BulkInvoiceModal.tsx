import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLeases } from "@/data/leases";
import { useInvoices, useGenerateBulkInvoices, vatFor, type BulkInvoiceRow } from "@/data/invoices";
import { computeDuePeriods, addMonths } from "@/lib/invoicePeriods";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import type { CurrencyCode, InvoiceStatus } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Preset = "today" | "+1m" | "+3m" | "+6m";

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Today", value: "today" },
  { label: "+1 month", value: "+1m" },
  { label: "+3 months", value: "+3m" },
  { label: "+6 months", value: "+6m" },
];

function asOfDate(preset: Preset): string {
  const today = todayISO();
  if (preset === "+1m") return addMonths(today, 1);
  if (preset === "+3m") return addMonths(today, 3);
  if (preset === "+6m") return addMonths(today, 6);
  return today;
}

interface PreviewRow extends BulkInvoiceRow {
  key: string;
  tenantName: string;
  unitLabel: string;
  propertyName: string;
}

export function BulkInvoiceModal({ open, onClose }: Props) {
  const { data: leases = [] } = useLeases();
  const { data: invoices = [] } = useInvoices();
  const generate = useGenerateBulkInvoices();

  const [preset, setPreset] = useState<Preset>("today");
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const selectAllRef = useRef<HTMLInputElement>(null);

  const asOf = asOfDate(preset);
  const today = todayISO();

  // Build set of already-existing invoice keys for deduplication
  const existingKeys = useMemo(
    () => new Set(invoices.map((i) => `${i.lease_id}|${i.period_start}`)),
    [invoices],
  );

  // Compute preview rows client-side
  const preview = useMemo<PreviewRow[]>(() => {
    const rows: PreviewRow[] = [];
    for (const lease of leases) {
      if (lease.status !== "active") continue;
      // Generate periods through the look-ahead cutoff, but judge overdue-ness
      // against the real today — a period 3 months out isn't overdue just
      // because the look-ahead preset reaches that far.
      const periods = computeDuePeriods(lease.start_date, lease.end_date, lease.frequency, asOf, today);
      for (const period of periods) {
        const key = `${lease.id}|${period.period_start}`;
        if (existingKeys.has(key)) continue;
        rows.push({
          key,
          lease_id: lease.id,
          period_start: period.period_start,
          period_end: period.period_end,
          amount: lease.rent_amount,
          vat_amount: vatFor(lease.rent_amount, lease.unit?.property?.vat_rate ?? 0),
          currency: (lease.currency ?? "AED") as CurrencyCode,
          due_date: period.period_start,
          status: period.status as InvoiceStatus,
          tenantName: lease.tenant?.name ?? "—",
          unitLabel: lease.unit?.label ?? "—",
          propertyName: lease.unit?.property?.name ?? "—",
        });
      }
    }
    return rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [leases, asOf, today, existingKeys]);

  // Reset deselections when preset or preview changes
  useEffect(() => { setDeselected(new Set()); }, [preset]);

  // Sync indeterminate state on the select-all checkbox
  useEffect(() => {
    const el = selectAllRef.current;
    if (!el || preview.length === 0) return;
    const noneDeselected = deselected.size === 0;
    const allDeselected = deselected.size === preview.length;
    el.indeterminate = !noneDeselected && !allDeselected;
    el.checked = noneDeselected;
  }, [deselected, preview.length]);

  const selectedRows = useMemo(
    () => preview.filter((r) => !deselected.has(r.key)),
    [preview, deselected],
  );

  const totalAmount = useMemo(
    () => selectedRows.reduce((sum, r) => sum + r.amount + r.vat_amount, 0),
    [selectedRows],
  );
  const totalVat = useMemo(
    () => selectedRows.reduce((sum, r) => sum + r.vat_amount, 0),
    [selectedRows],
  );

  function toggleRow(key: string) {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (deselected.size === 0) {
      setDeselected(new Set(preview.map((r) => r.key)));
    } else {
      setDeselected(new Set());
    }
  }

  async function handleGenerate() {
    setError(null);
    if (selectedRows.length === 0) return;
    try {
      await generate.mutateAsync(selectedRows);
      pushToast(
        `Generated ${selectedRows.length} invoice${selectedRows.length !== 1 ? "s" : ""}`,
        "success",
      );
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Could not generate invoices."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate invoices"
      description="Preview rent invoices to be created. Adjust look-ahead to pre-generate upcoming periods."
      size="lg"
    >
      {/* Look-ahead presets */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Generate through
        </p>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.value
                  ? "bg-brand-500 text-white shadow-brand-glow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preview.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-5 text-center">
          <p className="font-semibold text-emerald-700">All caught up</p>
          <p className="mt-1 text-sm text-slate-500">
            No missing invoices for active leases through {formatDate(asOf)}.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              <span className="font-semibold text-slate-800">{preview.length}</span> invoices
              found — {selectedRows.length} selected
            </span>
            <span className="tabular-nums font-semibold text-slate-800">
              {formatMoney(totalAmount, "AED")}
              {totalVat > 0 && (
                <span className="ml-1 font-normal text-slate-400">
                  (incl. {formatMoney(totalVat, "AED")} VAT)
                </span>
              )}
            </span>
          </div>

          {/* Preview table */}
          <div className="glass-card mb-5 overflow-hidden p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                  <tr>
                    <th className="w-10 py-2.5 pl-4 pr-2 text-left">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="Select all"
                        className="h-4 w-4 rounded accent-brand-500"
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tenant
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Unit
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Period
                    </th>
                    <th className="px-3 py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.04]">
                  {preview.map((row) => {
                    const isSelected = !deselected.has(row.key);
                    return (
                      <tr
                        key={row.key}
                        onClick={() => toggleRow(row.key)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected ? "hover:bg-slate-50/70" : "bg-slate-50/50 opacity-50",
                        )}
                      >
                        <td className="py-2.5 pl-4 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded accent-brand-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {row.tenantName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          <div>{row.unitLabel}</div>
                          <div className="text-xs text-slate-400">{row.propertyName}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                          {formatDate(row.period_start)} – {formatDate(row.period_end)}
                        </td>
                        <td className="px-3 py-2.5 pr-4 text-right tabular-nums font-semibold text-slate-900">
                          {formatMoney(row.amount + row.vat_amount, row.currency)}
                          {row.vat_amount > 0 && (
                            <div className="text-xs font-normal text-slate-400">incl. VAT</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          loading={generate.isPending}
          disabled={selectedRows.length === 0}
          onClick={() => void handleGenerate()}
        >
          Generate {selectedRows.length > 0 ? `${selectedRows.length} ` : ""}
          {selectedRows.length === 1 ? "invoice" : "invoices"}
        </Button>
      </div>
    </Modal>
  );
}
