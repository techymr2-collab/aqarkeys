import { formatMoney } from "@/lib/format";
import { PDF_COLOR as C, PAGE, drawAgencyHeader, drawFooter } from "@/lib/pdf";
import type { CurrencyCode, Organization } from "@/lib/database.types";

const { M, RIGHT } = PAGE;
const BREAK = 268; // start a new page once the cursor passes this

export interface StatementProperty {
  name: string;
  currency: CurrencyCode;
  income: number;
  expenses: number;
  noi: number;
  outstanding: number;
  payments: { tenant: string; period: string; date: string; amount: number }[];
  expenseItems: { category: string; date: string; amount: number }[];
}

export interface StatementInput {
  org: Organization | null;
  ownerName: string;
  monthLabel: string;
  currency: CurrencyCode;
  totals: { income: number; expenses: number; noi: number; outstanding: number };
  properties: StatementProperty[];
}

export async function downloadStatementPdf(input: StatementInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { org, ownerName, monthLabel, currency, totals, properties } = input;
  const money = (n: number, cur: CurrencyCode = currency) => formatMoney(n, cur);

  let y = 0;
  /** Page-break if the next block (h mm) won't fit above the footer. */
  function ensure(h: number): void {
    if (y + h > BREAK) {
      drawFooter(doc, org);
      doc.addPage();
      y = 22;
    }
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const oy = drawAgencyHeader(doc, org);
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("OWNER STATEMENT", RIGHT, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(monthLabel, RIGHT, 30, { align: "right" });

  const headerBottom = Math.max(oy, 43);
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, headerBottom, RIGHT, headerBottom);

  // Prepared for
  y = headerBottom + 9;
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("PREPARED FOR", M, y);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.slate);
  doc.text(ownerName, M, y + 6);
  doc.setFont("helvetica", "normal");

  // ── Portfolio summary box ──────────────────────────────────────────────────
  y += 14;
  const boxH = 22;
  doc.setFillColor(...C.fill);
  doc.roundedRect(M, y, RIGHT - M, boxH, 2, 2, "F");
  const cells: { label: string; value: number; color: [number, number, number] }[] = [
    { label: "INCOME", value: totals.income, color: C.green },
    { label: "EXPENSES", value: totals.expenses, color: C.rose },
    { label: "NET (NOI)", value: totals.noi, color: totals.noi >= 0 ? C.green : C.rose },
    { label: "OUTSTANDING", value: totals.outstanding, color: C.slate },
  ];
  const colW = (RIGHT - M) / 4;
  cells.forEach((cell, i) => {
    const cx = M + i * colW + 5;
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(cell.label, cx, y + 8);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cell.color);
    doc.text(money(cell.value), cx, y + 16);
    doc.setFont("helvetica", "normal");
  });
  y += boxH + 10;

  // ── Per-property sections ──────────────────────────────────────────────────
  for (const p of properties) {
    ensure(28);
    // property title + NOI
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate);
    doc.text(p.name, M, y);
    doc.setTextColor(...(p.noi >= 0 ? C.green : C.rose));
    doc.text(money(p.noi, p.currency), RIGHT, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(
      `Income ${money(p.income, p.currency)}   ·   Expenses ${money(p.expenses, p.currency)}   ·   Outstanding ${money(p.outstanding, p.currency)}`,
      M,
      y + 5,
    );
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, y + 8, RIGHT, y + 8);
    y += 14;

    // payments received
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text("PAYMENTS RECEIVED", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    if (p.payments.length === 0) {
      doc.setTextColor(...C.muted);
      doc.text("None this month", M + 2, y);
      y += 6;
    } else {
      for (const pay of p.payments) {
        ensure(7);
        doc.setTextColor(...C.slate);
        doc.text(`${pay.tenant}  ·  ${pay.period}`, M + 2, y);
        doc.setTextColor(...C.muted);
        doc.text(pay.date, RIGHT - 36, y, { align: "right" });
        doc.setTextColor(...C.slate);
        doc.text(money(pay.amount, p.currency), RIGHT, y, { align: "right" });
        y += 6;
      }
    }

    // expenses
    y += 3;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text("EXPENSES", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    if (p.expenseItems.length === 0) {
      doc.setTextColor(...C.muted);
      doc.text("None this month", M + 2, y);
      y += 6;
    } else {
      for (const exp of p.expenseItems) {
        ensure(7);
        doc.setTextColor(...C.slate);
        doc.text(exp.category, M + 2, y);
        doc.setTextColor(...C.muted);
        doc.text(exp.date, RIGHT - 36, y, { align: "right" });
        doc.setTextColor(...C.rose);
        doc.text(money(exp.amount, p.currency), RIGHT, y, { align: "right" });
        y += 6;
      }
    }
    y += 8;
  }

  drawFooter(doc, org);
  const file = `owner-statement-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(file);
}
