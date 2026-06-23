import type { CurrencyCode } from "@/lib/database.types";

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function formatterFor(currency: CurrencyCode): Intl.NumberFormat {
  let f = currencyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    currencyFormatters.set(currency, f);
  }
  return f;
}

/** Money with the right currency symbol, no decimals (e.g. AED 12,000). */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  return formatterFor(currency).format(amount);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** A date string (YYYY-MM-DD) as "12 Jun 2026". */
export function formatDate(date: string | null): string {
  if (!date) return "—";
  return dateFmt.format(new Date(date));
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** A timestamp string as "12 Jun 2026, 14:32". */
export function formatDateTime(timestamp: string | null): string {
  if (!timestamp) return "—";
  return dateTimeFmt.format(new Date(timestamp));
}

/** Whole days from today until the given date. Negative if past. */
export function daysUntil(date: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Human-readable file size: "1.4 MB", "340 KB", "512 B". */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${bytes} B`;
}

/** Today as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
