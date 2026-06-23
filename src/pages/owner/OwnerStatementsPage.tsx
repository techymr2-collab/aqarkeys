import { Fragment, useMemo, useState } from "react";
import { useOwnerMonthlyData, type OwnerInvoice, type OwnerExpense, type OwnerProperty } from "@/data/ownerMonthlyData";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatMoney, formatDate } from "@/lib/format";
import { PrinterIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useOrganization } from "@/data/organization";
import { useAuth } from "@/auth/useAuth";
import { downloadStatementPdf } from "@/lib/statementPdf";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";
import type { CurrencyCode } from "@/lib/database.types";

// ── Month helpers ─────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number): string {
  const parts = ym.split("-");
  const y = Number(parts[0] ?? "2026");
  const m = Number(parts[1] ?? "1");
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const parts = ym.split("-");
  const y = Number(parts[0] ?? "2026");
  const m = Number(parts[1] ?? "1");
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthBounds(ym: string): { start: string; end: string } {
  const parts = ym.split("-");
  const y = Number(parts[0] ?? "2026");
  const m = Number(parts[1] ?? "1");
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = new Date(y, m, 1); // new Date uses 0-based month, so m = next month index
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
}

function shortPeriod(date: string): string {
  const parts = date.split("-");
  const y = Number(parts[0] ?? "2026");
  const m = Number(parts[1] ?? "1");
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Derived type ──────────────────────────────────────────────────────────────

interface MonthlyPropertyStatement extends OwnerProperty {
  income: number;
  expenses: number;
  noi: number;
  outstanding: number;
  paidInvoices: OwnerInvoice[];
  expenseItems: OwnerExpense[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "rose" | "amber" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-600"
      : tone === "rose"
        ? "text-rose-600"
        : tone === "amber"
          ? "text-amber-600"
          : "text-slate-900";
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-900/[0.05] last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn("text-sm font-semibold", color)}>{value}</span>
    </div>
  );
}

function LineItem({
  label,
  sub,
  date,
  amount,
  currency,
}: {
  label: string;
  sub?: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <div className="min-w-0 truncate">
        <span className="font-medium text-slate-700">{label}</span>
        {sub && <span className="ml-2 text-[11px] text-slate-400">{sub}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-4 ml-3">
        <span className="text-[11px] text-slate-400 whitespace-nowrap">{date}</span>
        <span className="tabular-nums font-medium text-slate-800">
          {formatMoney(amount, currency)}
        </span>
      </div>
    </div>
  );
}

function StatementCard({
  p,
  yearMonth,
}: {
  p: MonthlyPropertyStatement;
  yearMonth: string;
}) {
  const hasItems = p.paidInvoices.length > 0 || p.expenseItems.length > 0;

  return (
    <div className="glass-card p-6 print:border print:border-slate-200 print:shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-900/[0.06]">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
          <p className="mt-0.5 text-sm text-slate-400">
            {p.city}, {p.country} · {p.currency} · {p.totalUnits} units ({p.occupiedUnits}{" "}
            occupied · {p.occupancyRate}%)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Net Operating Income
          </p>
          <p
            className={cn(
              "text-xl font-bold",
              p.noi >= 0 ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {formatMoney(p.noi, p.currency)}
          </p>
        </div>
      </div>

      {/* 4 stats */}
      <div className="mt-3 grid grid-cols-2 gap-x-8 sm:grid-cols-4 sm:gap-x-6">
        <StatCell
          label="Income this month"
          value={formatMoney(p.income, p.currency)}
          tone={p.income > 0 ? "green" : "slate"}
        />
        <StatCell
          label="Expenses this month"
          value={formatMoney(p.expenses, p.currency)}
          tone={p.expenses > 0 ? "rose" : "slate"}
        />
        <StatCell
          label="Outstanding"
          value={formatMoney(p.outstanding, p.currency)}
          tone={p.outstanding > 0 ? "amber" : "slate"}
        />
        <StatCell label="Occupancy" value={`${p.occupancyRate}%`} />
      </div>

      {/* Line items */}
      {hasItems && (
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {/* Paid invoices */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Payments received · {monthLabel(yearMonth)}
            </p>
            {p.paidInvoices.length === 0 ? (
              <p className="text-xs italic text-slate-400">None this month</p>
            ) : (
              <div className="divide-y divide-slate-900/[0.05]">
                {p.paidInvoices.map((inv) => (
                  <LineItem
                    key={inv.id}
                    label={inv.tenantName}
                    sub={shortPeriod(inv.periodStart)}
                    date={formatDate(inv.paidDate)}
                    amount={inv.amount}
                    currency={p.currency}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Expenses · {monthLabel(yearMonth)}
            </p>
            {p.expenseItems.length === 0 ? (
              <p className="text-xs italic text-slate-400">None this month</p>
            ) : (
              <div className="divide-y divide-slate-900/[0.05]">
                {p.expenseItems.map((exp) => (
                  <LineItem
                    key={exp.id}
                    label={exp.category}
                    date={formatDate(exp.date)}
                    amount={exp.amount}
                    currency={p.currency}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasItems && (
        <p className="mt-4 text-center text-sm text-slate-400">
          No activity recorded for {monthLabel(yearMonth)}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OwnerStatementsPage() {
  const { data, isLoading, isError, refetch } = useOwnerMonthlyData();
  const { data: org } = useOrganization();
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [pdfBusy, setPdfBusy] = useState(false);
  const nowMonth = useMemo(currentYearMonth, []);

  const { start, end } = useMemo(() => monthBounds(selectedMonth), [selectedMonth]);

  const statements = useMemo((): MonthlyPropertyStatement[] => {
    if (!data) return [];
    return data.properties.map((prop) => {
      const propInv = data.invoices.filter((inv) => inv.propertyId === prop.id);
      const propExp = data.expenses.filter((exp) => exp.propertyId === prop.id);

      const paidInvoices = propInv.filter(
        (inv) =>
          inv.status === "paid" &&
          inv.paidDate != null &&
          inv.paidDate >= start &&
          inv.paidDate < end,
      );
      const expenseItems = propExp.filter(
        (exp) => exp.date >= start && exp.date < end,
      );

      const income = paidInvoices.reduce((s, inv) => s + inv.amount, 0);
      const expenses = expenseItems.reduce((s, exp) => s + exp.amount, 0);
      const outstanding = propInv
        .filter((inv) => inv.status === "sent" || inv.status === "overdue")
        .reduce((s, inv) => s + inv.amount, 0);

      return {
        ...prop,
        income,
        expenses,
        noi: income - expenses,
        outstanding,
        paidInvoices,
        expenseItems,
      };
    });
  }, [data, start, end]);

  const totals = useMemo(() => {
    let income = 0, expenses = 0, noi = 0, outstanding = 0;
    for (const s of statements) {
      income += s.income;
      expenses += s.expenses;
      noi += s.noi;
      outstanding += s.outstanding;
    }
    return { income, expenses, noi, outstanding };
  }, [statements]);

  async function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      await downloadStatementPdf({
        org: org ?? null,
        ownerName: profile?.full_name || "Owner",
        monthLabel: monthLabel(selectedMonth),
        currency: "AED",
        totals,
        properties: statements.map((p) => ({
          name: p.name,
          currency: p.currency,
          income: p.income,
          expenses: p.expenses,
          noi: p.noi,
          outstanding: p.outstanding,
          payments: p.paidInvoices.map((inv) => ({
            tenant: inv.tenantName,
            period: shortPeriod(inv.periodStart),
            date: formatDate(inv.paidDate),
            amount: inv.amount,
          })),
          expenseItems: p.expenseItems.map((exp) => ({
            category: exp.category,
            date: formatDate(exp.date),
            amount: exp.amount,
          })),
        })),
      });
    } catch (err) {
      pushToast(friendlyError(err, "Could not generate the statement PDF."), "error");
    } finally {
      setPdfBusy(false);
    }
  }

  if (isLoading) return <PageLoader label="Loading statements" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Monthly Statements"
        subtitle="Income and expenses per property for the selected month."
      />

      {/* Month navigation + print */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[168px] px-1 text-center text-sm font-semibold text-slate-900">
            {monthLabel(selectedMonth)}
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
            disabled={selectedMonth >= nowMonth}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfBusy}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            {pdfBusy ? "Preparing…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Portfolio summary strip */}
      {statements.length > 0 && (
        <div className="glass-card mb-6 p-0 print:hidden">
          <div className="px-5 py-3 border-b border-slate-900/[0.06] bg-slate-50/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Portfolio summary · {monthLabel(selectedMonth)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-900/[0.04] sm:grid-cols-4">
            {[
              { label: "Income", value: totals.income, tone: "emerald" },
              { label: "Expenses", value: totals.expenses, tone: "rose" },
              { label: "NOI", value: totals.noi, tone: totals.noi >= 0 ? "emerald" : "rose" },
              { label: "Outstanding", value: totals.outstanding, tone: totals.outstanding > 0 ? "amber" : "slate" },
            ].map(({ label, value, tone }) => (
              <div key={label} className="bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </p>
                <p className={cn(
                  "mt-1 tabular-nums text-xl font-bold",
                  tone === "emerald" && "text-emerald-600",
                  tone === "rose" && "text-rose-600",
                  tone === "amber" && "text-amber-600",
                  tone === "slate" && "text-slate-400",
                )}>
                  {formatMoney(value, "AED")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property statement cards */}
      {data.properties.length === 0 ? (
        <EmptyState
          title="No properties"
          description="Statements appear once you have properties with rent activity."
        />
      ) : (
        <div className="space-y-4">
          {statements.map((p) => (
            <Fragment key={p.id}>
              <StatementCard p={p} yearMonth={selectedMonth} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
