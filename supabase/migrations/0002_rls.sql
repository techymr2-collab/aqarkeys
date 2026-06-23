-- =============================================================
-- Frontbits Property  |  Phase 1 row level security
--
-- Model:
--   manager  full read/write on everything in their org
--   owner    read only on their own properties and all rows beneath
--   tenant   read only on their own tenant record, lease, unit,
--            property, and invoices; may report a payment intent
--            via report_payment() (cannot mark an invoice paid)
--
-- Helper functions are SECURITY DEFINER so reading profiles/owners/
-- tenants for a policy check does not recurse through RLS.
-- =============================================================

-- ---------- identity helpers ----------
create or replace function auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'manager' from profiles where id = auth.uid()), false);
$$;

create or replace function current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from owners where profile_id = auth.uid();
$$;

create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from tenants where profile_id = auth.uid();
$$;

-- ---------- enable RLS ----------
alter table organizations enable row level security;
alter table profiles      enable row level security;
alter table owners        enable row level security;
alter table tenants       enable row level security;
alter table properties    enable row level security;
alter table units         enable row level security;
alter table leases        enable row level security;
alter table invoices      enable row level security;
alter table expenses      enable row level security;

-- =============================================================
-- organizations: everyone in the org may read it; managers update.
-- =============================================================
create policy org_select on organizations
  for select using (id = auth_org_id());
create policy org_update on organizations
  for update using (is_manager() and id = auth_org_id())
  with check (id = auth_org_id());

-- =============================================================
-- profiles: a user always sees/edits self. Managers see and manage
-- profiles within their org.
-- =============================================================
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or (is_manager() and org_id = auth_org_id()));
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or (is_manager() and org_id = auth_org_id()))
  with check (org_id = auth_org_id());
create policy profiles_insert_mgr on profiles
  for insert with check (is_manager() and org_id = auth_org_id());

-- =============================================================
-- owners
-- =============================================================
create policy owners_mgr_all on owners
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy owners_self_read on owners
  for select using (profile_id = auth.uid());

-- =============================================================
-- tenants
-- =============================================================
create policy tenants_mgr_all on tenants
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy tenants_self_read on tenants
  for select using (profile_id = auth.uid());

-- =============================================================
-- properties
-- =============================================================
create policy properties_mgr_all on properties
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy properties_owner_read on properties
  for select using (owner_id = current_owner_id());
-- tenant can see the property their lease sits in
create policy properties_tenant_read on properties
  for select using (
    id in (
      select u.property_id
      from leases l
      join units u on u.id = l.unit_id
      where l.tenant_id = current_tenant_id()
    )
  );

-- =============================================================
-- units
-- =============================================================
create policy units_mgr_all on units
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy units_owner_read on units
  for select using (
    property_id in (select id from properties where owner_id = current_owner_id())
  );
create policy units_tenant_read on units
  for select using (
    id in (select unit_id from leases where tenant_id = current_tenant_id())
  );

-- =============================================================
-- leases
-- =============================================================
create policy leases_mgr_all on leases
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy leases_owner_read on leases
  for select using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.owner_id = current_owner_id()
    )
  );
create policy leases_tenant_read on leases
  for select using (tenant_id = current_tenant_id());

-- =============================================================
-- invoices
-- =============================================================
create policy invoices_mgr_all on invoices
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy invoices_owner_read on invoices
  for select using (
    lease_id in (
      select l.id from leases l
      join units u on u.id = l.unit_id
      join properties p on p.id = u.property_id
      where p.owner_id = current_owner_id()
    )
  );
create policy invoices_tenant_read on invoices
  for select using (
    lease_id in (select id from leases where tenant_id = current_tenant_id())
  );

-- =============================================================
-- expenses
-- =============================================================
create policy expenses_mgr_all on expenses
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
create policy expenses_owner_read on expenses
  for select using (
    property_id in (select id from properties where owner_id = current_owner_id())
  );

-- =============================================================
-- Tenant payment intent: record "I paid" without flipping to paid.
-- SECURITY DEFINER so we can write one controlled column set while
-- the tenant has no UPDATE policy on invoices at all.
-- =============================================================
create or replace function report_payment(p_invoice_id uuid, p_method payment_method)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  v_tenant := current_tenant_id();
  if v_tenant is null then
    raise exception 'not a tenant';
  end if;

  update invoices i
     set payment_reported_at = now(),
         payment_reported_method = p_method
   where i.id = p_invoice_id
     and i.lease_id in (select id from leases where tenant_id = v_tenant)
     and i.status <> 'paid';

  if not found then
    raise exception 'invoice not found, not yours, or already paid';
  end if;
end;
$$;

revoke all on function report_payment(uuid, payment_method) from public;
grant execute on function report_payment(uuid, payment_method) to authenticated;

-- =============================================================
-- New auth user -> profile. Reads org_id / role / full_name from
-- the signup metadata. SECURITY DEFINER bypasses RLS on insert.
-- org_id must be supplied in metadata (managers invite into an org).
-- =============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, org_id, role, full_name, email)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'org_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'tenant'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
