import { describe, it, expect } from "vitest";
import { addMonths, computeDuePeriods } from "@/lib/invoicePeriods";

describe("addMonths", () => {
  it("adds whole months on a mid-month date", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-01-15", 3)).toBe("2026-04-15");
  });
  it("advances first-of-month dates", () => {
    expect(addMonths("2026-01-01", 1)).toBe("2026-02-01");
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
  });
});

describe("computeDuePeriods", () => {
  it("generates monthly periods up to today, marking past ones overdue", () => {
    const periods = computeDuePeriods("2026-01-01", "2026-12-31", "monthly", "2026-03-15");
    expect(periods).toHaveLength(3); // Jan, Feb, Mar
    expect(periods.map((p) => p.period_start)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(periods.every((p) => p.status === "overdue")).toBe(true);
  });

  it("steps by frequency for quarterly leases", () => {
    const periods = computeDuePeriods("2026-01-01", "2027-01-01", "quarterly", "2026-06-15");
    expect(periods.map((p) => p.period_start)).toEqual(["2026-01-01", "2026-04-01"]);
    expect(periods[0]?.period_end).toBe("2026-04-01");
  });

  it("marks the current period as sent, not overdue", () => {
    const periods = computeDuePeriods("2026-03-15", "2027-03-15", "monthly", "2026-03-15");
    expect(periods).toHaveLength(1);
    expect(periods[0]?.status).toBe("sent");
  });

  it("does not generate future periods", () => {
    const periods = computeDuePeriods("2026-06-01", "2027-06-01", "monthly", "2026-06-10");
    expect(periods).toHaveLength(1);
    expect(periods[0]?.period_start).toBe("2026-06-01");
  });

  it("stops at the lease end date", () => {
    const periods = computeDuePeriods("2026-01-01", "2026-02-10", "monthly", "2026-12-01");
    expect(periods.map((p) => p.period_start)).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("returns nothing for a lease that starts in the future", () => {
    const periods = computeDuePeriods("2026-08-01", "2027-08-01", "monthly", "2026-06-01");
    expect(periods).toHaveLength(0);
  });

  it("judges overdue-ness against statusAsOf, not the look-ahead cutoff", () => {
    // Look 6 months ahead (generateThrough) but it's really only March —
    // periods from today onward must be "sent", not "overdue", even though
    // they all start before the look-ahead cutoff.
    const periods = computeDuePeriods(
      "2026-01-01",
      "2027-01-01",
      "monthly",
      "2026-09-01", // generateThrough: look 6 months ahead of March
      "2026-03-15", // statusAsOf: the real today
    );
    expect(periods.map((p) => p.period_start)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
    const byStart = new Map(periods.map((p) => [p.period_start, p.status]));
    // statusAsOf is 2026-03-15: periods starting before that are genuinely
    // overdue (Jan 1, Feb 1, Mar 1 all started before "today").
    expect(byStart.get("2026-01-01")).toBe("overdue");
    expect(byStart.get("2026-02-01")).toBe("overdue");
    expect(byStart.get("2026-03-01")).toBe("overdue");
    // Apr 1 onward hasn't started yet as of the real today — must be
    // "sent", not "overdue", even though the look-ahead cutoff (Sep 1)
    // reaches well past them.
    expect(byStart.get("2026-04-01")).toBe("sent");
    expect(byStart.get("2026-09-01")).toBe("sent");
  });
});
