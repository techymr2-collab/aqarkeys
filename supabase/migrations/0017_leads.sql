-- =============================================================
-- Leasing funnel (prospective tenants)
--
--   The pipeline that precedes a lease: an enquiry on a vacant unit
--   moves new -> viewing -> application -> approved, then either
--   converts into a tenant + lease (won) or is marked lost.
--
--   A lead optionally points at the unit it is interested in, and —
--   once converted — at the tenant and lease it produced, so the
--   funnel ties back into the rest of the system.
-- =============================================================

create type lead_stage as enum (
  'new', 'viewing', 'application', 'approved', 'converted', 'lost'
);

create table leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  unit_id         uuid references units(id) on delete set null,
  name            text not null,
  email           text,
  phone           text,
  stage           lead_stage not null default 'new',
  source          text,
  budget          numeric(12,2),
  desired_move_in date,
  notes           text,
  tenant_id       uuid references tenants(id) on delete set null,
  lease_id        uuid references leases(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index leads_org_idx   on leads(org_id);
create index leads_unit_idx  on leads(unit_id);
create index leads_stage_idx on leads(stage);

create trigger trg_leads_updated
  before update on leads
  for each row execute function set_updated_at();

-- Leads are an internal manager tool: full access within the org only.
alter table leads enable row level security;

create policy leads_mgr_all on leads
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
