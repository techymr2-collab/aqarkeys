-- =============================================================
-- Frontbits Property  |  Phase 1 schema
-- Multi-tenant (org scoped) property management core.
-- Money is numeric(12,2). Currency is per property and carried
-- onto leases and invoices for join free reporting.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role       as enum ('manager', 'owner', 'tenant');
create type unit_status     as enum ('occupied', 'vacant', 'under_maintenance', 'reserved');
create type lease_frequency as enum ('monthly', 'quarterly', 'semiannual', 'annual');
create type lease_status    as enum ('upcoming', 'active', 'expired', 'terminated');
create type invoice_status  as enum ('draft', 'sent', 'paid', 'overdue');
create type payment_method  as enum ('bank_transfer', 'card', 'cash', 'cheque');
create type currency_code   as enum ('AED', 'GBP', 'USD', 'CAD');

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- organizations ----------
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid not null references organizations (id) on delete cascade,
  role        user_role not null default 'tenant',
  full_name   text not null default '',
  email       text not null default '',
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_org_idx on profiles (org_id);

-- ---------- owners ----------
-- profile_id is nullable: a manager can create an owner record
-- long before (or without) inviting them to a login.
create table owners (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index owners_org_idx     on owners (org_id);
create index owners_profile_idx on owners (profile_id);

-- ---------- tenants ----------
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tenants_org_idx     on tenants (org_id);
create index tenants_profile_idx on tenants (profile_id);

-- ---------- properties ----------
create table properties (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  owner_id    uuid not null references owners (id) on delete restrict,
  name        text not null,
  address     text not null default '',
  city        text not null default '',
  country     text not null default '',
  currency    currency_code not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index properties_org_idx   on properties (org_id);
create index properties_owner_idx on properties (owner_id);

-- ---------- units ----------
create table units (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  label        text not null,
  beds         smallint not null default 0,
  baths        numeric(3,1) not null default 0,
  status       unit_status not null default 'vacant',
  market_rent  numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index units_org_idx      on units (org_id);
create index units_property_idx on units (property_id);

-- ---------- leases ----------
create table leases (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  unit_id         uuid not null references units (id) on delete restrict,
  tenant_id       uuid not null references tenants (id) on delete restrict,
  start_date      date not null,
  end_date        date not null,
  rent_amount     numeric(12,2) not null,
  frequency       lease_frequency not null default 'monthly',
  deposit_amount  numeric(12,2) not null default 0,
  currency        currency_code not null,
  status          lease_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint leases_date_order check (end_date >= start_date)
);
create index leases_org_idx    on leases (org_id);
create index leases_unit_idx   on leases (unit_id);
create index leases_tenant_idx on leases (tenant_id);

-- ---------- invoices ----------
-- payment_reported_* capture a tenant's "I paid" intent. A manager
-- confirms by setting status = 'paid' with paid_date + payment_method.
create table invoices (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references organizations (id) on delete cascade,
  lease_id              uuid not null references leases (id) on delete cascade,
  period_start          date not null,
  period_end            date not null,
  amount                numeric(12,2) not null,
  currency              currency_code not null,
  due_date              date not null,
  status                invoice_status not null default 'draft',
  paid_date             date,
  payment_method        payment_method,
  payment_reported_at   timestamptz,
  payment_reported_method payment_method,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint invoices_period_order check (period_end >= period_start)
);
create index invoices_org_idx     on invoices (org_id);
create index invoices_lease_idx   on invoices (lease_id);
create index invoices_status_idx  on invoices (status);

-- ---------- expenses ----------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  category     text not null,
  amount       numeric(12,2) not null,
  date         date not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_org_idx      on expenses (org_id);
create index expenses_property_idx on expenses (property_id);

-- ---------- updated_at triggers ----------
create trigger trg_org_updated      before update on organizations for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles      for each row execute function set_updated_at();
create trigger trg_owners_updated   before update on owners        for each row execute function set_updated_at();
create trigger trg_tenants_updated  before update on tenants       for each row execute function set_updated_at();
create trigger trg_props_updated    before update on properties    for each row execute function set_updated_at();
create trigger trg_units_updated    before update on units         for each row execute function set_updated_at();
create trigger trg_leases_updated   before update on leases        for each row execute function set_updated_at();
create trigger trg_invoices_updated before update on invoices      for each row execute function set_updated_at();
create trigger trg_expenses_updated before update on expenses      for each row execute function set_updated_at();
