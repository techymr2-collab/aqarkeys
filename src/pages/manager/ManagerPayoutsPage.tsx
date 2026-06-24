import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { CheckIcon, PencilIcon, XCircleIcon, ReceiptIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { PayoutPaidModal } from "@/features/payouts/PayoutPaidModal";
import { EditPayoutModal } from "@/features/payouts/EditPayoutModal";
import { VoidPayoutModal } from "@/features/payouts/VoidPayoutModal";
import { ExpenseBreakdownModal } from "@/features/payouts/ExpenseBreakdownModal";
import { BulkMarkPayoutsPaidModal } from "@/features/payouts/BulkMarkPayoutsPaidModal";
import { usePayouts, useGeneratePayouts, type PayoutWithRelations } from "@/data/payouts";
import { formatDate, formatMoney } from "@/lib/format";
import { payoutStatusLabel, payoutStatusTone } from "@/lib/labels";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import type { PayoutStatus } from "@/lib/database.types";

const PAGE_SIZE = 20;

function lastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y!, m!, 0);
  const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(
    last.getDate(),
  ).padStart(2, "0")}`;
  return { start: `${ym}-01`, end };
}

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export function ManagerPayoutsPage() {
  const { data, isLoading, isError, refetch } = usePayouts();
  const generate = useGeneratePayouts();
  const [month, setMonth] = useState(lastMonth());
  const [statusFilter, setStatusFilter] = useState<"all" | PayoutStatus>("all");
  const [paying, setPaying] = useState<PayoutWithRelations | null>(null);
  const [editing, setEditing] = useState<PayoutWithRelations | null>(null);
  const [voiding, setVoiding] = useState<PayoutWithRelations | null>(null);
  const [viewingExpenses, setViewingExpenses] = useState<PayoutWithRelations | null>(null);
  const [bulkMarking, setBulkMarking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return statusFilter === "all" ? data : data.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  const pageRows = paginate(filtered, page, PAGE_SIZE);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const selectedRows = filtered.filter((p) => selected.has(p.id));
  const selectedPending = selectedRows.filter((p) => p.status === "pending");

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
        for (const r of pageRows) {
          if (r.status === "pending") next.add(r.id);
        }
      }
      return next;
    });
  }

  async function handleGenerate() {
    const { start, end } = monthRange(month);
    try {
      const created = await generate.mutateAsync({ start, end });
      pushToast(
        created === 0 ? "No new payouts for that month." : `Generated ${created} payouts.`,
        created === 0 ? "info" : "success",
      );
    } catch (err) {
      pushToast(friendlyError(err, "Could not generate payouts."), "error");
    }
  }

  const hasData = !!data && data.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Payouts"
        subtitle="Pay owners their net for a period: rent collected minus expenses and fee."
      />

      {/* Generate payouts form */}
      <div className="glass-card mb-4 flex shrink-0 flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payout-month" className="text-sm font-medium text-slate-700">
            Period
          </label>
          <input
            id="payout-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 rounded-xl border border-slate-900/10 bg-white px-3.5 text-sm text-slate-900 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <Button onClick={() => void handleGenerate()} loading={generate.isPending}>
          Generate payouts
        </Button>
        <p className="text-sm text-slate-500">
          One payout per property with rent collected or expenses that month.
        </p>
      </div>

      {isLoading && <TableSkeleton rows={6} cols={9} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No payouts yet"
          description="Pick a month and generate payouts to settle up with owners."
        />
      )}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-3 flex shrink-0 items-center gap-3">
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PayoutStatus)}
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
                {selectedPending.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setBulkMarking(true)}>
                    Mark paid ({selectedPending.length})
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different filter." />
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
                    aria-label="Select all pending on page"
                  />
                </TH>
                <TH>Owner</TH>
                <TH>Property</TH>
                <TH>Period</TH>
                <TH className="text-right">Collected</TH>
                <TH className="text-right">Expenses</TH>
                <TH className="text-right">Fee</TH>
                <TH className="text-right">Net</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {pageRows.map((p) => (
                  <TR key={p.id}>
                    <TD onClick={(e) => e.stopPropagation()}>
                      {p.status === "pending" && (
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          className="h-4 w-4 rounded accent-brand-500"
                          aria-label="Select payout"
                        />
                      )}
                    </TD>
                    <TD className="font-medium text-slate-900">{p.owner?.name ?? "—"}</TD>
                    <TD>{p.property?.name ?? "—"}</TD>
                    <TD className="whitespace-nowrap">{formatDate(p.period_start)}</TD>
                    <TD className="text-right tabular-nums">{formatMoney(p.gross_collected, p.currency)}</TD>
                    <TD className="text-right tabular-nums">
                      {p.expenses_total > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewingExpenses(p)}
                          className="text-slate-600 underline-offset-2 hover:text-brand-600 hover:underline"
                        >
                          {formatMoney(p.expenses_total, p.currency)}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums text-slate-500">
                      {formatMoney(p.fee_amount, p.currency)}
                    </TD>
                    <TD className="text-right tabular-nums font-semibold text-slate-900">
                      {formatMoney(p.net_amount, p.currency)}
                    </TD>
                    <TD>
                      <Badge tone={payoutStatusTone[p.status]}>{payoutStatusLabel[p.status]}</Badge>
                      {p.status === "void" && p.void_reason && (
                        <div className="mt-0.5 text-xs text-slate-500">{p.void_reason}</div>
                      )}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {p.expenses_total > 0 && (
                          <ActionIcon label="View expense breakdown" onClick={() => setViewingExpenses(p)}>
                            <ReceiptIcon className="h-4 w-4" />
                          </ActionIcon>
                        )}
                        {p.status === "pending" && (
                          <>
                            <ActionIcon label="Edit payout" onClick={() => setEditing(p)}>
                              <PencilIcon className="h-4 w-4" />
                            </ActionIcon>
                            <ActionIcon label="Mark paid" onClick={() => setPaying(p)}>
                              <CheckIcon className="h-4 w-4" />
                            </ActionIcon>
                          </>
                        )}
                        {p.status !== "void" && (
                          <ActionIcon label="Void payout" danger onClick={() => setVoiding(p)}>
                            <XCircleIcon className="h-4 w-4" />
                          </ActionIcon>
                        )}
                        {p.status === "paid" && (
                          <span className="whitespace-nowrap pl-1 text-xs text-slate-500">
                            {formatDate(p.paid_date)}
                          </span>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {paying && (
        <PayoutPaidModal open={!!paying} onClose={() => setPaying(null)} payout={paying} />
      )}
      {editing && (
        <EditPayoutModal open={!!editing} onClose={() => setEditing(null)} payout={editing} />
      )}
      {voiding && (
        <VoidPayoutModal open={!!voiding} onClose={() => setVoiding(null)} payout={voiding} />
      )}
      {viewingExpenses && (
        <ExpenseBreakdownModal
          open={!!viewingExpenses}
          onClose={() => setViewingExpenses(null)}
          payout={viewingExpenses}
        />
      )}
      {bulkMarking && (
        <BulkMarkPayoutsPaidModal
          open={bulkMarking}
          onClose={() => setBulkMarking(false)}
          payouts={selectedPending}
          onDone={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
