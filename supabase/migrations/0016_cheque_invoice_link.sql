-- =============================================================
-- Link PDC cheques to the rent invoice they settle
--
--   Until now the cheque tracker and the invoice ledger were two
--   parallel records joined only by lease — so clearing a cheque did
--   nothing to the matching invoice, and a manager had to mark both
--   by hand. This adds a hard link and a trigger that keeps them in
--   sync:
--     • cheque -> cleared  : the matched invoice is marked paid
--                            (method = cheque, paid on the deposit date)
--     • cheque -> bounced  : that invoice is reverted to overdue/sent
--
--   The match is by date: a cheque's due date falls inside (or nearest
--   to) a rent period — which is exactly how the cheque generator
--   spaces the dates. The chosen invoice id is stored back on the
--   cheque so the bounce path knows what to reverse.
-- =============================================================

alter table pdc_cheques
  add column if not exists invoice_id uuid references invoices(id) on delete set null;
create index if not exists pdc_cheques_invoice_idx on pdc_cheques(invoice_id);

create or replace function pdc_sync_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice uuid;
begin
  -- Only react to an actual status change (or to an insert).
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'cleared' then
    v_invoice := new.invoice_id;

    -- Resolve which invoice this cheque settles, if not already linked.
    if v_invoice is null then
      -- 1) an unpaid invoice whose period contains the cheque's due date
      select id into v_invoice
      from invoices
      where lease_id = new.lease_id
        and org_id = new.org_id
        and status <> 'paid'
        and new.due_date >= period_start
        and new.due_date <  period_end
      order by period_start
      limit 1;

      -- 2) otherwise the nearest unpaid invoice by period start
      if v_invoice is null then
        select id into v_invoice
        from invoices
        where lease_id = new.lease_id
          and org_id = new.org_id
          and status <> 'paid'
        order by abs(period_start - new.due_date)
        limit 1;
      end if;

      new.invoice_id := v_invoice;
    end if;

    if v_invoice is not null then
      update invoices
         set status = 'paid',
             paid_date = coalesce(new.deposited_date, current_date),
             payment_method = 'cheque'
       where id = v_invoice
         and org_id = new.org_id
         and status <> 'paid';
    end if;

  elsif new.status = 'bounced' then
    -- A bounced cheque unwinds the payment it had recorded.
    if new.invoice_id is not null then
      update invoices
         set status = (case when due_date < current_date then 'overdue' else 'sent' end)::invoice_status,
             paid_date = null,
             payment_method = null
       where id = new.invoice_id
         and org_id = new.org_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pdc_sync_invoice on pdc_cheques;
create trigger trg_pdc_sync_invoice
  before insert or update on pdc_cheques
  for each row execute function pdc_sync_invoice();
