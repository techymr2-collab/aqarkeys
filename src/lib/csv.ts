export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse CSV text into header-keyed row objects. Tolerant of reordered columns. */
export async function parseCsv(text: string): Promise<ParsedCsv> {
  const Papa = (await import("papaparse")).default;
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

/** Build a downloadable CSV string from headers + example rows (we control the values, so no quoting edge cases). */
export function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers, ...rows].map((r) => r.map(escape).join(","));
  return lines.join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv = buildCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
