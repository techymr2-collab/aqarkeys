import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyCode, UnitStatus } from "@/lib/database.types";

// ── DB row types (type aliases required for supabase-js compat) ────────────────

type PropRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  units: { status: UnitStatus }[];
};

type InvRow = {
  id: string;
  amount: number;
  status: string;
  paid_date: string | null;
  period_start: string;
  period_end: string;
  lease: {
    unit: { property_id: string } | null;
    tenant: { name: string } | null;
  } | null;
};

type ExpRow = {
  id: string;
  amount: number;
  date: string;
  category: string;
  property_id: string;
};

// ── Public exported types ──────────────────────────────────────────────────────

export type OwnerProperty = {
  id: string;
  name: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
};

export type OwnerInvoice = {
  id: string;
  amount: number;
  status: string;
  paidDate: string | null;
  periodStart: string;
  periodEnd: string;
  propertyId: string;
  tenantName: string;
};

export type OwnerExpense = {
  id: string;
  amount: number;
  date: string;
  category: string;
  propertyId: string;
};

export type OwnerMonthlyData = {
  properties: OwnerProperty[];
  invoices: OwnerInvoice[];
  expenses: OwnerExpense[];
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOwnerMonthlyData() {
  return useQuery({
    queryKey: ["owner-monthly-data"],
    queryFn: async (): Promise<OwnerMonthlyData> => {
      const [propsRes, invRes, expRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id, name, city, country, currency, units(status)")
          .order("name")
          .returns<PropRow[]>(),
        supabase
          .from("invoices")
          .select(
            "id, amount, status, paid_date, period_start, period_end, lease:leases(unit:units(property_id), tenant:tenants(name))",
          )
          .returns<InvRow[]>(),
        supabase
          .from("expenses")
          .select("id, amount, date, category, property_id")
          .order("date", { ascending: false })
          .returns<ExpRow[]>(),
      ]);
      if (propsRes.error) throw propsRes.error;
      if (invRes.error) throw invRes.error;
      if (expRes.error) throw expRes.error;

      const properties: OwnerProperty[] = propsRes.data.map((p) => {
        const totalUnits = p.units.length;
        const occupiedUnits = p.units.filter((u) => u.status === "occupied").length;
        return {
          id: p.id,
          name: p.name,
          city: p.city,
          country: p.country,
          currency: p.currency,
          totalUnits,
          occupiedUnits,
          occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        };
      });

      const invoices: OwnerInvoice[] = invRes.data
        .filter(
          (inv): inv is InvRow & {
            lease: { unit: { property_id: string }; tenant: { name: string } | null };
          } => typeof inv.lease?.unit?.property_id === "string",
        )
        .map((inv) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          paidDate: inv.paid_date,
          periodStart: inv.period_start,
          periodEnd: inv.period_end,
          propertyId: inv.lease.unit.property_id,
          tenantName: inv.lease.tenant?.name ?? "Unknown",
        }));

      const expenses: OwnerExpense[] = expRes.data.map((e) => ({
        id: e.id,
        amount: e.amount,
        date: e.date,
        category: e.category,
        propertyId: e.property_id,
      }));

      return { properties, invoices, expenses };
    },
    staleTime: 5 * 60 * 1000,
  });
}
