import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { CheckIcon, TrashIcon, PercentIcon, DownloadIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { RecordPaymentModal } from "@/features/invoices/RecordPaymentModal";
import { InvoiceFormModal } from "@/features/invoices/InvoiceFormModal";
import { BulkInvoiceModal } from "@/features/invoices/BulkInvoiceModal";
import { LateFeeModal } from "@/features/invoices/LateFeeModal";
import { BulkMarkPaidModal } from "@/features/invoices/BulkMarkPaidModal";
import {
  useInvoices,
  useFlagOverdue,
  useDeleteInvoice,
  useBulkDeleteInvoices,
  exportInvoicesCsv,
  type InvoiceWithRelations,
} from "@/data/invoices";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/labels";
import { invoiceStatusOptions } from "@/lib/options";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { InvoiceStatus } from "@/lib/database.types";

const PAGE_SIZE = 25;
const statusFilterOptions = [{ value: "all", label: "All statuses" }, ...invoiceStatusOptions];

export function ManagerInvoicesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInvoices();
  const flagOverdue = useFlagOverdue();
  const deleteInvoice = useDeleteInvoice();
  const bulkDelete = useBulkDeleteInvoices();
  const [marking, setMarking] = useState<InvoiceWithRelations | null>(null);
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lateFee, setLateFee] = useState<InvoiceWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const flag = flagOverdue.mutate;
  useEffect(() => { flag(); }, [flag]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, statusFilter]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteInvoice.mutateAsync(deleting.id);
      pushToast("Invoice deleted", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the invoice."), "error");
    }
  }

  async function handleBulkDelete() {
    try {
      await bulkDelete.mutateAsync([...selected]);
      setSelected(new Set());
      setBulkDeleting(false);
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the selected invoices."), "error");
    }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${inv.lease?.tenant?.name ?? ""} ${inv.lease?.unit?.label ?? ""} ${
        inv.lease?.unit?.property?.name ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const selectedRows = filtered.filter((inv) => selected.has(inv.id));
  const selectedUnpaid = selectedRows.filter((inv) => inv.status === "sent" || inv.status === "overdue");

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const r of pageRows) next.delete(r.id);
      } else {
        for (const r of pageRows) next.add(r.id);
      }
      return next;
    });
  }

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Invoices"
        subtitle="Rent invoices from your active leases. We flag overdue automatically."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportInvoicesCsv(selected.size > 0 ? selectedRows : filtered)}>
              <DownloadIcon className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              New invoice
            </Button>
            <Button onClick={() => setGenerating(true)}>Generate invoices</Button>
          </div>
        }
      />

      {isLoading && <TableSkeleton rows={8} cols={7} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No invoices yet"
          description="Generate rent invoices from your active leases to get started."
          action={
            <Button onClick={() => setGenerating(true)}>
              Generate invoices
            </Button>
          }
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search tenant, unit, property" />
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | InvoiceStatus)}
              className="w-44"
            />
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} of {data.length}
            </span>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
              <span className="font-medium text-brand-800">{selected.size} selected</span>
              <div className="ml-auto flex gap-2">
                {selectedUnpaid.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setBulkMarking(true)}>
                    Mark paid ({selectedUnpaid.length})
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setBulkDeleting(true)}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search or filter." />
          ) : (
            <Table
              className="h-full"
              footer={
                <Pagination
                  page={page}
                  pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPage={setPage}
                />
              }
            >
              <THead>
                <TH className="w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 rounded accent-brand-500"
                    aria-label="Select all on page"
                  />
                </TH>
                <TH>Tenant</TH>
                <TH>Unit</TH>
                <TH>Period</TH>
                <TH className="text-right">Amount</TH>
                <TH>Due</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {pageRows.map((inv) => {
                  const total = inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0);
                  const isPartial = inv.amount_paid > 0 && inv.amount_paid < total;
                  const canPay = inv.status === "sent" || inv.status === "overdue";
                  return (
                    <TR key={inv.id} onClick={() => navigate(`/manager/invoices/${inv.id}`)}>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleRow(inv.id)}
                          className="h-4 w-4 rounded accent-brand-500"
                          aria-label="Select invoice"
                        />
                      </TD>
                      <TD className="font-medium text-slate-900">
                        {inv.lease?.tenant?.name ?? "—"}
                      </TD>
                      <TD>
                        <div>{inv.lease?.unit?.label ?? "—"}</div>
                        <div className="text-xs text-slate-500">
                          {inv.lease?.unit?.property?.name ?? ""}
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap">
                        {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        <div>{formatMoney(total, inv.currency)}</div>
                        {isPartial ? (
                          <div className="text-xs text-amber-600">
                            {formatMoney(inv.amount_paid, inv.currency)} paid
                          </div>
                        ) : (
                          (inv.vat_amount > 0 || inv.late_fee > 0) && (
                            <div className="text-xs text-slate-400">
                              incl.{inv.vat_amount > 0 ? " VAT" : ""}
                              {inv.vat_amount > 0 && inv.late_fee > 0 ? " +" : ""}
                              {inv.late_fee > 0 ? " fee" : ""}
                            </div>
                          )
                        )}
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(inv.due_date)}</TD>
                      <TD>
                        <div className="flex flex-col gap-1">
                          <Badge tone={invoiceStatusTone[inv.status]}>
                            {invoiceStatusLabel[inv.status]}
                          </Badge>
                          {inv.status !== "paid" && inv.payment_reported_at && (
                            <span className="text-xs text-sky-700">Tenant reported paid</span>
                          )}
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {canPay && (
                            <ActionIcon
                              label={inv.late_fee > 0 ? "Edit late fee" : "Add late fee"}
                              onClick={(e) => { e.stopPropagation(); setLateFee(inv); }}
                            >
                              <PercentIcon className="h-4 w-4" />
                            </ActionIcon>
                          )}
                          {canPay ? (
                            <ActionIcon
                              label="Record payment"
                              onClick={(e) => { e.stopPropagation(); setMarking(inv); }}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </ActionIcon>
                          ) : inv.status === "paid" ? (
                            <span className="whitespace-nowrap pr-1 text-xs text-slate-500">
                              {formatDate(inv.paid_date)}
                            </span>
                          ) : null}
                          <ActionIcon
                            label="Delete"
                            danger
                            onClick={(e) => { e.stopPropagation(); setDeleting(inv); }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </ActionIcon>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {marking && (
        <RecordPaymentModal open={!!marking} onClose={() => setMarking(null)} invoice={marking} />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete invoice"
          message={`Delete the ${formatMoney(deleting.amount, deleting.currency)} invoice for ${deleting.lease?.tenant?.name ?? "this tenant"}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteInvoice.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          open={bulkDeleting}
          title="Delete invoices"
          message={`Delete ${selected.size} selected invoice${selected.size === 1 ? "" : "s"}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={bulkDelete.isPending}
          onConfirm={() => void handleBulkDelete()}
          onClose={() => setBulkDeleting(false)}
        />
      )}
      {bulkMarking && (
        <BulkMarkPaidModal
          open={bulkMarking}
          onClose={() => setBulkMarking(false)}
          invoices={selectedUnpaid}
          onDone={() => setSelected(new Set())}
        />
      )}
      <BulkInvoiceModal open={generating} onClose={() => setGenerating(false)} />
      {creating && <InvoiceFormModal open={creating} onClose={() => setCreating(false)} />}
      {lateFee && (
        <LateFeeModal open onClose={() => setLateFee(null)} invoice={lateFee} />
      )}
    </div>
  );
}
