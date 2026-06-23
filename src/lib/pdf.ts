import type { Organization } from "@/lib/database.types";

type Doc = import("jspdf").jsPDF;

// Shared palette for generated PDFs (jsPDF expects RGB tuples).
export type RGB = [number, number, number];

export const PDF_COLOR = {
  slate: [15, 23, 42] as RGB,
  muted: [100, 116, 139] as RGB,
  brand: [124, 58, 237] as RGB,
  line: [226, 232, 240] as RGB,
  rose: [225, 29, 72] as RGB,
  green: [22, 101, 52] as RGB,
  greenBg: [236, 253, 245] as RGB,
  fill: [245, 247, 250] as RGB,
};

export const PAGE = { M: 18, RIGHT: 192, FOOT: 282 };

const C = PDF_COLOR;

/** Agency block (top-left). Returns the y just below it. */
export function drawAgencyHeader(doc: Doc, org: Organization | null): number {
  const { M } = PAGE;
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(org?.name ?? "Property Manager", M, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  const lines = [
    org?.address,
    [org?.phone, org?.email].filter(Boolean).join("   ·   ") || null,
    org?.website,
    org?.trn ? `TRN ${org.trn}` : null,
  ].filter((l): l is string => !!l);
  let y = 30;
  for (const l of lines) {
    doc.text(l, M, y);
    y += 4.6;
  }
  return y;
}

export function drawFooter(doc: Doc, org: Organization | null): void {
  const { M, RIGHT, FOOT } = PAGE;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(M, FOOT, RIGHT, FOOT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const footer = [org?.name, org?.trn ? `TRN ${org.trn}` : null, "Computer-generated document"]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(footer, M, FOOT + 5);
}
