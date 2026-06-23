import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyCode, UnitStatus } from "@/lib/database.types";

export interface PropertyStatement {
  id: string;
  name: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  collectedThisMonth: number;
  outstanding: number;
  income: number; // all-time collected rent
  expenses: number;
  net: number;
}

export interface OwnerStats {
  properties: PropertyStatement[];
  totalsByCurrency: { currency: CurrencyCode; collectedThisMonth: number; outstanding: number }[];
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

interface PropRow {
  id: string;
  name: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  units: { status: UnitStatus }[];
}
interface InvRow {
  amount: number;
  status: string;
  paid_date: string | null;
  lease: { unit: { property_id: string } | null } | null;
}
interface ExpRow {
  property_id: string;
  amount: number;
}

export function useOwnerStats() {
  return useQuery({
    queryKey: ["owner-stats"],
    queryFn: async (): Promise<OwnerStats> => {
      const [propsRes, invRes, expRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id, name, city, country, currency, units(status)")
          .order("name")
          .returns<PropRow[]>(),
        supabase
          .from("invoices")
          .select("amount, status, paid_date, lease:leases(unit:units(property_id))")
          .returns<InvRow[]>(),
        supabase.from("expenses").select("property_id, amount").returns<ExpRow[]>(),
      ]);
      if (propsRes.error) throw propsRes.error;
      if (invRes.error) throw invRes.error;
      if (expRes.error) throw expRes.error;

      const monthStart = startOfMonthISO();

      const statements = new Map<string, PropertyStatement>();
      for (const p of propsRes.data) {
        const totalUnits = p.units.length;
        const occupiedUnits = p.units.filter((u) => u.status === "occupied").length;
        statements.set(p.id, {
          id: p.id,
          name: p.name,
          city: p.city,
          country: p.country,
          currency: p.currency,
          totalUnits,
          occupiedUnits,
          occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
          collectedThisMonth: 0,
          outstanding: 0,
          income: 0,
          expenses: 0,
          net: 0,
        });
      }

      for (const inv of invRes.data) {
        const pid = inv.lease?.unit?.property_id;
        if (!pid) continue;
        const st = statements.get(pid);
        if (!st) continue;
        if (inv.status === "paid") {
          st.income += inv.amount;
          if (inv.paid_date && inv.paid_date >= monthStart) {
            st.collectedThisMonth += inv.amount;
          }
        } else if (inv.status === "sent" || inv.status === "overdue") {
          st.outstanding += inv.amount;
        }
      }

      for (const exp of expRes.data) {
        const st = statements.get(exp.property_id);
        if (st) st.expenses += exp.amount;
      }

      const totals = new Map<CurrencyCode, { currency: CurrencyCode; collectedThisMonth: number; outstanding: number }>();
      for (const st of statements.values()) {
        st.net = st.income - st.expenses;
        let t = totals.get(st.currency);
        if (!t) {
          t = { currency: st.currency, collectedThisMonth: 0, outstanding: 0 };
          totals.set(st.currency, t);
        }
        t.collectedThisMonth += st.collectedThisMonth;
        t.outstanding += st.outstanding;
      }

      return {
        properties: [...statements.values()],
        totalsByCurrency: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      };
    },
  });
}
