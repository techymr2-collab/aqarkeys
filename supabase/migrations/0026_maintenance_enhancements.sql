-- =============================================================
-- Maintenance module enhancements
--
--   • due_date + an SLA default by priority (urgent=1d, high=2d,
--     medium=5d, low=10d) so open tickets can be aged/sorted by how
--     overdue they are, not just listed.
--   • A quote-then-approve gate: quoted_cost is entered first (status
--     'pending'); a manager explicitly approves it before it's treated
--     as authorized spend. Fully backward compatible — a request with
--     no quote behaves exactly as before ('not_required').
--   • vendor_rating per resolved job — the real signal for vendor
--     performance, aggregated on read rather than a manually-typed
--     static number.
--   • maintenance_photos: proof photos for an issue, tenant or manager
--     uploaded, in their own storage bucket.
--   • maintenance_schedules: recurring/preventive jobs (e.g. "AC
--     service every 3 months") that a manager can generate on demand,
--     mirroring how rent invoices are generated from the lease schedule.
-- =============================================================

create type maintenance_approval_status as enum ('not_required', 'pending', 'approved', 'rejected');

alter table maintenance_requests add column if not exists due_date date;
alter table maintenance_requests add column if not exists quoted_cost numeric(12,2);
alter table maintenance_requests add column if not exists cost_approval_status maintenance_approval_status not null default 'not_required';
alter table maintenance_requests add column if not exists approved_by uuid references profiles (id) on delete set null;
alter table maintenance_requests add column if not exists approved_at timestamptz;
alter table maintenance_requests add column if not exists vendor_rating int check (vendor_rating between 1 and 5);

create or replace function set_maintenance_due_date()
returns trigger language plpgsql as $$
begin
  if new.due_date is null then
    new.due_date := current_date + (case new.priority
      when 'urgent' then 1
      when 'high' then 2
      when 'medium' then 5
      else 10
    end);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_maintenance_due_date on maintenance_requests;
create trigger trg_set_maintenance_due_date
  before insert on maintenance_requests
  for each row execute function set_maintenance_due_date();

-- Backfill existing open requests so the aging view has something to show.
update maintenance_requests
set due_date = created_at::date + (case priority
  when 'urgent' then 1
  when 'high' then 2
  when 'medium' then 5
  else 10
end)
where due_date is null;

-- =============================================================
-- maintenance_photos
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-photos', 'maintenance-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Path format: {org_id}/{maintenance_request_id}/{timestamp}_{filename}
create policy "maintenance_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'maintenance-photos'
    and split_part(name, '/', 1) = auth_org_id()::text
    and (
      is_manager()
      or split_part(name, '/', 2)::uuid in (
        select id from maintenance_requests where unit_id in (select tenant_unit_ids())
      )
    )
  );

create policy "maintenance_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'maintenance-photos'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth_org_id()::text
  );

create policy "maintenance_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'maintenance-photos'
    and is_manager()
    and split_part(name, '/', 1) = auth_org_id()::text
  );

create table if not exists maintenance_photos (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references organizations (id) on delete cascade,
  maintenance_request_id  uuid not null references maintenance_requests (id) on delete cascade,
  uploaded_by             uuid references profiles (id) on delete set null,
  file_path               text not null,
  created_at              timestamptz not null default now()
);
create index if not exists maintenance_photos_request_idx on maintenance_photos (maintenance_request_id);

alter table maintenance_photos enable row level security;

create policy maintenance_photos_mgr_all on maintenance_photos
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy maintenance_photos_tenant_read on maintenance_photos
  for select using (
    maintenance_request_id in (select id from maintenance_requests where unit_id in (select tenant_unit_ids()))
  );

create policy maintenance_photos_tenant_insert on maintenance_photos
  for insert with check (
    org_id = auth_org_id()
    and maintenance_request_id in (select id from maintenance_requests where unit_id in (select tenant_unit_ids()))
  );

create policy maintenance_photos_owner_read on maintenance_photos
  for select using (
    maintenance_request_id in (select id from maintenance_requests where unit_id in (select owner_unit_ids()))
  );

-- =============================================================
-- maintenance_schedules (recurring / preventive jobs)
-- =============================================================
create table if not exists maintenance_schedules (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  unit_id         uuid not null references units (id) on delete cascade,
  title           text not null,
  description     text not null default '',
  category        maintenance_category not null default 'general',
  priority        maintenance_priority not null default 'medium',
  frequency_months int not null default 3 check (frequency_months > 0),
  next_run_date   date not null,
  active          boolean not null default true,
  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists maintenance_schedules_org_idx on maintenance_schedules (org_id);
create index if not exists maintenance_schedules_unit_idx on maintenance_schedules (unit_id);

alter table maintenance_schedules enable row level security;

create policy maintenance_schedules_mgr_all on maintenance_schedules
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

drop trigger if exists trg_maintenance_schedules_updated on maintenance_schedules;
create trigger trg_maintenance_schedules_updated before update on maintenance_schedules
  for each row execute function set_updated_at();
