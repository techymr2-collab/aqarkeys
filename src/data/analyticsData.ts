import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { daysUntil } from "@/lib/format";
import type {
  LeaseFrequency,
  LeaseStatus,
  UnitStatus,
} from "@/lib/database.types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function lastNMonthKeys(n: number): { key: string; label: string }[] {
  const now = new Date();
  const result: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    result.push({ key, label });
  }
  return result;
}

const FREQ_FACTOR: Record<LeaseFrequency, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
};

// ── Query row types ────────────────────────────────────────────────────────────

type InvRow = {
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  amount: number;
  vat_amount: number;
  paid_date: string | null;
  due_date: string;
};
type ExpRow = {
  category: string;
  amount: number;
  date: string;
};
type LeaseRow = {
  status: LeaseStatus;
  rent_amount: number;
  frequency: LeaseFrequency;
  end_date: string;
  unit: { property: { id: string; name: string } | null } | null;
};
type UnitRow = { status: UnitStatus };
type MaintRow = { category: string; cost: number | null; assignee: string | null };

// ── Public types ──────────────────────────────────────────────────────────────

export interface MonthlyTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  noi: number;
}

export interface PropertyRentRoll {
  name: string;
  monthlyRent: number;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface InvoiceAgingBucket {
  label: string;
  count: number;
  amount: number;
}

export interface CountBucket {
  label: string;
  count: number;
}

export interface NamedAmount {
  name: string;
  amount: number;
}

export interface AnalyticsData {
  // 12-month revenue vs expense trend
  monthlyTrend: MonthlyTrendPoint[];
  revenueYTD: number;
  expensesYTD: number;
  noiYTD: number;
  noiMargin: number; // NOI as % of revenue YTD

  // Month-over-month momentum (current vs previous calendar month)
  revenueMoM: number | null; // % change, null when no prior-month baseline
  expensesMoM: number | null;

  // Collections (this calendar year, by invoice due date)
  collectionRate: number; // collected / billed, 0–100
  collectedYTD: number;
  billedYTD: number;
  outstandingTotal: number; // current receivables (sent + overdue)

  // Output VAT collected on paid invoices this year (owed to the FTA)
  vatCollectedYTD: number;

  // Portfolio composition
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  unitStatusCounts: Record<UnitStatus, number>;

  // Rent roll (active leases, monthly-normalised)
  rentRoll: PropertyRentRoll[];

  // Expenses breakdown
  expensesByCategory: CategoryAmount[];

  // Invoice ageing
  invoiceAging: InvoiceAgingBucket[];

  // Lease status
  leaseStatusCounts: Record<LeaseStatus, number>;

  // Lease expirations in the next 90 days (active leases)
  leaseExpirations: CountBucket[];
  expiringSoon: number; // total active leases ending within 90 days

  // Maintenance costs
  maintenanceByCat: CategoryAmount[];
  totalMaintenanceCost: number;
  contractorSpend: NamedAmount[]; // resolved-job cost grouped by assignee
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalyticsData() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const [invRes, expRes, leaseRes, unitRes, maintRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("status, amount, vat_amount, paid_date, due_date")
          .returns<InvRow[]>(),
        supabase
          .from("expenses")
          .select("category, amount, date")
          .returns<ExpRow[]>(),
        supabase
          .from("leases")
          .select("status, rent_amount, frequency, end_date, unit:units(property:properties(id, name))")
          .returns<LeaseRow[]>(),
        supabase.from("units").select("status").returns<UnitRow[]>(),
        supabase
          .from("maintenance_requests")
          .select("category, cost, assignee")
          .returns<MaintRow[]>(),
      ]);

      if (invRes.error) throw invRes.error;
      if (expRes.error) throw expRes.error;
      if (leaseRes.error) throw leaseRes.error;
      if (unitRes.error) throw unitRes.error;
      if (maintRes.error) throw maintRes.error;

      const invoices = invRes.data;
      const expenses = expRes.data;
      const leases = leaseRes.data;
      const units = unitRes.data;
      const maintenance = maintRes.data;

      // ── Monthly trend (12 months) ──────────────────────────────────────────
      const months12 = lastNMonthKeys(12);
      const revByMonth = new Map<string, number>();
      const expByMonth = new Map<string, number>();

      for (const inv of invoices) {
        if (inv.status === "paid" && inv.paid_date) {
          const mk = inv.paid_date.substring(0, 7);
          revByMonth.set(mk, (revByMonth.get(mk) ?? 0) + inv.amount);
        }
      }
      for (const exp of expenses) {
        const mk = exp.date.substring(0, 7);
        expByMonth.set(mk, (expByMonth.get(mk) ?? 0) + exp.amount);
      }

      const monthlyTrend: MonthlyTrendPoint[] = months12.map(({ key, label }) => {
        const revenue = revByMonth.get(key) ?? 0;
        const exp = expByMonth.get(key) ?? 0;
        return { month: label, revenue, expenses: exp, noi: revenue - exp };
      });

      // ── YTD ───────────────────────────────────────────────────────────────
      const now = new Date();
      const thisYear = String(now.getFullYear());
      let revenueYTD = 0;
      let expensesYTD = 0;
      for (const [k, v] of revByMonth) if (k.startsWith(thisYear)) revenueYTD += v;
      for (const [k, v] of expByMonth) if (k.startsWith(thisYear)) expensesYTD += v;

      // ── Month-over-month momentum ──────────────────────────────────────────
      const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      const pctChange = (cur: number, base: number): number | null =>
        base > 0 ? Math.round(((cur - base) / base) * 100) : null;
      const revenueMoM = pctChange(revByMonth.get(thisMonthKey) ?? 0, revByMonth.get(lastMonthKey) ?? 0);
      const expensesMoM = pctChange(expByMonth.get(thisMonthKey) ?? 0, expByMonth.get(lastMonthKey) ?? 0);

      // ── Collections (this year, by due date) ───────────────────────────────
      let billedYTD = 0;
      let collectedYTD = 0;
      let outstandingTotal = 0;
      let vatCollectedYTD = 0;
      for (const inv of invoices) {
        if (inv.status !== "draft" && inv.status !== "void" && inv.due_date.startsWith(thisYear)) {
          billedYTD += inv.amount;
          if (inv.status === "paid") collectedYTD += inv.amount;
        }
        if (inv.status === "sent" || inv.status === "overdue") outstandingTotal += inv.amount;
        if (inv.status === "paid" && (inv.paid_date ?? "").startsWith(thisYear)) {
          vatCollectedYTD += inv.vat_amount ?? 0;
        }
      }
      const collectionRate = billedYTD > 0 ? Math.round((collectedYTD / billedYTD) * 100) : 0;

      // ── Unit status ───────────────────────────────────────────────────────
      const unitStatusCounts: Record<UnitStatus, number> = {
        occupied: 0,
        vacant: 0,
        under_maintenance: 0,
        reserved: 0,
      };
      for (const u of units) unitStatusCounts[u.status] += 1;
      const totalUnits = units.length;
      const occupiedUnits = unitStatusCounts.occupied;

      // ── Rent roll (active leases, normalised to monthly) ──────────────────
      const rollMap = new Map<string, PropertyRentRoll>();
      for (const l of leases) {
        if (l.status !== "active") continue;
        const prop = l.unit?.property;
        if (!prop) continue;
        let p = rollMap.get(prop.id);
        if (!p) {
          p = { name: prop.name, monthlyRent: 0 };
          rollMap.set(prop.id, p);
        }
        p.monthlyRent += l.rent_amount * (FREQ_FACTOR[l.frequency] ?? 1);
      }
      const rentRoll = [...rollMap.values()].sort((a, b) => b.monthlyRent - a.monthlyRent);

      // ── Expenses by category (all currencies, raw amounts) ────────────────
      const expCatMap = new Map<string, number>();
      for (const exp of expenses) {
        expCatMap.set(exp.category, (expCatMap.get(exp.category) ?? 0) + exp.amount);
      }
      const expensesByCategory: CategoryAmount[] = [...expCatMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      // ── Invoice ageing (overdue buckets) ──────────────────────────────────
      const today = Date.now();
      const invoiceAging: InvoiceAgingBucket[] = [
        { label: "1–30 days", count: 0, amount: 0 },
        { label: "31–60 days", count: 0, amount: 0 },
        { label: "61–90 days", count: 0, amount: 0 },
        { label: "90+ days", count: 0, amount: 0 },
      ];
      for (const inv of invoices) {
        if (inv.status !== "overdue") continue;
        const daysOver = Math.floor((today - new Date(inv.due_date).getTime()) / 86_400_000);
        const b = daysOver <= 30 ? 0 : daysOver <= 60 ? 1 : daysOver <= 90 ? 2 : 3;
        invoiceAging[b]!.count += 1;
        invoiceAging[b]!.amount += inv.amount;
      }

      // ── Lease status counts ───────────────────────────────────────────────
      const leaseStatusCounts: Record<LeaseStatus, number> = {
        active: 0,
        upcoming: 0,
        expired: 0,
        terminated: 0,
      };
      for (const l of leases) leaseStatusCounts[l.status] += 1;

      // ── Lease expirations in the next 90 days (active leases) ──────────────
      const leaseExpirations: CountBucket[] = [
        { label: "≤ 30 days", count: 0 },
        { label: "31–60 days", count: 0 },
        { label: "61–90 days", count: 0 },
      ];
      for (const l of leases) {
        if (l.status !== "active") continue;
        const d = daysUntil(l.end_date);
        if (d < 0 || d > 90) continue;
        const b = d <= 30 ? 0 : d <= 60 ? 1 : 2;
        leaseExpirations[b]!.count += 1;
      }
      const expiringSoon = leaseExpirations.reduce((sum, b) => sum + b.count, 0);

      // ── Maintenance costs by category ─────────────────────────────────────
      const maintMap = new Map<string, number>();
      const contractorMap = new Map<string, number>();
      let totalMaintenanceCost = 0;
      for (const m of maintenance) {
        if (m.cost != null && m.cost > 0) {
          maintMap.set(m.category, (maintMap.get(m.category) ?? 0) + m.cost);
          totalMaintenanceCost += m.cost;
          const who = m.assignee?.trim();
          if (who) contractorMap.set(who, (contractorMap.get(who) ?? 0) + m.cost);
        }
      }
      const maintenanceByCat: CategoryAmount[] = [...maintMap.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      const contractorSpend: NamedAmount[] = [...contractorMap.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      const noiYTD = revenueYTD - expensesYTD;

      return {
        monthlyTrend,
        revenueYTD,
        expensesYTD,
        noiYTD,
        noiMargin: revenueYTD > 0 ? Math.round((noiYTD / revenueYTD) * 100) : 0,
        revenueMoM,
        expensesMoM,
        collectionRate,
        collectedYTD,
        billedYTD,
        outstandingTotal,
        vatCollectedYTD,
        totalUnits,
        occupiedUnits,
        occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
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
      };
    },
  });
}
