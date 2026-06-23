// Hand maintained types that mirror the Postgres schema in
// supabase/migrations. Keeping these accurate keeps every query
// type safe with no `any`.

export type UserRole = "manager" | "owner" | "tenant";
export type UnitStatus = "occupied" | "vacant" | "under_maintenance" | "reserved";
export type LeaseFrequency = "monthly" | "quarterly" | "semiannual" | "annual";
export type LeaseStatus = "upcoming" | "active" | "expired" | "terminated";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type PaymentMethod = "bank_transfer" | "card" | "cash" | "cheque";
export type CurrencyCode = "AED" | "GBP" | "USD" | "CAD";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "structural"
  | "general";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus =
  | "submitted"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "cancelled";
export type PayoutStatus = "pending" | "paid";
export type PdcStatus = "pending" | "deposited" | "cleared" | "bounced" | "cancelled";
export type LeadStage =
  | "new"
  | "viewing"
  | "application"
  | "approved"
  | "converted"
  | "lost";

// NOTE: these are `type` aliases, not `interface`s, on purpose. supabase-js
// requires each table's Row/Insert/Update to be assignable to
// Record<string, unknown>. Interfaces have no implicit index signature and
// fail that constraint (the whole schema then degrades to `never`); type
// aliases satisfy it.
type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Organization = Timestamps & {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  trn: string | null;
  org_code: string;
};

export type Profile = Timestamps & {
  id: string;
  org_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
};

export type Owner = Timestamps & {
  id: string;
  org_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
};

export type Tenant = Timestamps & {
  id: string;
  org_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
};

export type Property = Timestamps & {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  management_fee_percent: number;
  vat_rate: number;
};

export type Unit = Timestamps & {
  id: string;
  org_id: string;
  property_id: string;
  label: string;
  beds: number;
  baths: number;
  status: UnitStatus;
  market_rent: number;
};

export type Lease = Timestamps & {
  id: string;
  org_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  frequency: LeaseFrequency;
  deposit_amount: number;
  currency: CurrencyCode;
  status: LeaseStatus;
};

export type Invoice = Timestamps & {
  id: string;
  org_id: string;
  lease_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  currency: CurrencyCode;
  due_date: string;
  status: InvoiceStatus;
  paid_date: string | null;
  payment_method: PaymentMethod | null;
  payment_reported_at: string | null;
  payment_reported_method: PaymentMethod | null;
  late_fee: number;
  vat_amount: number;
  amount_paid: number;
  invoice_no: number | null;
  notes: string | null;
};

export type InvoiceLineItem = {
  id: string;
  org_id: string;
  invoice_id: string;
  description: string;
  amount: number;
  created_at: string;
};

export type Expense = Timestamps & {
  id: string;
  org_id: string;
  property_id: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
};

export type Invitation = Timestamps & {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  owner_id: string | null;
  tenant_id: string | null;
  token: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
};

export type MaintenanceRequest = Timestamps & {
  id: string;
  org_id: string;
  unit_id: string;
  reported_by: string | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignee: string | null;
  vendor_id: string | null;
  cost: number | null;
  expense_id: string | null;
  resolved_at: string | null;
};

export type Vendor = Timestamps & {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  trade: MaintenanceCategory;
  email: string | null;
  phone: string | null;
  notes: string | null;
  hourly_rate: number | null;
  rating: number | null;
  is_active: boolean;
};

export type Document = {
  id: string;
  org_id: string;
  property_id: string | null;
  lease_id: string | null;
  uploaded_by: string | null;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

export type PdcCheque = Timestamps & {
  id: string;
  org_id: string;
  lease_id: string;
  cheque_number: string | null;
  bank_name: string | null;
  amount: number;
  due_date: string;
  status: PdcStatus;
  deposited_date: string | null;
  notes: string | null;
  invoice_id: string | null;
};

export type EjariRegistration = Timestamps & {
  id: string;
  org_id: string;
  lease_id: string;
  ejari_number: string;
  registered_at: string;
  expires_at: string | null;
  notes: string | null;
};

export type Lead = Timestamps & {
  id: string;
  org_id: string;
  unit_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: string | null;
  budget: number | null;
  desired_move_in: string | null;
  notes: string | null;
  tenant_id: string | null;
  lease_id: string | null;
};

export type Payout = Timestamps & {
  id: string;
  org_id: string;
  property_id: string;
  owner_id: string;
  period_start: string;
  period_end: string;
  currency: CurrencyCode;
  gross_collected: number;
  expenses_total: number;
  fee_percent: number;
  fee_amount: number;
  net_amount: number;
  status: PayoutStatus;
  paid_date: string | null;
  method: PaymentMethod | null;
  note: string | null;
};

export type AutomationRun = {
  id: string;
  ran_at: string;
  source: string;
  invoices_created: number;
  leases_activated: number;
  leases_expired: number;
  invoices_flagged: number;
};

// Helper to express insert/update shapes: server managed columns optional.
// Only `id` is required — some tables track a single timestamp under a
// different name (documents: created_at only; automation_runs: ran_at).
type ServerManaged = { id: string; created_at?: string; updated_at?: string };
// Insert/Update are intentionally permissive (all columns optional). The DB
// enforces NOT NULL; this keeps supabase-js's excess-property checks happy
// while still typing column names and value types.
type TableShape<Row extends ServerManaged> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      organizations: TableShape<Organization>;
      profiles: TableShape<Profile>;
      owners: TableShape<Owner>;
      tenants: TableShape<Tenant>;
      properties: TableShape<Property>;
      units: TableShape<Unit>;
      leases: TableShape<Lease>;
      invoices: TableShape<Invoice>;
      expenses: TableShape<Expense>;
      invitations: TableShape<Invitation>;
      maintenance_requests: TableShape<MaintenanceRequest>;
      vendors: TableShape<Vendor>;
      payouts: TableShape<Payout>;
      documents: TableShape<Document>;
      pdc_cheques: TableShape<PdcCheque>;
      ejari_registrations: TableShape<EjariRegistration>;
      automation_runs: TableShape<AutomationRun>;
      leads: TableShape<Lead>;
      invoice_line_items: TableShape<InvoiceLineItem>;
    };
    Views: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      report_payment: {
        Args: { p_invoice_id: string; p_method: PaymentMethod };
        Returns: void;
      };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          email: string;
          role: UserRole;
          org_name: string;
          valid: boolean;
        }[];
      };
      generate_payouts: {
        Args: { p_start: string; p_end: string };
        Returns: number;
      };
      run_scheduled_jobs: {
        Args: { p_source?: string };
        Returns: AutomationRun;
      };
      trigger_scheduled_jobs: {
        Args: Record<string, never>;
        Returns: AutomationRun;
      };
    };
    Enums: {
      user_role: UserRole;
      unit_status: UnitStatus;
      lease_frequency: LeaseFrequency;
      lease_status: LeaseStatus;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      currency_code: CurrencyCode;
      pdc_status: PdcStatus;
    };
  };
}
