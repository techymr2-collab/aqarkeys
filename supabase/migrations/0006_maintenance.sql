-- =============================================================
-- Phase 2: Maintenance and work orders
--
--   tenant raises a request for their own unit
--   manager assigns (free text), tracks status, and resolves
--   owner reads requests for their own properties
--
-- Resolving a request with a cost auto-creates a Maintenance
-- expense on the property, so the cost flows to owner statements.
-- =============================================================

create type maintenance_category as enum (
  'plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general'
);
create type maintenance_priority as enum ('low', 'medium', 'high', 'urgent');
create type maintenance_status as enum (
  'submitted', 'in_progress', 'on_hold', 'resolved', 'cancelled'
);

create table maintenance_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  unit_id      uuid not null references units (id) on delete cascade,
  reported_by  uuid references profiles (id) on delete set null,
  title        text not null,
  description  text not null default '',
  category     maintenance_category not null default 'general',
  priority     maintenance_priority not null default 'medium',
  status       maintenance_status not null default 'submitted',
  assignee     text,
  cost         numeric(12,2),
  expense_id   uuid references expenses (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index maintenance_org_idx    on maintenance_requests (org_id);
create index maintenance_unit_idx   on maintenance_requests (unit_id);
create index maintenance_status_idx on maintenance_requests (status);

create trigger trg_maintenance_updated
  before update on maintenance_requests
  for each row execute function set_updated_at();

-- ---------- resolve -> expense ----------
create or replace function maintenance_resolve_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
begin
  if new.status = 'resolved' then
    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
    -- Create the owner-facing expense once, when a cost is present.
    if new.cost is not null and new.cost > 0 and new.expense_id is null then
      select property_id into v_property_id from units where id = new.unit_id;
      insert into expenses (org_id, property_id, category, amount, date, note)
      values (
        new.org_id, v_property_id, 'Maintenance', new.cost, current_date,
        coalesce(new.title, 'Maintenance')
      )
      returning id into new.expense_id;
    end if;
  else
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_maintenance_resolve
  before insert or update on maintenance_requests
  for each row execute function maintenance_resolve_expense();

-- ---------- RLS ----------
alter table maintenance_requests enable row level security;

-- Manager: full access within the org.
create policy maintenance_mgr_all on maintenance_requests
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

-- Tenant: read own-unit requests, and raise new ones for their own unit.
create policy maintenance_tenant_read on maintenance_requests
  for select using (unit_id in (select tenant_unit_ids()));
create policy maintenance_tenant_insert on maintenance_requests
  for insert with check (
    org_id = auth_org_id()
    and unit_id in (select tenant_unit_ids())
    and reported_by = auth.uid()
  );

-- Owner: read requests for their own properties.
create policy maintenance_owner_read on maintenance_requests
  for select using (unit_id in (select owner_unit_ids()));
