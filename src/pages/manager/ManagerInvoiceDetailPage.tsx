import { type ReactNode, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { RecordPaymentModal } from "@/features/invoices/RecordPaymentModal";
import { InvoiceFormModal } from "@/features/invoices/InvoiceFormModal";
import { VoidInvoiceModal } from "@/features/invoices/VoidInvoiceModal";
import { LateFeeModal } from "@/features/invoices/LateFeeModal";
import { useOrganization } from "@/data/organization";
import { useInvoices, useDeleteInvoice, useSendInvoice } from "@/data/invoices";
import { useInvoiceLineItems, useAddLineItem, useDeleteLineItem } from "@/data/invoiceLineItems";
import { downloadInvoicePdf, downloadReceiptPdf } from "@/lib/invoicePdf";
import {
  CalendarIcon,
  BanknoteIcon,
  HomeIcon,
  DownloadIcon,
  TrashIcon,
  CheckIcon,
  PercentIcon,
  PencilIcon,
  XCircleIcon,
} from "@/components/icons";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabel, invoiceStatusTone, paymentMethodLabel } from "@/lib/labels";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

function InfoCard({
  icon,
  iconClass,
  label,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function AddLineItemForm({ invoiceId }: { invoiceId: string }) {
  const addLineItem = useAddLineItem(invoiceId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!description.trim() || !parsed) return;
    await addLineItem.mutateAsync({ description: description.trim(), amount: parsed });
    setDescription("");
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-5 py-3">
      <div className="flex-1">
        <Input
          placeholder="Charge description (e.g. Parking fee)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="w-32">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={addLineItem.isPending}>
        Add
      </Button>
    </form>
  );
}

export function ManagerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const invoices = useInvoices();
  const org = useOrganization();
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const lineItems = useInvoiceLineItems(invoiceId);
  const deleteLineItem = useDeleteLineItem(invoiceId ?? "");

  const [marking, setMarking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [lateFeeOpen, setLateFeeOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const invoice = invoices.data?.find((i) => i.id === invoiceId);
  const otherInvoices = useMemo(
    () => (invoices.data ?? []).filter((i) => i.lease_id === invoice?.lease_id && i.id !== invoiceId),
    [invoices.data, invoice?.lease_id, invoiceId],
  );
  const lineItemsTotal = (lineItems.data ?? []).reduce((s, li) => s + li.amount, 0);

  async function handleDownloadPdf() {
    if (!invoice) return;
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(invoice, org.data ?? null, lineItems.data ?? []);
    } catch (err) {
      pushToast(friendlyError(err, "Could not generate the PDF."), "error");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!invoice) return;
    setReceiptBusy(true);
    try {
      await downloadReceiptPdf(invoice, org.data ?? null, lineItems.data ?? []);
    } catch (err) {
      pushToast(friendlyError(err, "Could not generate the receipt."), "error");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      pushToast("Invoice deleted", "success");
      navigate("/manager/invoices");
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the invoice."), "error");
      setDeleting(false);
    }
  }

  async function handleSend() {
    if (!invoice) return;
    try {
      await sendInvoice.mutateAsync(invoice.id);
    } catch (err) {
      pushToast(friendlyError(err, "Could not send this invoice."), "error");
    }
  }

  if (invoices.isLoading) return <PageLoader label="Loading invoice" />;
  if (invoices.isError) return <ErrorState onRetry={() => void invoices.refetch()} />;
  if (!invoice) {
    return <ErrorState message="Invoice not found." onRetry={() => navigate("/manager/invoices")} />;
  }

  const tenant = invoice.lease?.tenant?.name ?? "—";
  const unit = invoice.lease?.unit?.label ?? "—";
  const property = invoice.lease?.unit?.property?.name ?? "—";
  const hasVat = invoice.vat_amount > 0;
  const hasLateFee = invoice.late_fee > 0;
  const vatPct = hasVat ? Math.round((invoice.vat_amount / invoice.amount) * 100) : 0;
  const total = invoice.amount + invoice.vat_amount + invoice.late_fee + lineItemsTotal;
  const remaining = Math.max(total - invoice.amount_paid, 0);
  const isPartial = invoice.amount_paid > 0 && invoice.amount_paid < total;
  const canManageLateFee = invoice.status === "overdue" || invoice.status === "sent";
  const canPay = invoice.status === "sent" || invoice.status === "overdue";
  const canEdit = invoice.status !== "paid" && invoice.status !== "void";
  const canVoid = invoice.status !== "void" && invoice.status !== "paid";

  return (
    <div>
      <PageHeader
        back={{ label: "Invoices", to: "/manager/invoices" }}
        title={hasVat ? "Tax invoice" : "Invoice"}
        subtitle={
          invoice.invoice_no != null
            ? `INV-${String(invoice.invoice_no).padStart(5, "0")} · ${tenant} · ${unit} · ${property}`
            : `${tenant} · ${unit} · ${property}`
        }
        action={
          <div className="flex gap-2">
            {invoice.status === "draft" && (
              <Button onClick={() => void handleSend()} loading={sendInvoice.isPending}>
                Send invoice
              </Button>
            )}
            <Button variant="secondary" onClick={() => void handleDownloadPdf()} loading={pdfBusy}>
              <DownloadIcon className="mr-1.5 h-4 w-4" />
              Invoice
            </Button>
            {invoice.status === "paid" && (
              <Button variant="secondary" onClick={() => void handleDownloadReceipt()} loading={receiptBusy}>
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                Receipt
              </Button>
            )}
            {canPay && (
              <Button onClick={() => setMarking(true)}>
                <CheckIcon className="mr-1.5 h-4 w-4" />
                Record payment
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <PencilIcon className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            )}
            {canVoid && (
              <Button variant="ghost" onClick={() => setVoiding(true)}>
                <XCircleIcon className="mr-1.5 h-4 w-4" />
                Void
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDeleting(true)}>
              <TrashIcon className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<BanknoteIcon className="h-5 w-5" />} iconClass="bg-brand-50 text-brand-600" label="Total">
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(total, invoice.currency)}</p>
          {isPartial && (
            <p className="mt-0.5 text-xs font-medium text-amber-600">
              {formatMoney(remaining, invoice.currency)} remaining
            </p>
          )}
        </InfoCard>

        <InfoCard icon={<CalendarIcon className="h-5 w-5" />} iconClass="bg-slate-100 text-slate-600" label="Status">
          <p className="mt-1.5">
            <Badge tone={invoiceStatusTone[invoice.status]}>{invoiceStatusLabel[invoice.status]}</Badge>
          </p>
          <p className="mt-1 text-xs text-slate-500">Due {formatDate(invoice.due_date)}</p>
        </InfoCard>

        <InfoCard icon={<CalendarIcon className="h-5 w-5" />} iconClass="bg-emerald-50 text-emerald-600" label="Period">
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
          </p>
          {invoice.status === "paid" ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Paid {formatDate(invoice.paid_date)}
              {invoice.payment_method ? ` · ${paymentMethodLabel[invoice.payment_method]}` : ""}
            </p>
          ) : invoice.payment_reported_at ? (
            <p className="mt-0.5 text-xs text-sky-700">Tenant reported paid</p>
          ) : null}
        </InfoCard>

        <InfoCard icon={<HomeIcon className="h-5 w-5" />} iconClass="bg-amber-50 text-amber-600" label="Lease">
          <button
            type="button"
            onClick={() => invoice.lease_id && navigate(`/manager/leases/${invoice.lease_id}`)}
            className="mt-1 truncate text-left text-sm font-semibold text-brand-700 hover:underline"
          >
            {unit} · {property}
          </button>
          <p className="mt-0.5 truncate text-xs text-slate-500">{tenant}</p>
        </InfoCard>
      </div>

      {invoice.status === "void" && invoice.notes && (
        <div className="mb-6 rounded-xl border border-slate-900/10 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Void reason:</span> {invoice.notes}
        </div>
      )}
      {invoice.status !== "void" && invoice.notes && (
        <div className="mb-6 rounded-xl border border-slate-900/10 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Notes:</span> {invoice.notes}
        </div>
      )}

      {/* ── Breakdown ────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Breakdown</h2>
        {hasVat && org.data?.trn && (
          <p className="mt-0.5 text-xs text-slate-500">
            {org.data.name} · TRN {org.data.trn}
          </p>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="divide-y divide-slate-900/[0.06]">
          <Row label="Net rent" value={formatMoney(invoice.amount, invoice.currency)} />
          {hasVat && (
            <Row
              label={`VAT (${vatPct}%)`}
              value={<span className="text-slate-700">+ {formatMoney(invoice.vat_amount, invoice.currency)}</span>}
            />
          )}
          {hasLateFee && (
            <Row
              label="Late fee"
              value={<span className="text-rose-600">+ {formatMoney(invoice.late_fee, invoice.currency)}</span>}
            />
          )}
          {(lineItems.data ?? []).map((li) => (
            <Row
              key={li.id}
              label={
                <span className="flex items-center gap-2">
                  {li.description}
                  {canEdit && (
                    <ActionIcon label="Remove charge" danger onClick={() => deleteLineItem.mutate(li.id)}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </ActionIcon>
                  )}
                </span>
              }
              value={<span className="text-slate-700">+ {formatMoney(li.amount, invoice.currency)}</span>}
            />
          ))}
          {isPartial && (
            <Row
              label="Paid so far"
              value={<span className="text-emerald-600">− {formatMoney(invoice.amount_paid, invoice.currency)}</span>}
            />
          )}
          <Row
            label={isPartial ? "Balance due" : "Total"}
            value={
              <span className="text-base font-bold text-slate-900">
                {formatMoney(isPartial ? remaining : total, invoice.currency)}
              </span>
            }
          />
        </div>
        {canManageLateFee && (
          <button
            type="button"
            onClick={() => setLateFeeOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 hover:underline"
          >
            <PercentIcon className="h-3.5 w-3.5" />
            {hasLateFee ? "Edit late fee" : "Add late fee"}
          </button>
        )}
      </div>

      {/* ── Ad-hoc charges ───────────────────────────────────────────── */}
      {canEdit && (
        <>
          <div className="mt-10 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Add a charge</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              One-off charges (parking, utilities, etc.) added to this invoice's total.
            </p>
          </div>
          <div className="glass-card">
            <AddLineItemForm invoiceId={invoice.id} />
          </div>
        </>
      )}

      {/* ── Other invoices on this lease ─────────────────────────────── */}
      {otherInvoices.length > 0 && (
        <>
          <div className="mt-10 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Other invoices on this lease</h2>
            <p className="mt-0.5 text-sm text-slate-600">For context — the rest of this lease's billing history.</p>
          </div>
          <Table>
            <THead>
              <TH>Period</TH>
              <TH>Due</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {otherInvoices.map((inv) => (
                <TR key={inv.id} onClick={() => navigate(`/manager/invoices/${inv.id}`)}>
                  <TD>{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</TD>
                  <TD>{formatDate(inv.due_date)}</TD>
                  <TD className="text-right tabular-nums">
                    {formatMoney(inv.amount + (inv.vat_amount ?? 0) + (inv.late_fee ?? 0), inv.currency)}
                  </TD>
                  <TD>
                    <Badge tone={invoiceStatusTone[inv.status]}>{invoiceStatusLabel[inv.status]}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}

      {marking && <RecordPaymentModal open={marking} onClose={() => setMarking(false)} invoice={invoice} />}
      {editing && <InvoiceFormModal open={editing} onClose={() => setEditing(false)} invoice={invoice} />}
      {voiding && <VoidInvoiceModal open={voiding} onClose={() => setVoiding(false)} invoice={invoice} />}
      {lateFeeOpen && <LateFeeModal open={lateFeeOpen} onClose={() => setLateFeeOpen(false)} invoice={invoice} />}
      {deleting && (
        <ConfirmDialog
          open={deleting}
          title="Delete invoice"
          message={`Delete the ${formatMoney(invoice.amount, invoice.currency)} invoice for ${tenant}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteInvoice.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
