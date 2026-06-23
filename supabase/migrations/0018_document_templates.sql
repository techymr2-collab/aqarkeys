-- =============================================================
-- Customizable lease documents
--
--   Agencies can tailor the clauses of each generated lease document
--   and brand the PDFs. Branding (logo, accent colour, footer) is one
--   set per org and lives on organizations. Clause text is per
--   document type and lives in document_templates as an ordered JSON
--   array of { heading, body }. When no row exists for a doc type the
--   app falls back to built-in defaults, so this is purely additive.
--
--   The agency logo reuses the existing private "documents" storage
--   bucket under {org_id}/branding/... — already covered by that
--   bucket's org-scoped policies, so no new storage policy is needed.
-- =============================================================

alter table organizations
  add column if not exists logo_path   text,
  add column if not exists brand_color text,
  add column if not exists doc_footer  text;

create type document_type as enum (
  'tenancy_contract', 'renewal_addendum', 'notice_to_vacate'
);

create table document_templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  doc_type    document_type not null,
  clauses     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, doc_type)
);
create index document_templates_org_idx on document_templates(org_id);

create trigger trg_document_templates_updated
  before update on document_templates
  for each row execute function set_updated_at();

alter table document_templates enable row level security;

create policy document_templates_mgr_all on document_templates
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());
