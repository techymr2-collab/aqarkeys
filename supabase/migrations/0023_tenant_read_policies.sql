-- =============================================================
-- Tenant read access to PDC cheques and EJARI registrations
--
--   Tenants previously had zero visibility into the post-dated
--   cheques they handed over (pending/cleared/bounced) or whether
--   their tenancy is officially EJARI-registered — only managers and
--   owners could read these. Adds read-only policies scoped to the
--   tenant's own lease, mirroring the existing invoices_tenant_read /
--   leases_tenant_read pattern.
-- =============================================================

create policy pdc_tenant_read on pdc_cheques
  for select using (lease_id in (select id from leases where tenant_id = current_tenant_id()));

create policy ejari_tenant_read on ejari_registrations
  for select using (lease_id in (select id from leases where tenant_id = current_tenant_id()));
