import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabel } from "@/lib/labels";
import { PDF_COLOR as C, PAGE, drawAgencyHeader, drawFooter, type RGB } from "@/lib/pdf";
import type { InvoiceWithRelations } from "@/data/invoices";
import type { Organization } from "@/lib/database.types";

const { M, RIGHT } = PAGE;

/**
 * Build and download a printable A4 (tax) invoice. jsPDF is imported
 * dynamically so it never lands in the main bundle — the chunk only loads
 * when a manager actually downloads a document.
 */
export async function downloadInvoicePdf(
  invoice: InvoiceWithRelations,
  org: Organization | null,
  lineItems: { description: string; amount: number }[] = [],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const cur = invoice.currency;
  const money = (n: number) => formatMoney(n, cur);
  const hasVat = invoice.vat_amount > 0;
  const hasLate = invoice.late_fee > 0;
  const lineItemsTotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const vatPct =
    hasVat && invoice.amount > 0 ? Math.round((invoice.vat_amount / invoice.amount) * 100) : 0;
  const total = invoice.amount + invoice.vat_amount + invoice.late_fee + lineItemsTotal;
  const number =
    invoice.invoice_no != null
      ? `INV-${String(invoice.invoice_no).padStart(5, "0")}`
      : `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const tenant = invoice.lease?.tenant?.name ?? "Tenant";
  const unit = invoice.lease?.unit?.label ?? "";
  const property = invoice.lease?.unit?.property?.name ?? "";

  const oy = drawAgencyHeader(doc, org);

  // Title + meta (right)
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(hasVat ? "TAX INVOICE" : "INVOICE", RIGHT, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(number, RIGHT, 30, { align: "right" });
  doc.text(`Issued ${formatDate(invoice.period_start)}`, RIGHT, 34.6, { align: "right" });
  doc.text(`Status: ${invoiceStatusLabel[invoice.status]}`, RIGHT, 39.2, { align: "right" });

  const headerBottom = Math.max(oy, 43);
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, headerBottom, RIGHT, headerBottom);

  // Billed to (left) + billing meta (right)
  const top = headerBottom + 10;
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("BILLED TO", M, top);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.slate);
  doc.text(tenant, M, top + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text([unit, property].filter(Boolean).join("  ·  "), M, top + 11);

  doc.setFontSize(8);
  doc.text("BILLING PERIOD", RIGHT, top, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  doc.text(
    `${formatDate(invoice.period_start)} — ${formatDate(invoice.period_end)}`,
    RIGHT,
    top + 5,
    { align: "right" },
  );
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("DUE DATE", RIGHT, top + 11, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  doc.text(formatDate(invoice.due_date), RIGHT, top + 16, { align: "right" });

  // Line items
  let y = top + 28;
  doc.setFillColor(...C.fill);
  doc.rect(M, y - 5, RIGHT - M, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.muted);
  doc.text("DESCRIPTION", M + 3, y);
  doc.text("AMOUNT", RIGHT - 3, y, { align: "right" });
  y += 8;

  const rows: { desc: string; amt: number; color?: RGB }[] = [
    {
      desc: `Rent — ${formatDate(invoice.period_start)} to ${formatDate(invoice.period_end)}`,
      amt: invoice.amount,
    },
  ];
  if (hasVat) rows.push({ desc: `VAT (${vatPct}%)`, amt: invoice.vat_amount });
  if (hasLate) rows.push({ desc: "Late fee", amt: invoice.late_fee, color: C.rose });
  for (const li of lineItems) rows.push({ desc: li.description, amt: li.amount });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of rows) {
    doc.setTextColor(...C.slate);
    doc.text(row.desc, M + 3, y);
    doc.setTextColor(...(row.color ?? C.slate));
    doc.text(money(row.amt), RIGHT - 3, y, { align: "right" });
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, y + 3, RIGHT, y + 3);
    y += 9;
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.slate);
  doc.text("Total due", M + 3, y);
  doc.text(money(total), RIGHT - 3, y, { align: "right" });

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (invoice.status === "paid") {
    doc.setTextColor(...C.green);
    const method = invoice.payment_method ? ` via ${invoice.payment_method.replace(/_/g, " ")}` : "";
    doc.text(`Paid on ${formatDate(invoice.paid_date)}${method}.`, M, y);
  } else if (invoice.amount_paid > 0) {
    doc.setTextColor(...C.muted);
    doc.text(
      `${money(invoice.amount_paid)} received so far — ${money(total - invoice.amount_paid)} remaining, due ${formatDate(invoice.due_date)}.`,
      M,
      y,
    );
  } else {
    doc.setTextColor(...C.muted);
    doc.text(`Please settle by ${formatDate(invoice.due_date)}.`, M, y);
  }

  drawFooter(doc, org);
  doc.save(`${number}.pdf`);
}

/**
 * Build and download a payment receipt for a paid invoice. Receipts are
 * proof of payment — they lead with the amount received and the date.
 */
export async function downloadReceiptPdf(
  invoice: InvoiceWithRelations,
  org: Organization | null,
  lineItems: { description: string; amount: number }[] = [],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const cur = invoice.currency;
  const money = (n: number) => formatMoney(n, cur);
  const lineItemsTotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const total = invoice.amount + invoice.vat_amount + invoice.late_fee + lineItemsTotal;
  const refSuffix =
    invoice.invoice_no != null ? String(invoice.invoice_no).padStart(5, "0") : invoice.id.slice(0, 8).toUpperCase();
  const recNo = `REC-${refSuffix}`;
  const invNo = `INV-${refSuffix}`;
  const tenant = invoice.lease?.tenant?.name ?? "Tenant";
  const unit = invoice.lease?.unit?.label ?? "";
  const property = invoice.lease?.unit?.property?.name ?? "";
  const method = invoice.payment_method
    ? invoice.payment_method.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
    : "—";

  const oy = drawAgencyHeader(doc, org);

  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PAYMENT RECEIPT", RIGHT, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(recNo, RIGHT, 30, { align: "right" });
  doc.text(`Paid ${formatDate(invoice.paid_date)}`, RIGHT, 34.6, { align: "right" });

  const headerBottom = Math.max(oy, 43);
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, headerBottom, RIGHT, headerBottom);

  // Amount-received panel
  const panelY = headerBottom + 10;
  doc.setFillColor(...C.greenBg);
  doc.roundedRect(M, panelY, RIGHT - M, 26, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.green);
  doc.text("AMOUNT RECEIVED", M + 6, panelY + 9);
  doc.setFontSize(20);
  doc.text(money(total), M + 6, panelY + 19);
  // PAID marker
  doc.setDrawColor(...C.green);
  doc.setLineWidth(0.6);
  doc.roundedRect(RIGHT - 34, panelY + 8, 28, 10, 2, 2, "S");
  doc.setFontSize(12);
  doc.text("PAID", RIGHT - 20, panelY + 14.8, { align: "center" });

  // Details
  let y = panelY + 38;
  const detail = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(label, M, y);
    doc.setTextColor(...C.slate);
    doc.text(value, M + 40, y);
    y += 8;
  };
  detail("Received from", tenant);
  detail("For", `Rent ${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`);
  detail("Property", [property, unit].filter(Boolean).join("  ·  ") || "—");
  detail("Payment method", method);
  detail("Invoice reference", invNo);

  if (invoice.vat_amount > 0 || invoice.late_fee > 0 || lineItems.length > 0) {
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    const parts = [`Net rent ${money(invoice.amount)}`];
    if (invoice.vat_amount > 0) parts.push(`VAT ${money(invoice.vat_amount)}`);
    if (invoice.late_fee > 0) parts.push(`Late fee ${money(invoice.late_fee)}`);
    for (const li of lineItems) parts.push(`${li.description} ${money(li.amount)}`);
    doc.text(`Breakdown:  ${parts.join("   +   ")}`, M, y);
  }

  drawFooter(doc, org);
  doc.save(`${recNo}.pdf`);
}
