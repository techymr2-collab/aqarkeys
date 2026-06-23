import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration test: signs in as each seeded role against the real project and
// asserts row level security isolation. Requires `node scripts/seed.mjs` to
// have been run. Env comes from .env via vitest.config loadEnv.
const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const PASSWORD = "Passw0rd!23";

function client(): SupabaseClient {
  return createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient> {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}

async function count(c: SupabaseClient, table: string): Promise<number> {
  const { count: n, error } = await c.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

const run = url && anon ? describe : describe.skip;

run("RLS isolation", () => {
  let manager: SupabaseClient;
  let owner: SupabaseClient;
  let tenant: SupabaseClient;

  beforeAll(async () => {
    [manager, owner, tenant] = await Promise.all([
      signIn("manager@frontbits.test"),
      signIn("owner@frontbits.test"),
      signIn("tenant@frontbits.test"),
    ]);
  });

  describe("manager", () => {
    it("sees the whole org portfolio", async () => {
      expect(await count(manager, "properties")).toBe(3);
      expect(await count(manager, "units")).toBe(30);
      expect(await count(manager, "tenants")).toBeGreaterThanOrEqual(20);
    });
  });

  describe("owner (Omar)", () => {
    it("sees only their own two properties, not other owners'", async () => {
      const { data, error } = await owner.from("properties").select("name");
      expect(error).toBeNull();
      const names = (data ?? []).map((p) => p.name);
      expect(names).toHaveLength(2);
      expect(names).not.toContain("Camden Lofts"); // owned by Grosvenor
    });

    it("sees a subset of invoices, not the whole portfolio", async () => {
      const ownerInvoices = await count(owner, "invoices");
      const allInvoices = await count(manager, "invoices");
      expect(ownerInvoices).toBeGreaterThan(0);
      expect(ownerInvoices).toBeLessThan(allInvoices);
    });

    it("cannot read the tenants table", async () => {
      expect(await count(owner, "tenants")).toBe(0);
    });

    it("cannot create a property (no write policy)", async () => {
      const { error } = await owner.from("properties").insert({
        org_id: "00000000-0000-0000-0000-000000000000",
        owner_id: "00000000-0000-0000-0000-000000000000",
        name: "Hijacked",
        currency: "AED",
      });
      expect(error).not.toBeNull();
    });
  });

  describe("tenant (Tara)", () => {
    it("sees only their own tenant record", async () => {
      expect(await count(tenant, "tenants")).toBe(1);
    });

    it("sees only their own unit and lease", async () => {
      expect(await count(tenant, "units")).toBe(1);
      expect(await count(tenant, "leases")).toBe(1);
    });

    it("sees only their own invoices, not the whole portfolio", async () => {
      const tenantInvoices = await count(tenant, "invoices");
      const allInvoices = await count(manager, "invoices");
      expect(tenantInvoices).toBeGreaterThan(0);
      expect(tenantInvoices).toBeLessThan(allInvoices);
    });

    it("cannot create a lease (no write policy)", async () => {
      const { error } = await tenant.from("leases").insert({
        org_id: "00000000-0000-0000-0000-000000000000",
        unit_id: "00000000-0000-0000-0000-000000000000",
        tenant_id: "00000000-0000-0000-0000-000000000000",
        start_date: "2026-01-01",
        end_date: "2027-01-01",
        rent_amount: 1,
        currency: "AED",
      });
      expect(error).not.toBeNull();
    });
  });
});
