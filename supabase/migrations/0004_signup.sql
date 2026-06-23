-- =============================================================
-- Self serve signup.
--
-- A new manager signs up with their name + agency name (no org_id).
-- The trigger creates a fresh organization and makes them its
-- manager. Invited users (org_id present in metadata) are unchanged.
-- =============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id   uuid;
  v_org_name text;
  v_role     user_role;
begin
  v_org_id   := nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid;
  v_org_name := nullif(new.raw_user_meta_data ->> 'org_name', '');
  v_role     := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'tenant');

  -- Self serve: no org yet but an agency name was given. Create the org
  -- and make this user its manager.
  if v_org_id is null and v_org_name is not null then
    insert into organizations (name) values (v_org_name) returning id into v_org_id;
    v_role := 'manager';
  end if;

  insert into profiles (id, org_id, role, full_name, email)
  values (
    new.id,
    v_org_id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );

  return new;
end;
$$;
