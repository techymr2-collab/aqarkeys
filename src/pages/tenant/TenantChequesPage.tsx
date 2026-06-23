import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { useTenantCheques } from "@/data/tenantPortal";
import { formatDate, formatMoney } from "@/lib/format";
import { pdcStatusLabel, pdcStatusTone } from "@/lib/labels";

export function TenantChequesPage() {
  const { data, isLoading, isError, refetch } = useTenantCheques();

  if (isLoading) return <TableSkeleton rows={4} cols={5} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Cheques"
        subtitle="Post-dated cheques you've handed over for rent, and their status."
      />

      {data && data.length === 0 ? (
        <EmptyState
          title="No cheques on file"
          description="If you pay by post-dated cheque, they'll appear here once your manager records them."
        />
      ) : (
        <Table>
          <THead>
            <TH>Cheque #</TH>
            <TH>Bank</TH>
            <TH className="text-right">Amount</TH>
            <TH>Due date</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {data?.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono text-slate-600">{c.cheque_number ?? "—"}</TD>
                <TD className="text-slate-500">{c.bank_name ?? "—"}</TD>
                <TD className="text-right font-medium text-slate-900">
                  {formatMoney(c.amount, "AED")}
                </TD>
                <TD className="whitespace-nowrap">{formatDate(c.due_date)}</TD>
                <TD>
                  <Badge tone={pdcStatusTone[c.status]}>{pdcStatusLabel[c.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
