import type { LeaseFrequency } from "@/lib/database.types";

export const MONTHS_BY_FREQUENCY: Record<LeaseFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

/** Add whole months to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export interface DuePeriod {
  period_start: string;
  period_end: string;
  status: "overdue" | "sent";
}

/**
 * Rent periods for a lease that have started on or before `generateThrough`,
 * stepping by the lease frequency and stopping at the lease end. A period
 * whose start is strictly before `statusAsOf` is overdue; otherwise it's
 * merely sent. Pure and deterministic so it can be unit tested.
 *
 * `generateThrough` and `statusAsOf` are deliberately separate: a look-ahead
 * preview (e.g. "generate the next 6 months") wants to generate further
 * ahead than today while still judging overdue-ness against the *real*
 * today — not the look-ahead cutoff. Most callers pass the same value for
 * both (the normal "generate what's due as of today" case), so `statusAsOf`
 * defaults to `generateThrough` when omitted.
 */
export function computeDuePeriods(
  startISO: string,
  endISO: string,
  frequency: LeaseFrequency,
  generateThrough: string,
  statusAsOf: string = generateThrough,
): DuePeriod[] {
  const step = MONTHS_BY_FREQUENCY[frequency];
  const periods: DuePeriod[] = [];
  let periodStart = startISO;
  // 240 = a defensive cap (20 years of monthly periods).
  for (let i = 0; i < 240; i++) {
    if (periodStart > generateThrough || periodStart > endISO) break;
    const periodEnd = addMonths(periodStart, step);
    periods.push({
      period_start: periodStart,
      period_end: periodEnd,
      status: periodStart < statusAsOf ? "overdue" : "sent",
    });
    periodStart = periodEnd;
  }
  return periods;
}
