import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  BanknoteIcon,
  BuildingIcon,
  ChartIcon,
  ReceiptIcon,
  WrenchIcon,
} from "@/components/icons";
import { useAnalyticsData } from "@/data/analyticsData";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { LeaseStatus, UnitStatus } from "@/lib/database.types";

// ── Shared chart style ─────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: 12,
  color: "#0f172a",
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.18)",
  fontSize: 13,
};

const AXIS_TICK = { fill: "#94a3b8", fontSize: 12 };

function shortNum(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-48 items-center justify-center text-sm text-slate-400">{message}</p>
  );
}

// ── Month-over-month delta indicator ────────────────────────────────────────────

function Delta({ pct, goodWhenUp = true }: { pct: number | null; goodWhenUp?: boolean }) {
  if (pct === null) return <span className="text-slate-400">No prior month</span>;
  if (pct === 0) return <span className="text-slate-500">Flat vs last month</span>;
  const up = pct > 0;
  const good = up === goodWhenUp;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", good ? "text-emerald-600" : "text-rose-600")}>
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {up ? <path d="M6 10V2M3 5l3-3 3 3" /> : <path d="M6 2v8M3 7l3 3 3-3" />}
      </svg>
      {Math.abs(pct)}% vs last month
    </span>
  );
}

// ── Unit status donut ──────────────────────────────────────────────────────────

const UNIT_COLORS: Record<UnitStatus, string> = {
  occupied: "#324CE3",
  vacant: "#fb7185",
  under_maintenance: "#fb923c",
  reserved: "#38bdf8",
};

const UNIT_LABELS: Record<UnitStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  under_maintenance: "Maintenance",
  reserved: "Reserved",
};

// ── Lease status pills ──────────────────────────────────────────────────────────

const LEASE_STATUS_CFG: {
  key: LeaseStatus;
  label: string;
  bg: string;
  text: string;
  dot: string;
}[] = [
  { key: "active", label: "Active", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { key: "upcoming", label: "Upcoming", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  { key: "expired", label: "Expired", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  {
    key: "terminated",
    label: "Terminated",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
];

// ── Lease expiration bucket styling ──────────────────────────────────────────────

const EXP_CFG = [
  { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
];

// ── Maintenance category labels ───────────────────────────────────────────────

const MAINT_CAT_LABEL: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  appliance: "Appliance",
  structural: "Structural",
  general: "General",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerAnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAnalyticsData();
  const [trendMonths, setTrendMonths] = useState<6 | 12>(12);

  if (isLoading) return <PageLoader label="Crunching your numbers" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const {
    monthlyTrend,
    revenueYTD,
    expensesYTD,
    noiYTD,
    noiMargin,
    revenueMoM,
    expensesMoM,
    collectionRate,
    collectedYTD,
    billedYTD,
    outstandingTotal,
    vatCollectedYTD,
    totalUnits,
    occupiedUnits,
    occupancyRate,
    unitStatusCounts,
    rentRoll,
    expensesByCategory,
    invoiceAging,
    leaseStatusCounts,
    leaseExpirations,
    expiringSoon,
    maintenanceByCat,
    totalMaintenanceCost,
    contractorSpend,
  } = data;

  const trendData = monthlyTrend.slice(-trendMonths);
  const hasTrend = monthlyTrend.some((m) => m.revenue > 0 || m.expenses > 0);
  const hasAging = invoiceAging.some((a) => a.count > 0);
  const hasRentRoll = rentRoll.length > 0;
  const hasMaint = maintenanceByCat.length > 0;

  const unitDonutData = (Object.keys(unitStatusCounts) as UnitStatus[])
    .filter((s) => unitStatusCounts[s] > 0)
    .map((s) => ({ name: UNIT_LABELS[s], value: unitStatusCounts[s], color: UNIT_COLORS[s] }));

  const rentRollChart = rentRoll.map((p) => ({ name: p.name, rent: Math.round(p.monthlyRent) }));

  const expCatChart = expensesByCategory.map((e) => ({
    name: e.category,
    amount: Math.round(e.amount),
  }));

  const maintChart = maintenanceByCat.map((m) => ({
    name: MAINT_CAT_LABEL[m.category] ?? m.category,
    amount: Math.round(m.amount),
  }));

  function moneyFmt(v: number) {
    return formatMoney(v, "AED");
  }

  const noiColor = noiYTD >= 0 ? "text-emerald-600" : "text-rose-600";
  const noiAccent = noiYTD >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600";
  const collectionColor =
    collectionRate >= 90 ? "text-emerald-600" : collectionRate >= 70 ? "text-amber-600" : "text-rose-600";

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Financial and operational insights · AED"
      />

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue YTD"
          value={<span className="text-2xl">{moneyFmt(revenueYTD)}</span>}
          hint={<Delta pct={revenueMoM} goodWhenUp />}
          icon={<BanknoteIcon className="h-5 w-5" />}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Expenses YTD"
          value={<span className="text-2xl">{moneyFmt(expensesYTD)}</span>}
          hint={<Delta pct={expensesMoM} goodWhenUp={false} />}
          icon={<ReceiptIcon className="h-5 w-5" />}
          accentClass="bg-rose-50 text-rose-600"
        />
        <StatCard
          label="NOI YTD"
          value={<span className={`text-2xl ${noiColor}`}>{moneyFmt(noiYTD)}</span>}
          hint={`${noiMargin}% net margin`}
          icon={<ChartIcon className="h-5 w-5" />}
          accentClass={noiAccent}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancyRate}%`}
          hint={`${occupiedUnits} of ${totalUnits} units filled`}
          icon={<BuildingIcon className="h-5 w-5" />}
          accentClass="bg-brand-50 text-brand-600"
        />
      </div>

      {/* ── Revenue vs Expenses trend + Rent roll ───────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Revenue vs Expenses"
              subtitle={`Last ${trendMonths} months · AED`}
              action={
                <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 text-xs">
                  {([6, 12] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTrendMonths(n)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition-colors",
                        trendMonths === n ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {n}M
                    </button>
                  ))}
                </div>
              }
            />
            {/* Legend */}
            <div className="mb-4 flex flex-wrap items-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                Expenses
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-0.5 w-4 rounded-full bg-brand-500" />
                NOI
              </span>
            </div>
            {hasTrend ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g-exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#0f172a0a" />
                    <XAxis
                      dataKey="month"
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      interval={trendMonths === 12 ? 1 : 0}
                    />
                    <YAxis
                      tickFormatter={shortNum}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, name: string) => [
                        moneyFmt(v),
                        name === "revenue" ? "Revenue" : name === "expenses" ? "Expenses" : "NOI",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      fill="url(#g-rev)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill="url(#g-exp)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#fb7185", strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="noi"
                      stroke="#324CE3"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 4, fill: "#324CE3", strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No paid invoices or expenses yet." />
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader
              title="Monthly rent roll"
              subtitle="Active leases, normalised to monthly"
            />
            {hasRentRoll ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={rentRollChart}
                    margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#0f172a0a" />
                    <XAxis
                      type="number"
                      tickFormatter={shortNum}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ ...AXIS_TICK, textAnchor: "end" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [moneyFmt(v), "Monthly rent"]}
                    />
                    <Bar dataKey="rent" name="Monthly rent" fill="#324CE3" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No active leases to display." />
            )}
          </Card>
        </div>
      </div>

      {/* ── Collections + ageing + Unit status donut ────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Collections & overdue ageing"
              subtitle="Receivables health and how long invoices stay unpaid"
            />
            {/* Collection stats */}
            <div className="mb-5 flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Collection rate · YTD
                </p>
                <p className={`mt-0.5 text-2xl font-bold ${collectionColor}`}>{collectionRate}%</p>
                <p className="text-xs text-slate-500">
                  {moneyFmt(collectedYTD)} of {moneyFmt(billedYTD)} billed
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Outstanding
                </p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{moneyFmt(outstandingTotal)}</p>
                <p className="text-xs text-slate-500">Sent + overdue invoices</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  VAT collected · YTD
                </p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{moneyFmt(vatCollectedYTD)}</p>
                <p className="text-xs text-slate-500">Output VAT owed to the FTA</p>
              </div>
            </div>
            {hasAging ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={invoiceAging}
                    margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                  >
                    <CartesianGrid vertical={false} stroke="#0f172a0a" />
                    <XAxis
                      dataKey="label"
                      tick={AXIS_TICK}
                      axisLine={{ stroke: "#0f172a14" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, _n, item) => [
                        `${v} · ${moneyFmt((item?.payload as { amount: number })?.amount ?? 0)}`,
                        "Invoices",
                      ]}
                    />
                    <Bar dataKey="count" name="count" radius={[6, 6, 0, 0]}>
                      {invoiceAging.map((_, i) => {
                        const c = i === 0 ? "#fbbf24" : i === 1 ? "#fb923c" : i === 2 ? "#f87171" : "#ef4444";
                        return <Cell key={i} fill={c} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <ReceiptIcon className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-900">No overdue invoices</p>
                <p className="text-sm text-slate-500">All rent is collected on time.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Unit status" subtitle="Current portfolio composition" />
            {unitDonutData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={unitDonutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={52}
                      outerRadius={78}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {unitDonutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No units yet." />
            )}
          </Card>
        </div>
      </div>

      {/* ── Expenses by category + Lease status ─────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Expenses by category"
              subtitle="All-time portfolio operating costs"
            />
            {expCatChart.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={expCatChart}
                    margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#0f172a0a" />
                    <XAxis
                      type="number"
                      tickFormatter={shortNum}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ ...AXIS_TICK, textAnchor: "end" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [moneyFmt(v), "Expenses"]}
                    />
                    <Bar dataKey="amount" name="amount" fill="#fb923c" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No expenses logged yet." />
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Lease status" subtitle="Portfolio lease lifecycle" />
            <div className="grid grid-cols-2 gap-3">
              {LEASE_STATUS_CFG.map(({ key, label, bg, text, dot }) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${bg}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                  <div>
                    <p className={`text-xl font-bold tabular-nums ${text}`}>
                      {leaseStatusCounts[key]}
                    </p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Lease expirations + Maintenance ─────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Lease expirations" subtitle="Active leases ending within 90 days" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{expiringSoon}</span>
              <span className="text-sm text-slate-500">
                {expiringSoon === 1 ? "lease ending soon" : "leases ending soon"}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {leaseExpirations.map((b, i) => (
                <div
                  key={b.label}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${EXP_CFG[i]!.bg}`}
                >
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${EXP_CFG[i]!.dot}`} />
                    {b.label}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${EXP_CFG[i]!.text}`}>{b.count}</span>
                </div>
              ))}
            </div>
            <Link
              to="/manager/renewals"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              Manage renewals →
            </Link>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader
              title="Maintenance spend"
              subtitle={`${moneyFmt(totalMaintenanceCost)} across all resolved work orders`}
              action={
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <WrenchIcon className="h-5 w-5" />
                </div>
              }
            />
            {hasMaint ? (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={maintChart}
                      margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} stroke="#0f172a0a" />
                      <XAxis
                        type="number"
                        tickFormatter={shortNum}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={90}
                        tick={{ ...AXIS_TICK, textAnchor: "end" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number) => [moneyFmt(v), "Cost"]}
                      />
                      <Bar dataKey="amount" name="amount" fill="#a78bfa" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {contractorSpend.length > 0 && (
                  <div className="mt-4 border-t border-slate-900/[0.06] pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Top contractors by spend
                    </p>
                    <ul className="space-y-1.5">
                      {contractorSpend.slice(0, 5).map((c) => (
                        <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-slate-700">{c.name}</span>
                          <span className="shrink-0 font-medium tabular-nums text-slate-900">
                            {moneyFmt(c.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyChart message="No maintenance costs logged yet." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
