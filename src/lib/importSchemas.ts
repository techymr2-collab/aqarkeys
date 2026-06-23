// Pure parsing/validation/relationship-resolution logic for the CSV import
// wizard. No React or Supabase here — keeps it easy to reason about and test.
// Relationships are resolved by exact name match (case/space-insensitive)
// against rows already in the database or already imported earlier in the
// same wizard session, so an agency never needs to know our internal ids.

export interface ImportContext {
  ownersByName: Map<string, string>; // normalised name -> id
  propertiesByName: Map<string, string>;
  unitsByKey: Map<string, string>; // `${property}|${label}` -> id
  tenantsByName: Map<string, string>;
}

export function emptyContext(): ImportContext {
  return {
    ownersByName: new Map(),
    propertiesByName: new Map(),
    unitsByKey: new Map(),
    tenantsByName: new Map(),
  };
}

export function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function unitKey(propertyName: string, label: string): string {
  return `${norm(propertyName)}|${norm(label)}`;
}

export interface ParsedRow<T> {
  rowNumber: number; // 1-based within the file, header excluded
  raw: Record<string, string>;
  data: T | null;
  errors: string[];
}

export interface EntityImportConfig<T> {
  key: string;
  label: string;
  description: string;
  templateHeaders: string[];
  templateExampleRows: string[][];
  /** Parse + validate one raw row. Resolve relationships via ctx; do not mutate ctx here. */
  parseRow(raw: Record<string, string>, ctx: ImportContext, seenInFile: Set<string>): { data: T | null; errors: string[] };
  /** Called once per valid row after a successful bulk insert, with the new id, to seed later lookups. */
  registerInContext(data: T, id: string, ctx: ImportContext): void;
}

// ── shared helpers ────────────────────────────────────────────────────────────

function req(raw: Record<string, string>, col: string): string {
  return (raw[col] ?? "").trim();
}

function num(v: string, fallback: number): number {
  if (v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Owners ────────────────────────────────────────────────────────────────────

export interface OwnerImportRow {
  name: string;
  email: string | null;
  phone: string | null;
}

export const ownersConfig: EntityImportConfig<OwnerImportRow> = {
  key: "owners",
  label: "Owners",
  description: "Property owners / landlords. No dependencies — import this first.",
  templateHeaders: ["Name", "Email", "Phone"],
  templateExampleRows: [["Acme Holdings", "owner@example.com", "+971 50 000 0000"]],
  parseRow(raw, _ctx, seenInFile) {
    const errors: string[] = [];
    const name = req(raw, "Name");
    if (!name) errors.push("Name is required.");
    const key = norm(name);
    if (name && seenInFile.has(key)) {
      errors.push(`Duplicate "Name" in this file (${name}) — names must be unique within the file so later rows can link to it.`);
    }
    seenInFile.add(key);
    if (errors.length) return { data: null, errors };
    return {
      data: { name, email: req(raw, "Email") || null, phone: req(raw, "Phone") || null },
      errors: [],
    };
  },
  registerInContext(data, id, ctx) {
    ctx.ownersByName.set(norm(data.name), id);
  },
};

// ── Properties ────────────────────────────────────────────────────────────────

export interface PropertyImportRow {
  name: string;
  owner_id: string;
  address: string;
  city: string;
  country: string;
  currency: "AED";
  management_fee_percent: number;
  vat_rate: number;
}

export const propertiesConfig: EntityImportConfig<PropertyImportRow> = {
  key: "properties",
  label: "Properties",
  description: "Buildings, each linked to an owner by name. Import Owners first.",
  templateHeaders: ["Name", "Owner Name", "Address", "City", "Management Fee %", "VAT Rate (0 or 5)"],
  templateExampleRows: [["Example Tower", "Acme Holdings", "Sheikh Zayed Road", "Dubai", "5", "0"]],
  parseRow(raw, ctx, seenInFile) {
    const errors: string[] = [];
    const name = req(raw, "Name");
    if (!name) errors.push("Name is required.");
    const key = norm(name);
    if (name && seenInFile.has(key)) {
      errors.push(`Duplicate "Name" in this file (${name}) — names must be unique within the file so units can link to it.`);
    }
    seenInFile.add(key);

    const ownerName = req(raw, "Owner Name");
    let ownerId: string | undefined;
    if (!ownerName) {
      errors.push("Owner Name is required.");
    } else {
      ownerId = ctx.ownersByName.get(norm(ownerName));
      if (!ownerId) errors.push(`Owner "${ownerName}" not found — check spelling or import Owners first.`);
    }

    const fee = num(req(raw, "Management Fee %"), 5);
    if (Number.isNaN(fee) || fee < 0 || fee > 100) errors.push("Management Fee % must be a number between 0 and 100.");
    const vat = num(req(raw, "VAT Rate (0 or 5)"), 0);
    if (vat !== 0 && vat !== 5) errors.push("VAT Rate must be 0 (exempt) or 5 (standard-rated).");

    if (errors.length || !ownerId) return { data: null, errors };
    return {
      data: {
        name,
        owner_id: ownerId,
        address: req(raw, "Address"),
        city: req(raw, "City"),
        country: "United Arab Emirates",
        currency: "AED",
        management_fee_percent: fee,
        vat_rate: vat,
      },
      errors: [],
    };
  },
  registerInContext(data, id, ctx) {
    ctx.propertiesByName.set(norm(data.name), id);
  },
};

// ── Units ─────────────────────────────────────────────────────────────────────

export interface UnitImportRow {
  property_id: string;
  property_name: string; // kept for context registration (unit key needs it)
  label: string;
  beds: number;
  baths: number;
  market_rent: number;
  status: "vacant" | "occupied" | "under_maintenance" | "reserved";
}

const UNIT_STATUSES = new Set(["vacant", "occupied", "under_maintenance", "reserved"]);

export const unitsConfig: EntityImportConfig<UnitImportRow> = {
  key: "units",
  label: "Units",
  description: "Rentable units, each linked to a property by name. Import Properties first.",
  templateHeaders: ["Property Name", "Unit Label", "Beds", "Baths", "Market Rent", "Status"],
  templateExampleRows: [["Example Tower", "Apt 101", "1", "1", "65000", "vacant"]],
  parseRow(raw, ctx, seenInFile) {
    const errors: string[] = [];
    const propertyName = req(raw, "Property Name");
    const label = req(raw, "Unit Label");
    if (!propertyName) errors.push("Property Name is required.");
    if (!label) errors.push("Unit Label is required.");

    let propertyId: string | undefined;
    if (propertyName) {
      propertyId = ctx.propertiesByName.get(norm(propertyName));
      if (!propertyId) errors.push(`Property "${propertyName}" not found — check spelling or import Properties first.`);
    }

    if (propertyName && label) {
      const key = unitKey(propertyName, label);
      if (seenInFile.has(key)) {
        errors.push(`Duplicate Property+Unit Label in this file (${propertyName} / ${label}).`);
      }
      seenInFile.add(key);
    }

    const beds = num(req(raw, "Beds"), 0);
    const baths = num(req(raw, "Baths"), 0);
    const rent = num(req(raw, "Market Rent"), 0);
    if (Number.isNaN(beds) || beds < 0) errors.push("Beds must be a non-negative number.");
    if (Number.isNaN(baths) || baths < 0) errors.push("Baths must be a non-negative number.");
    if (Number.isNaN(rent) || rent < 0) errors.push("Market Rent must be a non-negative number.");

    const statusRaw = req(raw, "Status").toLowerCase() || "vacant";
    if (!UNIT_STATUSES.has(statusRaw)) {
      errors.push("Status must be one of: vacant, occupied, under_maintenance, reserved.");
    }

    if (errors.length || !propertyId) return { data: null, errors };
    return {
      data: {
        property_id: propertyId,
        property_name: propertyName,
        label,
        beds,
        baths,
        market_rent: rent,
        status: statusRaw as UnitImportRow["status"],
      },
      errors: [],
    };
  },
  registerInContext(data, id, ctx) {
    ctx.unitsByKey.set(unitKey(data.property_name, data.label), id);
  },
};

// ── Tenants ───────────────────────────────────────────────────────────────────

export interface TenantImportRow {
  name: string;
  email: string | null;
  phone: string | null;
}

export const tenantsConfig: EntityImportConfig<TenantImportRow> = {
  key: "tenants",
  label: "Tenants",
  description: "Renters. No dependencies — can be imported any time before Leases.",
  templateHeaders: ["Name", "Email", "Phone"],
  templateExampleRows: [["Jane Renter", "jane@example.com", "+971 55 000 0000"]],
  parseRow(raw, _ctx, seenInFile) {
    const errors: string[] = [];
    const name = req(raw, "Name");
    if (!name) errors.push("Name is required.");
    const key = norm(name);
    if (name && seenInFile.has(key)) {
      errors.push(`Duplicate "Name" in this file (${name}) — names must be unique within the file so leases can link to it.`);
    }
    seenInFile.add(key);
    if (errors.length) return { data: null, errors };
    return {
      data: { name, email: req(raw, "Email") || null, phone: req(raw, "Phone") || null },
      errors: [],
    };
  },
  registerInContext(data, id, ctx) {
    ctx.tenantsByName.set(norm(data.name), id);
  },
};

// ── Leases ────────────────────────────────────────────────────────────────────

export interface LeaseImportRow {
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  frequency: "monthly" | "quarterly" | "semiannual" | "annual";
  deposit_amount: number;
  currency: "AED";
  status: "upcoming" | "active" | "expired" | "terminated";
}

const LEASE_FREQUENCIES = new Set(["monthly", "quarterly", "semiannual", "annual"]);
const LEASE_STATUSES = new Set(["upcoming", "active", "expired", "terminated"]);

export const leasesConfig: EntityImportConfig<LeaseImportRow> = {
  key: "leases",
  label: "Leases",
  description: "Tenancy contracts linking a tenant to a unit. Import Units and Tenants first.",
  templateHeaders: [
    "Property Name",
    "Unit Label",
    "Tenant Name",
    "Start Date (YYYY-MM-DD)",
    "End Date (YYYY-MM-DD)",
    "Rent Amount",
    "Frequency",
    "Deposit Amount",
    "Status",
  ],
  templateExampleRows: [
    ["Example Tower", "Apt 101", "Jane Renter", "2026-01-01", "2026-12-31", "65000", "annual", "6500", "active"],
  ],
  parseRow(raw, ctx) {
    const errors: string[] = [];
    const propertyName = req(raw, "Property Name");
    const unitLabel = req(raw, "Unit Label");
    const tenantName = req(raw, "Tenant Name");
    if (!propertyName) errors.push("Property Name is required.");
    if (!unitLabel) errors.push("Unit Label is required.");
    if (!tenantName) errors.push("Tenant Name is required.");

    let unitId: string | undefined;
    if (propertyName && unitLabel) {
      unitId = ctx.unitsByKey.get(unitKey(propertyName, unitLabel));
      if (!unitId) errors.push(`Unit "${unitLabel}" at "${propertyName}" not found — check spelling or import Units first.`);
    }
    let tenantId: string | undefined;
    if (tenantName) {
      tenantId = ctx.tenantsByName.get(norm(tenantName));
      if (!tenantId) errors.push(`Tenant "${tenantName}" not found — check spelling or import Tenants first.`);
    }

    const startDate = req(raw, "Start Date (YYYY-MM-DD)");
    const endDate = req(raw, "End Date (YYYY-MM-DD)");
    if (!DATE_RE.test(startDate)) errors.push("Start Date must be in YYYY-MM-DD format.");
    if (!DATE_RE.test(endDate)) errors.push("End Date must be in YYYY-MM-DD format.");
    if (DATE_RE.test(startDate) && DATE_RE.test(endDate) && endDate < startDate) {
      errors.push("End Date cannot be before Start Date.");
    }

    const rent = num(req(raw, "Rent Amount"), NaN);
    if (Number.isNaN(rent) || rent <= 0) errors.push("Rent Amount must be a positive number.");
    const deposit = num(req(raw, "Deposit Amount"), 0);
    if (Number.isNaN(deposit) || deposit < 0) errors.push("Deposit Amount must be a non-negative number.");

    const freq = req(raw, "Frequency").toLowerCase();
    if (!LEASE_FREQUENCIES.has(freq)) {
      errors.push("Frequency must be one of: monthly, quarterly, semiannual, annual.");
    }
    const status = req(raw, "Status").toLowerCase() || "active";
    if (!LEASE_STATUSES.has(status)) {
      errors.push("Status must be one of: upcoming, active, expired, terminated.");
    }

    if (errors.length || !unitId || !tenantId) return { data: null, errors };
    return {
      data: {
        unit_id: unitId,
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
        rent_amount: rent,
        frequency: freq as LeaseImportRow["frequency"],
        deposit_amount: deposit,
        currency: "AED",
        status: status as LeaseImportRow["status"],
      },
      errors: [],
    };
  },
  registerInContext() {
    /* nothing downstream depends on leases by name */
  },
};

export type ImportEntityKey = "owners" | "properties" | "units" | "tenants" | "leases";

/**
 * Type-erased to `unknown` so the 5 distinctly-typed configs can live in one
 * array for the generic wizard UI. Each config still works in its own real
 * row type internally (above); the cast is sound because the wizard always
 * pairs a config with rows produced by that same config's own parseRow.
 */
export const IMPORT_CONFIGS: EntityImportConfig<unknown>[] = [
  ownersConfig,
  propertiesConfig,
  unitsConfig,
  tenantsConfig,
  leasesConfig,
] as EntityImportConfig<unknown>[];
