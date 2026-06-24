import type {
  DepositStatus,
  InvoiceStatus,
  LeadStage,
  LeaseFrequency,
  LeaseStatus,
  MaintenanceApprovalStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PayoutStatus,
  PdcStatus,
  UnitStatus,
} from "@/lib/database.types";

export type Tone = "green" | "amber" | "rose" | "slate" | "brand" | "blue";

export const unitStatusLabel: Record<UnitStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  under_maintenance: "Under maintenance",
  reserved: "Reserved",
};

export const unitStatusTone: Record<UnitStatus, Tone> = {
  occupied: "green",
  vacant: "slate",
  under_maintenance: "amber",
  reserved: "blue",
};

export const leaseStatusLabel: Record<LeaseStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  expired: "Expired",
  terminated: "Terminated",
};

export const leaseStatusTone: Record<LeaseStatus, Tone> = {
  upcoming: "blue",
  active: "green",
  expired: "slate",
  terminated: "rose",
};

export const depositStatusLabel: Record<DepositStatus, string> = {
  held: "Held",
  returned: "Returned",
  partially_returned: "Partially returned",
  forfeited: "Forfeited",
};

export const depositStatusTone: Record<DepositStatus, Tone> = {
  held: "amber",
  returned: "green",
  partially_returned: "blue",
  forfeited: "rose",
};

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export const invoiceStatusTone: Record<InvoiceStatus, Tone> = {
  draft: "slate",
  sent: "blue",
  paid: "green",
  overdue: "rose",
  void: "slate",
};

export const frequencyLabel: Record<LeaseFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
  cheque: "Cheque",
};

export const maintenanceCategoryLabel: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "Heating and cooling",
  appliance: "Appliance",
  structural: "Structural",
  general: "General",
};

export const maintenancePriorityLabel: Record<MaintenancePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const maintenancePriorityTone: Record<MaintenancePriority, Tone> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "rose",
};

export const maintenanceStatusLabel: Record<MaintenanceStatus, string> = {
  submitted: "Submitted",
  in_progress: "In progress",
  on_hold: "On hold",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export const maintenanceStatusTone: Record<MaintenanceStatus, Tone> = {
  submitted: "blue",
  in_progress: "brand",
  on_hold: "amber",
  resolved: "green",
  cancelled: "slate",
};

export const maintenanceApprovalStatusLabel: Record<MaintenanceApprovalStatus, string> = {
  not_required: "—",
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const maintenanceApprovalStatusTone: Record<MaintenanceApprovalStatus, Tone> = {
  not_required: "slate",
  pending: "amber",
  approved: "green",
  rejected: "rose",
};

export const payoutStatusLabel: Record<PayoutStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  void: "Void",
};

export const payoutStatusTone: Record<PayoutStatus, Tone> = {
  pending: "amber",
  paid: "green",
  void: "slate",
};

export const pdcStatusLabel: Record<PdcStatus, string> = {
  pending: "Pending",
  deposited: "Deposited",
  cleared: "Cleared",
  bounced: "Bounced",
  cancelled: "Cancelled",
};

export const pdcStatusTone: Record<PdcStatus, Tone> = {
  pending: "slate",
  deposited: "blue",
  cleared: "green",
  bounced: "rose",
  cancelled: "slate",
};

export const leadStageLabel: Record<LeadStage, string> = {
  new: "New",
  viewing: "Viewing",
  application: "Application",
  approved: "Approved",
  converted: "Converted",
  lost: "Lost",
};

export const leadStageTone: Record<LeadStage, Tone> = {
  new: "blue",
  viewing: "brand",
  application: "amber",
  approved: "green",
  converted: "slate",
  lost: "rose",
};
