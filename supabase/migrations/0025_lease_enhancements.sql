-- =============================================================
-- Lease module enhancements
--
--   • Security deposit return tracking: a lease's deposit moves from
--     'held' to 'returned' / 'partially_returned' / 'forfeited' with an
--     amount, date, and notes — instead of just sitting as a static
--     number with no resolution.
--   • Amendment history: every term edit, renewal, termination, and
--     deposit return is logged to lease_amendments so there's an audit
--     trail of who changed what and when. Renewals and terminations
--     already update the lease in place (lease_id is stable — PDC
--     cheques and EJARI registrations stay correctly linked), so this
--     table is purely additive history, not a data-integrity fix.
-- =============================================================

create type deposit_status as enum ('held', 'returned', 'partially_returned', 'forfeited');

alter table leases add column if not exists deposit_status deposit_status not null default 'held';
alter table leases add column if not exists deposit_returned_amount numeric(12,2);
alter table leases add column if not exists deposit_returned_date date;
alter table leases add column if not exists deposit_return_notes text;

create table if not exists lease_amendments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  lease_id    uuid not null references leases (id) on delete cascade,
  changed_by  uuid references profiles (id) on delete set null,
  change_type text not null,
  changes     jsonb not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists lease_amendments_lease_idx on lease_amendments (lease_id);
create index if not exists lease_amendments_org_idx on lease_amendments (org_id);

alter table lease_amendments enable row level security;

create policy lease_amendments_mgr_all on lease_amendments
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy lease_amendments_owner_read on lease_amendments
  for select using (lease_id in (select owner_lease_ids()));

create policy lease_amendments_tenant_read on lease_amendments
  for select using (lease_id in (select tenant_lease_ids()));
