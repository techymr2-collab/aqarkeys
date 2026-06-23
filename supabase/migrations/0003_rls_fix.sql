-- =============================================================
-- Fix: RLS recursion (42P17).
--
-- The owner/tenant read policies on properties, units, leases,
-- invoices, and expenses used inline subqueries against each
-- other's RLS protected tables, forming a cycle
-- (properties -> leases -> units -> properties).
--
-- Solution: compute the visible id sets in SECURITY DEFINER
-- functions. A definer function runs as the table owner, for whom
-- RLS is not enforced, so the inner joins do not re-trigger policies.
-- =============================================================

-- ---------- owner visible id sets ----------
create or replace function owner_property_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id
  from properties p
  join owners o on o.id = p.owner_id
  where o.profile_id = auth.uid();
$$;

create or replace function owner_unit_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select u.id
  from units u
  join properties p on p.id = u.property_id
  join owners o on o.id = p.owner_id
  where o.profile_id = auth.uid();
$$;

create or replace function owner_lease_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select l.id
  from leases l
  join units u on u.id = l.unit_id
  join properties p on p.id = u.property_id
  join owners o on o.id = p.owner_id
  where o.profile_id = auth.uid();
$$;

-- ---------- tenant visible id sets ----------
create or replace function tenant_unit_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select l.unit_id
  from leases l
  join tenants t on t.id = l.tenant_id
  where t.profile_id = auth.uid();
$$;

create or replace function tenant_property_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct u.property_id
  from leases l
  join units u on u.id = l.unit_id
  join tenants t on t.id = l.tenant_id
  where t.profile_id = auth.uid();
$$;

create or replace function tenant_lease_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select l.id
  from leases l
  join tenants t on t.id = l.tenant_id
  where t.profile_id = auth.uid();
$$;

-- ---------- replace recursive policies ----------
drop policy if exists properties_owner_read  on properties;
drop policy if exists properties_tenant_read on properties;
create policy properties_owner_read on properties
  for select using (id in (select owner_property_ids()));
create policy properties_tenant_read on properties
  for select using (id in (select tenant_property_ids()));

drop policy if exists units_owner_read  on units;
drop policy if exists units_tenant_read on units;
create policy units_owner_read on units
  for select using (id in (select owner_unit_ids()));
create policy units_tenant_read on units
  for select using (id in (select tenant_unit_ids()));

drop policy if exists leases_owner_read  on leases;
drop policy if exists leases_tenant_read on leases;
create policy leases_owner_read on leases
  for select using (id in (select owner_lease_ids()));
create policy leases_tenant_read on leases
  for select using (id in (select tenant_lease_ids()));

drop policy if exists invoices_owner_read  on invoices;
drop policy if exists invoices_tenant_read on invoices;
create policy invoices_owner_read on invoices
  for select using (lease_id in (select owner_lease_ids()));
create policy invoices_tenant_read on invoices
  for select using (lease_id in (select tenant_lease_ids()));

drop policy if exists expenses_owner_read on expenses;
create policy expenses_owner_read on expenses
  for select using (property_id in (select owner_property_ids()));
