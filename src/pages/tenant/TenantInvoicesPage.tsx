import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Table, THead, TH, TBody, TR, TD, TableSkeleton } from "@/components/ui/Table";
import { DownloadIcon } from "@/components/icons";
import { ReportPaymentModal } from "@/features/invoices/ReportPaymentModal";
import { useTenantInvoices } from "@/data/tenantPortal";
import { useOrganization } from "@/data/organization";
import { downloadInvoicePdf, downloadReceiptPdf } from "@/lib/invoicePdf";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/labels";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { InvoiceWithRelations } from "@/data/invoices";

export function TenantInvoicesPage() {
  const { data, isLoading, isError, refetch } = useTenantInvoices();
  const { data: org } = useOrganization();
  const [reporting, setReporting] = useState<InvoiceWithRelations | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(inv: InvoiceWithRelations, kind: "invoice" | "receipt") {
    setDownloadingId(inv.id);
    try {
      const fn = kind === "receipt" ? downloadReceiptPdf : downloadInvoicePdf;
      await fn(inv, org ?? null);
    } catch (err) {
      pushToast(friendlyError(err, "Could not generate the PDF."), "error");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Your rent invoices and their status." />

      {isLoading && <TableSkeleton rows={5} cols={4} />}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No invoices yet"
          description="When your manager issues rent invoices, they appear here."
        />
      )}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TH>Period</TH>
            <TH className="text-right">Amount</TH>
            <TH>Due</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {data.map((inv) => {
              const reported = !!inv.payment_reported_at && inv.status !== "paid";
              return (
                <TR key={inv.id}>
                  <TD className="font-medium text-slate-900">
                    {formatDate(inv.period_start)} to {formatDate(inv.period_end)}
                  </TD>
                  <TD className="text-right">
                    <div>
                      {formatMoney(inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0), inv.currency)}
                    </div>
                    {inv.vat_amount > 0 && (
                      <div className="text-xs text-slate-400">incl. VAT</div>
                    )}
                  </TD>
                  <TD>{formatDate(inv.due_date)}</TD>
                  <TD>
                    <Badge tone={invoiceStatusTone[inv.status]}>
                      {invoiceStatusLabel[inv.status]}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === "paid" ? (
                        <span className="text-xs text-slate-500">Paid {formatDate(inv.paid_date)}</span>
                      ) : reported ? (
                        <span className="text-xs text-sky-700">Reported, awaiting confirmation</span>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setReporting(inv)}>
                          Report payment
                        </Button>
                      )}
                      <div className="flex items-center gap-0.5">
                        <ActionIcon
                          label="Download invoice"
                          disabled={downloadingId === inv.id}
                          onClick={() => void handleDownload(inv, "invoice")}
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </ActionIcon>
                        {inv.status === "paid" && (
                          <ActionIcon
                            label="Download receipt"
                            disabled={downloadingId === inv.id}
                            onClick={() => void handleDownload(inv, "receipt")}
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </ActionIcon>
                        )}
                      </div>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      {reporting && (
        <ReportPaymentModal
          open={!!reporting}
          onClose={() => setReporting(null)}
          invoice={reporting}
        />
      )}
    </div>
  );
}
