-- =============================================================
-- Phase 8: Document storage
--
--   managers upload/read/delete files for a property or lease
--   tenants read files attached to their own leases
--   owners read files attached to their properties/leases
--
-- Files live in the private Supabase Storage bucket "documents".
-- Path format: {org_id}/{entity_type}/{entity_id}/{timestamp}_{filename}
-- Access is via short-lived signed URLs (1 hour).
-- =============================================================

-- ---------- Storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 52428800, null)   -- 50 MB limit, all types
on conflict (id) do nothing;

-- ---------- Storage policies ----------
-- Only the first path segment (org_id) is checked; the DB table RLS
-- further scopes which rows (and therefore which file paths) each role sees.

create policy "documents_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and is_manager()
    and split_part(name, '/', 1) = auth_org_id()::text
  );

create policy "documents_storage_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth_org_id()::text
  );

create policy "documents_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and is_manager()
    and split_part(name, '/', 1) = auth_org_id()::text
  );

-- ---------- Metadata table ----------
create table documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  property_id uuid references properties (id) on delete cascade,
  lease_id    uuid references leases (id) on delete cascade,
  uploaded_by uuid references profiles (id) on delete set null,
  name        text not null,
  file_path   text not null,
  file_size   bigint,
  mime_type   text,
  created_at  timestamptz not null default now()
);

create index documents_org_idx      on documents (org_id);
create index documents_property_idx on documents (property_id);
create index documents_lease_idx    on documents (lease_id);

-- ---------- Table RLS ----------
alter table documents enable row level security;

-- Manager: full access within their org
create policy documents_mgr_all on documents
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

-- Tenant: read docs attached to their leases or their lease's property
create policy documents_tenant_read on documents
  for select using (
    lease_id in (select tenant_lease_ids())
    or property_id in (select tenant_property_ids())
  );

-- Owner: read docs for their properties or their properties' leases
create policy documents_owner_read on documents
  for select using (
    property_id in (select owner_property_ids())
    or lease_id in (select owner_lease_ids())
  );
