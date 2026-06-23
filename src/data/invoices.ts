import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { todayISO } from "@/lib/format";
import { computeDuePeriods } from "@/lib/invoicePeriods";
import { downloadCsv } from "@/lib/csv";
import { pushToast } from "@/lib/toast";
import type {
  CurrencyCode,
  Invoice,
  InvoiceStatus,
  LeaseFrequency,
  PaymentMethod,
} from "@/lib/database.types";

type InvoiceInsertRow = {
  org_id: string;
  lease_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat_amount: number;
  currency: CurrencyCode;
  due_date: string;
  status: InvoiceStatus;
};

/** VAT on net rent at the given percent rate, rounded to 2 decimals (fils). */
export function vatFor(rent: number, vatRate: number): number {
  return Math.round(((rent * vatRate) / 100) * 100) / 100;
}

export interface InvoiceWithRelations extends Invoice {
  lease: {
    id: string;
    tenant: { id: string; name: string } | null;
    unit: { id: string; label: string; property: { id: string; name: string } | null } | null;
  } | null;
}

const SELECT =
  "*, lease:leases(id, tenant:tenants(id, name), unit:units(id, label, property:properties(id, name)))";

const KEY = ["invoices"] as const;

export function useInvoices() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<InvoiceWithRelations[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(SELECT)
        .order("due_date", { ascending: false })
        .returns<InvoiceWithRelations[]>();
      if (error) throw error;
      return data;
    },
  });
}

interface GenLease {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  frequency: LeaseFrequency;
  currency: CurrencyCode;
  unit: { property: { vat_rate: number } | null } | null;
}

/**
 * Generate any missing rent invoices for every active lease, for periods
 * that have already started (period_start <= today). Idempotent: skips a
 * period that already has an invoice. Returns how many were created.
 */
export function useGenerateInvoices() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!profile) throw new Error("Not signed in");
      const today = todayISO();

      const { data: leases, error: leaseErr } = await supabase
        .from("leases")
        .select(
          "id, start_date, end_date, rent_amount, frequency, currency, unit:units(property:properties(vat_rate))",
        )
        .eq("status", "active")
        .returns<GenLease[]>();
      if (leaseErr) throw leaseErr;

      const { data: existing, error: invErr } = await supabase
        .from("invoices")
        .select("lease_id, period_start");
      if (invErr) throw invErr;
      const seen = new Set(existing.map((i) => `${i.lease_id}|${i.period_start}`));

      const rows: InvoiceInsertRow[] = [];
      for (const lease of leases) {
        const periods = computeDuePeriods(
          lease.start_date,
          lease.end_date,
          lease.frequency,
          today,
        );
        for (const period of periods) {
          const key = `${lease.id}|${period.period_start}`;
          if (seen.has(key)) continue;
          rows.push({
            org_id: profile.org_id,
            lease_id: lease.id,
            period_start: period.period_start,
            period_end: period.period_end,
            amount: lease.rent_amount,
            vat_amount: vatFor(lease.rent_amount, lease.unit?.property?.vat_rate ?? 0),
            currency: lease.currency,
            due_date: period.period_start,
            status: period.status,
          });
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("invoices").insert(rows);
        if (error) throw error;
      }
      return rows.length;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Flag still-unpaid sent invoices whose due date has passed. */
export function useFlagOverdue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .eq("status", "sent")
        .lt("due_date", todayISO());
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface RecordPaymentInput {
  id: string;
  /** This payment's amount — may be less than the remaining balance. */
  amount: number;
  /** The invoice's full total (rent + VAT + late fee). */
  total: number;
  /** amount_paid already on the invoice before this payment. */
  amountPaidSoFar: number;
  date: string;
  method: PaymentMethod;
}

/**
 * Records a payment against an invoice. amount_paid accumulates; the
 * invoice only flips to 'paid' once it covers the full total — a smaller
 * amount just raises amount_paid and leaves status (sent/overdue) as is,
 * so the remaining balance stays visible.
 */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      amount,
      total,
      amountPaidSoFar,
      date,
      method,
    }: RecordPaymentInput): Promise<boolean> => {
      const amount_paid = amountPaidSoFar + amount;
      const fullyPaid = amount_paid >= total;
      const update: Partial<Invoice> = { amount_paid };
      if (fullyPaid) {
        update.status = "paid";
        update.paid_date = date;
        update.payment_method = method;
      }
      const { error } = await supabase.from("invoices").update(update).eq("id", id);
      if (error) throw error;
      return fullyPaid;
    },
    onSuccess: (fullyPaid) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
      pushToast(fullyPaid ? "Payment recorded — invoice fully paid" : "Partial payment recorded", "success");
    },
  });
}

export interface UpdateInvoiceInput {
  id: string;
  amount: number;
  due_date: string;
  period_start: string;
  period_end: string;
  notes: string | null;
}

/** Edits an invoice's core fields. Guard against paid/void in the UI. */
export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateInvoiceInput) => {
      const { error } = await supabase.from("invoices").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      pushToast("Invoice updated", "success");
    },
  });
}

export interface CreateInvoiceInput {
  lease_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount: number;
  vat_amount: number;
  currency: CurrencyCode;
  status: "draft" | "sent";
  notes: string | null;
}

/** Manually creates an ad-hoc invoice (not tied to the automatic rent schedule). */
export function useCreateInvoice() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput): Promise<Invoice> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      pushToast(input.status === "draft" ? "Draft invoice created" : "Invoice created", "success");
    },
  });
}

/** Issues a draft invoice — its sequential invoice_no is assigned server-side on this transition. */
export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "sent" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      pushToast("Invoice sent", "success");
    },
  });
}

/** Cancels an invoice without deleting it, preserving the record for audit. */
export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string | null }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "void", notes: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
      pushToast("Invoice voided", "success");
    },
  });
}

export interface BulkMarkPaidRow {
  id: string;
  amount: number;
  vat_amount: number;
  late_fee: number;
}

/** Marks several invoices fully paid in one go (e.g. a batch of cash receipts). */
export function useBulkMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      date,
      method,
    }: {
      rows: BulkMarkPaidRow[];
      date: string;
      method: PaymentMethod;
    }): Promise<number> => {
      // Fold in any ad-hoc line items so a row with extra charges is marked
      // paid for its real total, not just rent + VAT + late fee.
      const { data: lineItems, error: liErr } = await supabase
        .from("invoice_line_items")
        .select("invoice_id, amount")
        .in("invoice_id", rows.map((r) => r.id));
      if (liErr) throw liErr;
      const lineItemTotals = new Map<string, number>();
      for (const li of lineItems) {
        lineItemTotals.set(li.invoice_id, (lineItemTotals.get(li.invoice_id) ?? 0) + li.amount);
      }

      await Promise.all(
        rows.map(async (r) => {
          const total = r.amount + r.vat_amount + r.late_fee + (lineItemTotals.get(r.id) ?? 0);
          const { error } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_date: date,
              payment_method: method,
              amount_paid: total,
            })
            .eq("id", r.id);
          if (error) throw error;
        }),
      );
      return rows.length;
    },
    onSuccess: (count) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
      pushToast(`${count} invoice${count === 1 ? "" : "s"} marked paid`, "success");
    },
  });
}

/** Deletes several invoices at once. */
export function useBulkDeleteInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      if (ids.length === 0) return 0;
      const { error } = await supabase.from("invoices").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
      pushToast(`${count} invoice${count === 1 ? "" : "s"} deleted`, "success");
    },
  });
}

/** Downloads the given invoices as a CSV for accounting reconciliation. */
export function exportInvoicesCsv(invoices: InvoiceWithRelations[]): void {
  const headers = [
    "Invoice #",
    "Tenant",
    "Unit",
    "Property",
    "Period start",
    "Period end",
    "Due date",
    "Amount",
    "VAT",
    "Late fee",
    "Amount paid",
    "Total",
    "Status",
  ];
  const rows = invoices.map((inv) => [
    inv.invoice_no != null ? String(inv.invoice_no) : "",
    inv.lease?.tenant?.name ?? "",
    inv.lease?.unit?.label ?? "",
    inv.lease?.unit?.property?.name ?? "",
    inv.period_start,
    inv.period_end,
    inv.due_date,
    String(inv.amount),
    String(inv.vat_amount),
    String(inv.late_fee),
    String(inv.amount_paid),
    String(inv.amount + inv.vat_amount + inv.late_fee),
    inv.status,
  ]);
  downloadCsv(`invoices-${todayISO()}.csv`, headers, rows);
}

export interface BulkInvoiceRow {
  lease_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat_amount: number;
  currency: CurrencyCode;
  due_date: string;
  status: InvoiceStatus;
}

export function useApplyLateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lateFee }: { id: string; lateFee: number }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ late_fee: lateFee })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useGenerateBulkInvoices() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (rows: BulkInvoiceRow[]): Promise<number> => {
      if (!profile) throw new Error("Not signed in");
      if (rows.length === 0) return 0;
      const inserts: InvoiceInsertRow[] = rows.map((r) => ({
        org_id: profile.org_id,
        lease_id: r.lease_id,
        period_start: r.period_start,
        period_end: r.period_end,
        amount: r.amount,
        vat_amount: r.vat_amount,
        currency: r.currency,
        due_date: r.due_date,
        status: r.status,
      }));
      const { error } = await supabase.from("invoices").insert(inserts);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["manager-stats"] });
      void qc.invalidateQueries({ queryKey: ["owner-stats"] });
    },
  });
}
