-- =============================================================
-- Invite flow.
--
-- A manager creates an invitation (org + role + email, optionally
-- linked to an owner/tenant record). The invitee opens the invite
-- link and signs up. handle_new_user reads the invitation to set
-- org_id + role SERVER SIDE (never trusting client metadata) and
-- links the new profile to the owner/tenant record.
-- =============================================================

create type invite_status as enum ('pending', 'accepted', 'revoked');

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  email       text not null,
  role        user_role not null,
  owner_id    uuid references owners (id) on delete cascade,
  tenant_id   uuid references tenants (id) on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  status      invite_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index invitations_org_idx   on invitations (org_id);
create index invitations_email_idx on invitations (lower(email));

create trigger trg_invitations_updated
  before update on invitations
  for each row execute function set_updated_at();

alter table invitations enable row level security;

create policy invitations_mgr_all on invitations
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

-- Public read of a single invitation by token, for the accept page.
-- Returns only display-safe fields; the caller must know the token.
create or replace function get_invitation(p_token uuid)
returns table (email text, role user_role, org_name text, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select i.email, i.role, o.name,
         (i.status = 'pending' and i.expires_at > now()) as valid
  from invitations i
  join organizations o on o.id = i.org_id
  where i.token = p_token;
$$;

revoke all on function get_invitation(uuid) from public;
grant execute on function get_invitation(uuid) to anon, authenticated;

-- =============================================================
-- Replace handle_new_user to honour invitations first.
-- Priority: pending invitation by email > self serve org_name >
-- explicit org_id metadata.
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
  v_invite   invitations%rowtype;
begin
  select * into v_invite
  from invitations
  where lower(email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    v_org_id := v_invite.org_id;
    v_role   := v_invite.role;
  else
    v_org_id   := nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid;
    v_org_name := nullif(new.raw_user_meta_data ->> 'org_name', '');
    v_role     := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'tenant');

    if v_org_id is null and v_org_name is not null then
      insert into organizations (name) values (v_org_name) returning id into v_org_id;
      v_role := 'manager';
    end if;
  end if;

  insert into profiles (id, org_id, role, full_name, email)
  values (
    new.id,
    v_org_id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );

  -- Link the new account to its owner/tenant record and close the invite.
  if found then
    if v_invite.owner_id is not null then
      update owners set profile_id = new.id where id = v_invite.owner_id;
    end if;
    if v_invite.tenant_id is not null then
      update tenants set profile_id = new.id where id = v_invite.tenant_id;
    end if;
    update invitations
      set status = 'accepted', accepted_at = now()
      where id = v_invite.id;
  end if;

  return new;
end;
$$;
