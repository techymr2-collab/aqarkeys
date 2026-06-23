-- PDC (post-dated cheque) tracker and EJARI tenancy registration tracker
-- UAE-specific features for Dubai/Abu Dhabi property management

-- ── PDC cheques ──────────────────────────────────────────────────────────────

create type pdc_status as enum ('pending', 'deposited', 'cleared', 'bounced', 'cancelled');

create table pdc_cheques (
  id             uuid           primary key default gen_random_uuid(),
  org_id         uuid           not null references organizations(id) on delete cascade,
  lease_id       uuid           not null references leases(id) on delete cascade,
  cheque_number  text,
  bank_name      text,
  amount         numeric(12, 2) not null check (amount > 0),
  due_date       date           not null,
  status         pdc_status     not null default 'pending',
  deposited_date date,
  notes          text,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

create index pdc_cheques_org_id_idx   on pdc_cheques(org_id);
create index pdc_cheques_lease_id_idx on pdc_cheques(lease_id);
create index pdc_cheques_due_date_idx on pdc_cheques(due_date);

alter table pdc_cheques enable row level security;

create policy pdc_mgr_all on pdc_cheques
  for all
  using  (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy pdc_owner_read on pdc_cheques
  for select
  using (
    lease_id in (
      select l.id from leases l
      join units u on u.id = l.unit_id
      join properties p on p.id = u.property_id
      where p.owner_id = current_owner_id()
    )
  );

create trigger trg_pdc_cheques_updated
  before update on pdc_cheques
  for each row execute function set_updated_at();

-- ── EJARI registrations ───────────────────────────────────────────────────────

create table ejari_registrations (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references organizations(id) on delete cascade,
  lease_id      uuid        not null unique references leases(id) on delete cascade,
  ejari_number  text        not null,
  registered_at date        not null,
  expires_at    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index ejari_registrations_org_id_idx   on ejari_registrations(org_id);
create index ejari_registrations_lease_id_idx on ejari_registrations(lease_id);

alter table ejari_registrations enable row level security;

create policy ejari_mgr_all on ejari_registrations
  for all
  using  (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy ejari_owner_read on ejari_registrations
  for select
  using (
    lease_id in (
      select l.id from leases l
      join units u on u.id = l.unit_id
      join properties p on p.id = u.property_id
      where p.owner_id = current_owner_id()
    )
  );

create trigger trg_ejari_updated
  before update on ejari_registrations
  for each row execute function set_updated_at();
