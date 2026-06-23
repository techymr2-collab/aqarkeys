-- =============================================================
-- Vendors / contractors directory
--
--   A manager keeps a directory of the plumbers, electricians,
--   handymen, etc. they hire. Each vendor has a primary trade
--   (reusing the maintenance_category enum) so they line up with
--   the work orders they service.
--
--   Work orders gain an optional vendor_id link. The free-text
--   `assignee` column stays (for in-house staff / ad-hoc names);
--   when a vendor is picked we also copy its name into assignee so
--   every existing list/statement that reads assignee keeps working.
-- =============================================================

create table vendors (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  name         text not null,
  company      text,
  trade        maintenance_category not null default 'general',
  email        text,
  phone        text,
  notes        text,
  hourly_rate  numeric(12,2),
  rating       smallint check (rating between 1 and 5),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index vendors_org_idx   on vendors (org_id);
create index vendors_trade_idx on vendors (trade);

create trigger trg_vendors_updated
  before update on vendors
  for each row execute function set_updated_at();

-- ---------- link work orders to a vendor ----------
-- on delete set null: removing a vendor from the directory must not
-- destroy historical work orders.
alter table maintenance_requests
  add column if not exists vendor_id uuid references vendors (id) on delete set null;
create index if not exists maintenance_vendor_idx on maintenance_requests (vendor_id);

-- ---------- RLS ----------
-- Vendors are an internal manager tool: full access within the org,
-- no owner/tenant visibility (the contractor name still reaches owners
-- via the work order's assignee text).
alter table vendors enable row level security;

create policy vendors_mgr_all on vendors
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
