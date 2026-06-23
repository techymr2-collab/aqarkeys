import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { usePayouts } from "@/data/payouts";
import { formatDate, formatMoney } from "@/lib/format";
import { payoutStatusLabel, payoutStatusTone } from "@/lib/labels";
import type { CurrencyCode } from "@/lib/database.types";

export function OwnerPayoutsPage() {
  const { data, isLoading, isError, refetch } = usePayouts();

  if (isLoading) return <PageLoader label="Loading your payouts" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const pendingByCurrency = new Map<string, number>();
  for (const p of data) {
    if (p.status === "pending") {
      pendingByCurrency.set(
        p.currency,
        (pendingByCurrency.get(p.currency) ?? 0) + p.net_amount,
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="What you have been paid, and what is on the way."
      />

      {data.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Your manager settles up after rent is collected. Payouts will show here."
        />
      ) : (
        <>
          {pendingByCurrency.size > 0 && (
            <div className="glass-card mb-6 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending to you</p>
              <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                {[...pendingByCurrency.entries()].map(([currency, amount]) => (
                  <span key={currency} className="text-2xl font-bold text-slate-900">
                    {formatMoney(amount, currency as CurrencyCode)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Table>
            <THead>
              <TH>Property</TH>
              <TH>Period</TH>
              <TH className="text-right">Collected</TH>
              <TH className="text-right">Fee</TH>
              <TH className="text-right">Net to you</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {data.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium text-slate-900">{p.property?.name ?? "—"}</TD>
                  <TD>{formatDate(p.period_start)}</TD>
                  <TD className="text-right">{formatMoney(p.gross_collected, p.currency)}</TD>
                  <TD className="text-right text-slate-500">
                    {formatMoney(p.fee_amount, p.currency)}
                  </TD>
                  <TD className="text-right font-semibold text-slate-900">
                    {formatMoney(p.net_amount, p.currency)}
                  </TD>
                  <TD>
                    <Badge tone={payoutStatusTone[p.status]}>{payoutStatusLabel[p.status]}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}
