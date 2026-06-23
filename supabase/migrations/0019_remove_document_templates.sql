-- =============================================================
-- Remove the lease document customization feature (0018)
--
--   Lease document generation itself has been removed from the
--   product, so the template/branding schema that existed solely to
--   configure it is removed too.
-- =============================================================

drop policy if exists document_templates_mgr_all on document_templates;
drop trigger if exists trg_document_templates_updated on document_templates;
drop table if exists document_templates;
drop type if exists document_type;

alter table organizations
  drop column if exists logo_path,
  drop column if exists brand_color,
  drop column if exists doc_footer;
