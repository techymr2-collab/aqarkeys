import type { ComponentType, SVGProps } from "react";
import type { UserRole } from "@/lib/database.types";
import {
  DashboardIcon,
  BuildingIcon,
  UsersIcon,
  UserIcon,
  DocumentIcon,
  ReceiptIcon,
  BanknoteIcon,
  WrenchIcon,
  GearIcon,
  ChartIcon,
  HomeIcon,
  FileTextIcon,
  KeyIcon,
  ChequeIcon,
  ClipboardCheckIcon,
  RefreshCwIcon,
  ToolboxIcon,
  FunnelIcon,
  UploadIcon,
} from "@/components/icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
  /** When set, a section heading is rendered above the first item of each new section. */
  section?: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  manager: [
    { to: "/manager", label: "Dashboard", icon: DashboardIcon, end: true },
    { to: "/manager/properties", label: "Properties", icon: BuildingIcon, section: "Portfolio" },
    { to: "/manager/vacancies", label: "Vacancies", icon: KeyIcon },
    { to: "/manager/leasing", label: "Leasing", icon: FunnelIcon },
    { to: "/manager/owners", label: "Owners", icon: UsersIcon },
    { to: "/manager/tenants", label: "Tenants", icon: UserIcon },
    { to: "/manager/leases", label: "Leases", icon: DocumentIcon, section: "Finance" },
    { to: "/manager/renewals", label: "Renewals", icon: RefreshCwIcon },
    { to: "/manager/ejari", label: "EJARI", icon: ClipboardCheckIcon },
    { to: "/manager/invoices", label: "Invoices", icon: ReceiptIcon },
    { to: "/manager/cheques", label: "Cheques", icon: ChequeIcon },
    { to: "/manager/payouts", label: "Payouts", icon: BanknoteIcon },
    { to: "/manager/rent-roll", label: "Rent Roll", icon: FileTextIcon },
    { to: "/manager/maintenance", label: "Maintenance", icon: WrenchIcon, section: "Operations" },
    { to: "/manager/vendors", label: "Vendors", icon: ToolboxIcon },
    { to: "/manager/analytics", label: "Analytics", icon: ChartIcon },
    { to: "/manager/import", label: "Import data", icon: UploadIcon },
    { to: "/manager/settings", label: "Settings", icon: GearIcon },
  ],
  owner: [
    { to: "/owner", label: "Overview", icon: DashboardIcon, end: true },
    { to: "/owner/properties", label: "Properties", icon: BuildingIcon },
    { to: "/owner/statements", label: "Statements", icon: ChartIcon },
    { to: "/owner/payouts", label: "Payouts", icon: BanknoteIcon },
    { to: "/owner/cheques", label: "Cheques", icon: ChequeIcon },
    { to: "/owner/ejari", label: "EJARI", icon: ClipboardCheckIcon },
    { to: "/owner/maintenance", label: "Maintenance", icon: WrenchIcon },
  ],
  tenant: [
    { to: "/tenant", label: "Home", icon: HomeIcon, end: true },
    { to: "/tenant/invoices", label: "Invoices", icon: ReceiptIcon },
    { to: "/tenant/cheques", label: "Cheques", icon: ChequeIcon },
    { to: "/tenant/maintenance", label: "Maintenance", icon: WrenchIcon },
  ],
};

export function navForRole(role: UserRole): NavItem[] {
  return navByRole[role];
}

export const roleLabel: Record<UserRole, string> = {
  manager: "Manager",
  owner: "Owner",
  tenant: "Tenant",
};
