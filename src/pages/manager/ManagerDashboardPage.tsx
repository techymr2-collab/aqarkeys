import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  BuildingIcon,
  ChartIcon,
  BanknoteIcon,
  DocumentIcon,
  UsersIcon,
  ReceiptIcon,
  WrenchIcon,
  HomeIcon,
} from "@/components/icons";
import { useManagerStats } from "@/data/stats";
import { formatMoney } from "@/lib/format";
import { invoiceStatusLabel } from "@/lib/labels";
import type { InvoiceStatus } from "@/lib/database.types";

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #0f172a14",
  borderRadius: 12,
  color: "#0f172a",
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.18)",
  fontSize: 13,
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "#94a3b8",
  sent: "#38bdf8",
  paid: "#34d399",
  overdue: "#fb7185",
  void: "#cbd5e1",
};

export function ManagerDashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch } = useManagerStats();

  if (isLoading) return <PageLoader label="Loading your dashboard" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const invoiceChartData = (Object.keys(data.invoiceStatusCounts) as InvoiceStatus[]).map((s) => ({
    status: invoiceStatusLabel[s],
    key: s,
    count: data.invoiceStatusCounts[s],
  }));
  const hasInvoices = invoiceChartData.some((d) => d.count > 0);

  const openWorkOrders = data.maintenanceCounts.submitted + data.maintenanceCounts.in_progress;
  const hasMonthlyActivity = data.monthlyActivity.some((m) => m.paid > 0);

  const primaryByCurrency = data.byCurrency[0];

  return (
    <div>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Your portfolio at a glance." />

      {/* ── Primary stats ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${data.occupancyRate}%`}
          hint={`${data.occupiedUnits} of ${data.totalUnits} units`}
          icon={<BuildingIcon className="h-5 w-5" />}
          accentClass="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Collection rate"
          value={`${data.collectionRate}%`}
          hint="Paid vs billed invoices"
          icon={<ChartIcon className="h-5 w-5" />}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Outstanding"
          value={
            primaryByCurrency ? (
              <span className="text-2xl">
                {formatMoney(primaryByCurrency.outstanding, primaryByCurrency.currency)}
              </span>
            ) : (
              "—"
            )
          }
          hint={
            data.byCurrency.length > 1 ? (
              <div className="space-y-0.5">
                {data.byCurrency.slice(1).map((c) => (
                  <div key={c.currency}>{formatMoney(c.outstanding, c.currency)}</div>
                ))}
              </div>
            ) : (
              "Unpaid rent across portfolio"
            )
          }
          icon={<BanknoteIcon className="h-5 w-5" />}
          accentClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Lease expiries"
          value={data.expiring.length}
          hint="Within the next 60 days"
          icon={<DocumentIcon className="h-5 w-5" />}
          accentClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* ── Secondary stats ────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={data.totalProperties}
          hint={`${data.totalUnits} units total`}
          icon={<HomeIcon className="h-5 w-5" />}
          accentClass="bg-sky-50 text-sky-600"
        />
        <StatCard
          label="Active leases"
          value={data.activeLeases}
          hint="Currently running"
          icon={<ReceiptIcon className="h-5 w-5" />}
          accentClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Tenants"
          value={data.totalTenants}
          hint="In your portfolio"
          icon={<UsersIcon className="h-5 w-5" />}
          accentClass="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Open work orders"
          value={openWorkOrders}
          hint={
            data.maintenanceCounts.on_hold > 0
              ? `${data.maintenanceCounts.on_hold} on hold`
              : "Submitted & in progress"
          }
          icon={<WrenchIcon className="h-5 w-5" />}
          accentClass="bg-orange-50 text-orange-600"
        />
      </div>

      {/* ── Monthly activity + Property occupancy ──────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Monthly collections"
              subtitle="Payments received in the last 6 months"
            />
            {hasMonthlyActivity ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.monthlyActivity}
                    margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient id="grad-paid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#0f172a0a" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "#0f172a0a", strokeWidth: 1 }}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [v, "Payments"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="paid"
                      name="Payments"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      fill="url(#grad-paid)"
                      dot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#34d399" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No payments recorded yet. Mark invoices as paid to see the trend.
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Property occupancy" subtitle="Units filled per property" />
            {data.propertyOccupancy.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No properties yet.</p>
            ) : (
              <ul className="space-y-4">
                {data.propertyOccupancy.map((p) => (
                  <li key={p.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {p.occupied}/{p.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${p.rate}%` }}
                        role="progressbar"
                        aria-valuenow={p.rate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${p.name}: ${p.rate}% occupied`}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-slate-400">{p.rate}%</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ── Invoice status + Lease expiries ───────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader title="Invoices by status" subtitle="Across all time" />
            {hasInvoices ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={invoiceChartData}
                    margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                  >
                    <CartesianGrid vertical={false} stroke="#0f172a0a" />
                    <XAxis
                      dataKey="status"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={{ stroke: "#0f172a14" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#0f172a06" }}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="count" name="Invoices" radius={[6, 6, 0, 0]}>
                      {invoiceChartData.map((d) => (
                        <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No invoices yet. Generate them from the Invoices tab.
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Upcoming expiries" subtitle="Next 60 days" />
            {data.expiring.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Nothing expiring soon. You are clear.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.expiring.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{l.tenant}</p>
                      <p className="truncate text-xs text-slate-500">
                        {l.property} · {l.unit}
                      </p>
                    </div>
                    <Badge tone={l.days <= 30 ? "rose" : "amber"}>{l.days}d</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ── Maintenance breakdown (only when there are requests) ─────── */}
      {Object.values(data.maintenanceCounts).some((n) => n > 0) && (
        <div className="mt-4">
          <Card>
            <CardHeader title="Maintenance overview" subtitle="Work order status breakdown" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  { key: "submitted", label: "Submitted", color: "bg-sky-500" },
                  { key: "in_progress", label: "In progress", color: "bg-brand-500" },
                  { key: "on_hold", label: "On hold", color: "bg-amber-400" },
                  { key: "resolved", label: "Resolved", color: "bg-emerald-500" },
                  { key: "cancelled", label: "Cancelled", color: "bg-slate-300" },
                ] as const
              ).map(({ key, label, color }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl border border-slate-900/6 bg-white/60 px-4 py-3"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                  <div className="min-w-0">
                    <p className="text-xl font-bold tabular-nums text-slate-900">
                      {data.maintenanceCounts[key]}
                    </p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {data.totalUnits === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Your portfolio is empty"
            description="Add a property and some units to bring this dashboard to life."
          />
        </div>
      )}
    </div>
  );
}
