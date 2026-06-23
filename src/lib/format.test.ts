import { describe, it, expect } from "vitest";
import { formatMoney, formatDate, daysUntil, todayISO } from "@/lib/format";

describe("formatMoney", () => {
  it("formats each currency with its own symbol and no decimals", () => {
    expect(formatMoney(9500, "AED")).toMatch(/AED/);
    expect(formatMoney(9500, "AED")).toMatch(/9,500/);
    expect(formatMoney(1250, "GBP")).toMatch(/£/);
    expect(formatMoney(1000000, "USD")).toMatch(/\$/);
    expect(formatMoney(1000000, "USD")).toMatch(/1,000,000/);
  });
  it("rounds to whole units", () => {
    expect(formatMoney(9500.49, "USD")).toMatch(/9,500/);
    expect(formatMoney(9500.49, "USD")).not.toMatch(/\.49/);
  });
});

describe("formatDate", () => {
  it("renders a YYYY-MM-DD as a friendly date", () => {
    expect(formatDate("2026-06-12")).toBe("12 Jun 2026");
  });
  it("renders a dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("daysUntil", () => {
  function isoOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  it("is zero for today", () => {
    expect(daysUntil(todayISO())).toBe(0);
  });
  it("counts forward and backward", () => {
    expect(daysUntil(isoOffset(10))).toBe(10);
    expect(daysUntil(isoOffset(-5))).toBe(-5);
  });
});

describe("todayISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
