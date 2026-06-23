import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { PayoutPaidModal } from "@/features/payouts/PayoutPaidModal";
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
];

export function ManagerPayoutsPage() {
  const { data, isLoading, isError, refetch } = usePayouts();
  const generate = useGeneratePayouts();
  const [month, setMonth] = useState(lastMonth());
  const [statusFilter, setStatusFilter] = useState<"all" | PayoutStatus>("all");
  const [paying, setPaying] = useState<PayoutWithRelations | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return statusFilter === "all" ? data : data.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

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

      {isLoading && <TableSkeleton rows={6} cols={8} />}
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
                <TH>Owner</TH>
                <TH>Property</TH>
                <TH>Period</TH>
                <TH className="text-right">Collected</TH>
                <TH className="text-right">Fee</TH>
                <TH className="text-right">Net</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {paginate(filtered, page, PAGE_SIZE).map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-slate-900">{p.owner?.name ?? "—"}</TD>
                    <TD>{p.property?.name ?? "—"}</TD>
                    <TD className="whitespace-nowrap">{formatDate(p.period_start)}</TD>
                    <TD className="text-right tabular-nums">{formatMoney(p.gross_collected, p.currency)}</TD>
                    <TD className="text-right tabular-nums text-slate-500">
                      {formatMoney(p.fee_amount, p.currency)}
                    </TD>
                    <TD className="text-right tabular-nums font-semibold text-slate-900">
                      {formatMoney(p.net_amount, p.currency)}
                    </TD>
                    <TD>
                      <Badge tone={payoutStatusTone[p.status]}>{payoutStatusLabel[p.status]}</Badge>
                    </TD>
                    <TD className="text-right">
                      {p.status === "pending" ? (
                        <div className="flex justify-end">
                          <ActionIcon label="Mark paid" onClick={() => setPaying(p)}>
                            <CheckIcon className="h-4 w-4" />
                          </ActionIcon>
                        </div>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {formatDate(p.paid_date)}
                        </span>
                      )}
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
    </div>
  );
}
