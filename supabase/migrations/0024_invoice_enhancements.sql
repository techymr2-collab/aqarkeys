-- =============================================================
-- Invoice module enhancements
--
--   • 'void' status: cancel an invoice without deleting its record
--     (keeps the audit trail; excluded from billed/outstanding totals).
--   • amount_paid: tracks partial payments without a separate "partial"
--     enum value — status stays sent/overdue until amount_paid covers
--     the total, at which point it becomes 'paid'. This avoids a
--     modeling conflict where an invoice could be both "partial" and
--     "overdue" at once.
--   • invoice_no: a per-org sequential number, assigned the moment an
--     invoice first leaves 'draft' (not on creation), so abandoned
--     drafts don't burn numbers out of sequence. Existing invoices are
--     backfilled in issue-date order.
--   • notes: free-text field used for edits and void reasons.
--   • invoice_line_items: ad-hoc charges (parking, utilities, etc.)
--     attached to an invoice, alongside the rent/VAT/late fee already
--     tracked directly on the invoice row.
-- =============================================================

alter type invoice_status add value if not exists 'void';

alter table invoices add column if not exists amount_paid numeric not null default 0;
alter table invoices add column if not exists invoice_no  integer;
alter table invoices add column if not exists notes       text;

create unique index if not exists invoices_org_invoice_no_uniq
  on invoices (org_id, invoice_no) where invoice_no is not null;

create or replace function assign_invoice_no()
returns trigger language plpgsql as $$
begin
  if new.status <> 'draft' and new.invoice_no is null then
    select coalesce(max(invoice_no), 0) + 1 into new.invoice_no
    from invoices where org_id = new.org_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_invoice_no on invoices;
create trigger trg_assign_invoice_no
  before insert or update on invoices
  for each row execute function assign_invoice_no();

-- Backfill: every existing invoice is already non-draft, so give each one
-- a sequential number in issue-date order, per org.
with numbered as (
  select id, row_number() over (partition by org_id order by created_at, id) as rn
  from invoices
  where status <> 'draft' and invoice_no is null
)
update invoices i set invoice_no = numbered.rn
from numbered where i.id = numbered.id;

-- =============================================================
-- invoice_line_items
-- =============================================================
create table if not exists invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  invoice_id  uuid not null references invoices (id) on delete cascade,
  description text not null,
  amount      numeric(12,2) not null,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_line_items_invoice_idx on invoice_line_items (invoice_id);

alter table invoice_line_items enable row level security;

create policy invoice_line_items_mgr_all on invoice_line_items
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy invoice_line_items_owner_read on invoice_line_items
  for select using (invoice_id in (select id from invoices where lease_id in (select owner_lease_ids())));

create policy invoice_line_items_tenant_read on invoice_line_items
  for select using (invoice_id in (select id from invoices where lease_id in (select tenant_lease_ids())));
