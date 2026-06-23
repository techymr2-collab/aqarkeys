// Minimal bootstrap so we can verify auth + role routing + RLS.
// Creates one organization and one manager/owner/tenant user, plus
// the owner/tenant business records linked to their profiles.
// The full demo seed (properties, leases, invoices) comes later and
// will reuse this org. Idempotent: clears the test users + org first.
//
// Run: node --env-file=.env scripts/bootstrap-users.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_NAME = "Frontbits Demo";
const PASSWORD = "Passw0rd!23";
const users = [
  { email: "manager@frontbits.test", role: "manager", name: "Maya Manager" },
  { email: "owner@frontbits.test", role: "owner", name: "Omar Owner" },
  { email: "tenant@frontbits.test", role: "tenant", name: "Tara Tenant" },
];

async function deleteExistingUsers() {
  // listUsers is paginated; one page is plenty for our test accounts.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const emails = new Set(users.map((u) => u.email));
  for (const u of data.users) {
    if (u.email && emails.has(u.email)) {
      await admin.auth.admin.deleteUser(u.id);
      console.log("deleted existing user", u.email);
    }
  }
}

async function main() {
  await deleteExistingUsers();

  // Clear any prior demo org (cascades profiles/owners/tenants).
  await admin.from("organizations").delete().eq("name", ORG_NAME);

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: ORG_NAME })
    .select()
    .single();
  if (orgErr) throw orgErr;
  console.log("created org", org.id);

  const created = {};
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { org_id: org.id, role: u.role, full_name: u.name },
    });
    if (error) throw error;
    created[u.role] = data.user;
    console.log("created user", u.email, "->", u.role);
  }

  // Link owner + tenant business records to their profiles.
  const { error: ownerErr } = await admin.from("owners").insert({
    org_id: org.id,
    profile_id: created.owner.id,
    name: "Omar Owner",
    email: "owner@frontbits.test",
  });
  if (ownerErr) throw ownerErr;

  const { error: tenantErr } = await admin.from("tenants").insert({
    org_id: org.id,
    profile_id: created.tenant.id,
    name: "Tara Tenant",
    email: "tenant@frontbits.test",
  });
  if (tenantErr) throw tenantErr;

  console.log("\nBootstrap complete. Sign in with any of:");
  for (const u of users) console.log(`  ${u.email} / ${PASSWORD}  (${u.role})`);
}

main().catch((e) => {
  console.error("Bootstrap failed:", e.message ?? e);
  process.exit(1);
});
