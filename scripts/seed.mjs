// Full demo seed. Idempotent: wipes the demo org + test users, then builds
// a realistic portfolio so every dashboard looks alive.
//
//   3 properties across AED / GBP / CAD
//   ~30 units with mixed status
//   active + upcoming leases (a couple expiring within 60 days)
//   rent invoices across recent months with realistic paid/sent/overdue mix
//   expenses per property
//
// Logins (password Passw0rd!23):
//   manager@frontbits.test  full access
//   owner@frontbits.test    owns 2 properties (AED + CAD)
//   tenant@frontbits.test   leases a Marina Heights unit
//
// Run: node --env-file=.env scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_NAME = "Frontbits Demo";
const PASSWORD = "Passw0rd!23";

// --- deterministic RNG so seeds are reproducible ---
let _s = 1337;
const rnd = () => {
  _s = (_s * 1664525 + 1013904223) % 4294967296;
  return _s / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addMonths = (date, m) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1));

async function insert(table, rows) {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function deleteTestUsers(emails) {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 500 });
  if (error) throw error;
  for (const u of data.users) {
    if (u.email && emails.has(u.email)) await db.auth.admin.deleteUser(u.id);
  }
}

async function createUser(orgId, email, role, fullName) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { org_id: orgId, role, full_name: fullName },
  });
  if (error) throw error;
  return data.user;
}

const FIRST = ["Aisha", "Liam", "Noor", "Ethan", "Priya", "Omar", "Sofia", "Daniel", "Layla", "Hassan", "Emma", "Yusuf", "Mariam", "Lucas", "Fatima", "Adam", "Zara", "Ben", "Hana", "Ali", "Grace", "Khalid", "Maya", "Ivan", "Lena"];
const LAST = ["Khan", "Smith", "Hassan", "Brown", "Sharma", "Ali", "Rossi", "Clarke", "Said", "Patel", "Jones", "Ahmed", "Wright", "Costa", "Murphy", "Lee", "Haddad", "Walker", "Park", "Nasser"];

function tenantName(i) {
  return `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
}

async function main() {
  console.log("Resetting demo data...");
  await deleteTestUsers(
    new Set(["manager@frontbits.test", "owner@frontbits.test", "tenant@frontbits.test"]),
  );
  await db.from("organizations").delete().eq("name", ORG_NAME);

  const [org] = await insert("organizations", [{ name: ORG_NAME }]);
  console.log("Org:", org.id);

  // --- users ---
  await createUser(org.id, "manager@frontbits.test", "manager", "Maya Manager");
  const ownerUser = await createUser(org.id, "owner@frontbits.test", "owner", "Omar Owner");
  const tenantUser = await createUser(org.id, "tenant@frontbits.test", "tenant", "Tara Tenant");
  console.log("Users created");

  // --- owners ---
  const [omar, grosvenor] = await insert("owners", [
    { org_id: org.id, profile_id: ownerUser.id, name: "Omar Owner", email: "owner@frontbits.test" },
    { org_id: org.id, name: "Grosvenor Estates", email: "ops@grosvenor.example" },
  ]);

  // --- properties (per-property currency) ---
  const [marina, camden, riverside] = await insert("properties", [
    { org_id: org.id, owner_id: omar.id, name: "Marina Heights", address: "Dubai Marina, Plot 12", city: "Dubai", country: "United Arab Emirates", currency: "AED", management_fee_percent: 5 },
    { org_id: org.id, owner_id: grosvenor.id, name: "Camden Lofts", address: "14 Jamestown Rd", city: "London", country: "United Kingdom", currency: "GBP", management_fee_percent: 8 },
    { org_id: org.id, owner_id: omar.id, name: "Riverside Apartments", address: "88 Queens Quay W", city: "Toronto", country: "Canada", currency: "CAD", management_fee_percent: 6 },
  ]);

  // --- units: define counts, rent ranges, and an occupancy plan per property ---
  const plan = [
    { property: marina, currency: "AED", count: 12, rentLo: 6000, rentHi: 15000, occupied: 9, reserved: 1, maint: 1 },
    { property: camden, currency: "GBP", count: 10, rentLo: 1600, rentHi: 3400, occupied: 7, reserved: 1, maint: 0 },
    { property: riverside, currency: "CAD", count: 8, rentLo: 2000, rentHi: 3600, occupied: 5, reserved: 0, maint: 1 },
  ];

  const allUnits = [];
  for (const p of plan) {
    const rows = [];
    for (let i = 0; i < p.count; i++) {
      const beds = pick([1, 1, 2, 2, 3]);
      const rent = Math.round((p.rentLo + rnd() * (p.rentHi - p.rentLo)) / 100) * 100;
      let status = "vacant";
      if (i < p.occupied) status = "occupied";
      else if (i < p.occupied + p.reserved) status = "reserved";
      else if (i < p.occupied + p.reserved + p.maint) status = "under_maintenance";
      rows.push({
        org_id: org.id,
        property_id: p.property.id,
        label: `${beds <= 1 ? "Studio" : "Apt"} ${100 + i + 1}`,
        beds,
        baths: beds === 1 ? 1 : pick([1, 2, 2]),
        status,
        market_rent: rent,
      });
    }
    const inserted = await insert("units", rows);
    inserted.forEach((u, idx) => allUnits.push({ ...u, plan: p, idx, status: rows[idx].status }));
  }
  console.log("Units:", allUnits.length);

  // --- tenants: enough records for every leased unit; Tara linked ---
  const occupiedUnits = allUnits.filter((u) => u.status === "occupied");
  const reservedUnits = allUnits.filter((u) => u.status === "reserved");
  const leasedCount = occupiedUnits.length + reservedUnits.length;

  const tenantRows = [
    { org_id: org.id, profile_id: tenantUser.id, name: "Tara Tenant", email: "tenant@frontbits.test" },
  ];
  for (let i = 1; i < leasedCount; i++) {
    const name = tenantName(i);
    tenantRows.push({
      org_id: org.id,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@email.example`,
    });
  }
  const tenants = await insert("tenants", tenantRows);
  console.log("Tenants:", tenants.length);

  // --- leases ---
  // Tara takes the first occupied Marina unit. A couple of active leases are
  // set to expire within 60 days to drive the dashboard warning.
  const freqByCurrency = { AED: "monthly", GBP: "monthly", CAD: "monthly" };
  const leaseRows = [];
  let ti = 0;
  occupiedUnits.forEach((u, i) => {
    const tenant = tenants[ti++];
    const startMonthsAgo = pick([3, 4, 5, 6, 8, 10]);
    const start = addMonths(today, -startMonthsAgo);
    // most end ~1 year after start; two expire soon
    let end = addMonths(start, 12);
    if (i === 0) end = addDays(today, 28); // Tara expiring soon
    if (i === 5) end = addDays(today, 51);
    leaseRows.push({
      org_id: org.id,
      unit_id: u.id,
      tenant_id: tenant.id,
      start_date: iso(start),
      end_date: iso(end),
      rent_amount: u.market_rent,
      frequency: freqByCurrency[u.plan.currency],
      deposit_amount: u.market_rent,
      currency: u.plan.currency,
      status: "active",
    });
  });
  reservedUnits.forEach((u) => {
    const tenant = tenants[ti++];
    const start = addDays(today, 14);
    leaseRows.push({
      org_id: org.id,
      unit_id: u.id,
      tenant_id: tenant.id,
      start_date: iso(start),
      end_date: iso(addMonths(start, 12)),
      rent_amount: u.market_rent,
      frequency: "monthly",
      deposit_amount: u.market_rent,
      currency: u.plan.currency,
      status: "upcoming",
    });
  });
  const leases = await insert("leases", leaseRows);
  console.log("Leases:", leases.length);

  // --- invoices: monthly, from lease start (capped 6 months) to current month ---
  const invoiceRows = [];
  const methods = ["bank_transfer", "card", "cheque", "cash"];
  for (const lease of leases) {
    if (lease.status !== "active") continue;
    let periodStart = new Date(lease.start_date);
    const earliest = addMonths(today, -6);
    if (periodStart < earliest) periodStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const psISO = iso(periodStart);
      if (psISO > iso(today)) break;
      const periodEnd = addMonths(periodStart, 1);
      const isCurrent = psISO >= monthStart;
      let status, paidDate = null, method = null;
      if (!isCurrent) {
        // past periods: mostly paid, occasionally overdue
        if (rnd() < 0.12) {
          status = "overdue";
        } else {
          status = "paid";
          paidDate = iso(addDays(periodStart, Math.floor(rnd() * 6)));
          method = pick(methods);
        }
      } else {
        // current month: split sent / paid / overdue-ish
        const r = rnd();
        if (r < 0.45) {
          status = "paid";
          paidDate = iso(addDays(periodStart, Math.floor(rnd() * 8)));
          method = pick(methods);
        } else {
          status = "sent";
        }
      }
      invoiceRows.push({
        org_id: org.id,
        lease_id: lease.id,
        period_start: psISO,
        period_end: iso(periodEnd),
        amount: lease.rent_amount,
        currency: lease.currency,
        due_date: psISO,
        status,
        paid_date: paidDate,
        payment_method: method,
      });
      periodStart = periodEnd;
    }
  }
  // insert in chunks
  for (let i = 0; i < invoiceRows.length; i += 200) {
    await insert("invoices", invoiceRows.slice(i, i + 200));
  }
  console.log("Invoices:", invoiceRows.length);

  // --- expenses per property ---
  const categories = ["Maintenance", "Service charge", "Cleaning", "Insurance", "Management fee"];
  const expenseRows = [];
  for (const p of [marina, camden, riverside]) {
    const cur = p.currency;
    const base = cur === "GBP" ? 400 : cur === "CAD" ? 600 : 1500;
    for (let m = 0; m < 5; m++) {
      expenseRows.push({
        org_id: org.id,
        property_id: p.id,
        category: pick(categories),
        amount: Math.round((base + rnd() * base) / 50) * 50,
        date: iso(addMonths(today, -m)),
        note: null,
      });
    }
  }
  await insert("expenses", expenseRows);
  console.log("Expenses:", expenseRows.length);

  // --- maintenance work orders ---
  // The DB trigger auto-creates a Maintenance expense for resolved ones with a cost.
  const issues = [
    { title: "Leaking kitchen tap", category: "plumbing" },
    { title: "AC not cooling", category: "hvac" },
    { title: "Bedroom socket sparking", category: "electrical" },
    { title: "Dishwasher not draining", category: "appliance" },
    { title: "Cracked bathroom tile", category: "structural" },
    { title: "Front door lock sticking", category: "general" },
    { title: "Boiler making noise", category: "hvac" },
    { title: "Blocked shower drain", category: "plumbing" },
    { title: "Flickering hallway light", category: "electrical" },
    { title: "Oven door will not close", category: "appliance" },
  ];
  const priorities = ["low", "medium", "high", "urgent"];
  const statuses = ["submitted", "in_progress", "on_hold", "resolved", "cancelled"];
  const assignees = ["Rapid Plumbing", "CoolAir Services", "Volt Electric", "In-house team"];
  const maintRows = [];
  for (let i = 0; i < issues.length; i++) {
    const unit = occupiedUnits[i % occupiedUnits.length];
    const status = statuses[i % statuses.length];
    const resolved = status === "resolved";
    const working = status === "in_progress" || status === "on_hold" || resolved;
    const base = unit.plan.currency === "GBP" ? 150 : unit.plan.currency === "CAD" ? 220 : 600;
    maintRows.push({
      org_id: org.id,
      unit_id: unit.id,
      reported_by: unit.id === occupiedUnits[0].id ? tenantUser.id : null,
      title: issues[i].title,
      description: "Reported by the tenant. Please take a look when possible.",
      category: issues[i].category,
      priority: pick(priorities),
      status,
      assignee: working ? pick(assignees) : null,
      cost: resolved ? Math.round((base + rnd() * base) / 10) * 10 : null,
    });
  }
  const maint = await insert("maintenance_requests", maintRows);
  console.log("Maintenance:", maint.length);

  console.log("\nSeed complete. Sign in with manager@/owner@/tenant@frontbits.test / " + PASSWORD);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
