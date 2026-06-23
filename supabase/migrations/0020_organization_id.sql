-- =============================================================
-- Organization ID
--
--   A sequential, human-readable identifier (ORG-000042) shown to
--   agencies for support/reference purposes, distinct from the
--   internal `id` UUID primary key. Assigned automatically — every
--   new organization row (i.e. every agency signup, see
--   handle_new_user in 0004_signup.sql) gets the next number via the
--   column default, no application code changes required.
-- =============================================================

create sequence if not exists organizations_org_number_seq;

alter table organizations
  add column if not exists org_number bigint;

-- Backfill existing orgs in actual creation order, so the number
-- reflects real signup order rather than arbitrary table scan order.
with ordered as (
  select id, row_number() over (order by created_at) as rn
  from organizations
  where org_number is null
)
update organizations o
set org_number = ordered.rn
from ordered
where o.id = ordered.id;

-- Advance the sequence past the highest backfilled number before wiring
-- it as the default, so the next signup continues right after.
select setval('organizations_org_number_seq', coalesce((select max(org_number) from organizations), 0));

alter table organizations
  alter column org_number set default nextval('organizations_org_number_seq'),
  alter column org_number set not null;

-- Ties the sequence's lifetime to the column (dropped together, etc).
alter sequence organizations_org_number_seq owned by organizations.org_number;

create unique index if not exists organizations_org_number_idx on organizations(org_number);
