import { Modal } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePayoutExpenses, type PayoutWithRelations } from "@/data/payouts";
import { formatDate, formatMoney } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  payout: PayoutWithRelations;
}

export function ExpenseBreakdownModal({ open, onClose, payout }: Props) {
  const { data, isLoading } = usePayoutExpenses(payout.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Expenses deducted"
      description={`What was subtracted from ${payout.property?.name ?? "this property"}'s collected rent for ${formatDate(payout.period_start)} – ${formatDate(payout.period_end)}.`}
    >
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {data && data.length === 0 && (
        <EmptyState
          title="No itemized expenses"
          description={
            payout.expenses_total > 0
              ? "These expenses predate itemized tracking — the total is still accurate."
              : "No expenses were recorded for this property in this period."
          }
        />
      )}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TH>Date</TH>
            <TH>Category</TH>
            <TH>Note</TH>
            <TH className="text-right">Amount</TH>
          </THead>
          <TBody>
            {data.map((e) => (
              <TR key={e.id}>
                <TD className="whitespace-nowrap">{formatDate(e.expense_date)}</TD>
                <TD>{e.category}</TD>
                <TD className="text-slate-500">{e.note ?? "—"}</TD>
                <TD className="text-right tabular-nums">{formatMoney(e.amount, payout.currency)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <div className="mt-4 flex justify-between border-t border-slate-900/10 pt-3 text-sm font-semibold text-slate-900">
        <span>Total expenses</span>
        <span className="tabular-nums">{formatMoney(payout.expenses_total, payout.currency)}</span>
      </div>
    </Modal>
  );
}
