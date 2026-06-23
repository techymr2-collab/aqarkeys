import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { pushToast } from "@/lib/toast";
import type { InvoiceWithRelations } from "@/data/invoices";
import type {
  CurrencyCode,
  LeaseFrequency,
  LeaseStatus,
  PaymentMethod,
  PdcStatus,
} from "@/lib/database.types";

export interface TenantLease {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  frequency: LeaseFrequency;
  currency: CurrencyCode;
  status: LeaseStatus;
  unit: {
    label: string;
    beds: number;
    baths: number;
    property: { name: string; address: string; city: string; country: string } | null;
  } | null;
  ejari: { ejari_number: string; registered_at: string; expires_at: string | null } | null;
}

export function useTenantLeases() {
  return useQuery({
    queryKey: ["tenant-leases"],
    queryFn: async (): Promise<TenantLease[]> => {
      const { data, error } = await supabase
        .from("leases")
        .select(
          "id, start_date, end_date, rent_amount, deposit_amount, frequency, currency, status, unit:units(label, beds, baths, property:properties(name, address, city, country)), ejari:ejari_registrations(ejari_number, registered_at, expires_at)",
        )
        .order("start_date", { ascending: false })
        .returns<TenantLease[]>();
      if (error) throw error;
      return data;
    },
  });
}

const TENANT_INVOICE_SELECT =
  "*, lease:leases(id, tenant:tenants(id, name), unit:units(id, label, property:properties(id, name)))";

export function useTenantInvoices() {
  return useQuery({
    queryKey: ["tenant-invoices"],
    queryFn: async (): Promise<InvoiceWithRelations[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(TENANT_INVOICE_SELECT)
        .order("due_date", { ascending: false })
        .returns<InvoiceWithRelations[]>();
      if (error) throw error;
      return data;
    },
  });
}

export interface TenantCheque {
  id: string;
  cheque_number: string | null;
  bank_name: string | null;
  amount: number;
  due_date: string;
  status: PdcStatus;
  deposited_date: string | null;
}

export function useTenantCheques() {
  return useQuery({
    queryKey: ["tenant-cheques"],
    queryFn: async (): Promise<TenantCheque[]> => {
      const { data, error } = await supabase
        .from("pdc_cheques")
        .select("id, cheque_number, bank_name, amount, due_date, status, deposited_date")
        .order("due_date", { ascending: true })
        .returns<TenantCheque[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useReportPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, method }: { invoiceId: string; method: PaymentMethod }) => {
      const { error } = await supabase.rpc("report_payment", {
        p_invoice_id: invoiceId,
        p_method: method,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenant-invoices"] });
      pushToast("Payment reported to your manager", "success");
    },
  });
}
