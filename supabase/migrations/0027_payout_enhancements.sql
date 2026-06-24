-- =============================================================
-- Payout enhancements:
--   - void a payout (reconciliation mistakes shouldn't be stuck as
--     'pending' forever, and a wrongly-paid one can be voided too)
--   - itemized expense breakdown per payout, so an owner can see
--     which specific expenses were deducted, not just the net
-- =============================================================

alter type payout_status add value 'void';

alter table payouts add column if not exists void_reason text;
alter table payouts add column if not exists voided_at timestamptz;
alter table payouts add column if not exists voided_by uuid references profiles (id) on delete set null;

-- Snapshot of which expenses contributed to a payout's expenses_total.
-- Denormalized (not just a FK) so the breakdown stays stable even if the
-- source expense is later edited or deleted.
create table payout_expenses (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  payout_id     uuid not null references payouts (id) on delete cascade,
  expense_id    uuid references expenses (id) on delete set null,
  category      text not null,
  amount        numeric(12,2) not null,
  expense_date  date not null,
  note          text,
  created_at    timestamptz not null default now()
);
create index payout_expenses_payout_idx on payout_expenses (payout_id);
create index payout_expenses_org_idx on payout_expenses (org_id);

alter table payout_expenses enable row level security;

create policy payout_expenses_mgr_all on payout_expenses
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy payout_expenses_owner_read on payout_expenses
  for select using (
    exists (
      select 1 from payouts po
      where po.id = payout_expenses.payout_id and po.owner_id = current_owner_id()
    )
  );

-- Backfill: link existing payouts to the expenses that would have matched
-- their property + period at generation time (same logic the function used).
insert into payout_expenses (org_id, payout_id, expense_id, category, amount, expense_date, note)
select e.org_id, po.id, e.id, e.category, e.amount, e.date, e.note
from payouts po
join expenses e on e.property_id = po.property_id and e.date between po.period_start and po.period_end
where e.org_id = po.org_id;

-- =============================================================
-- generate_payouts: now also snapshots the contributing expenses
-- into payout_expenses for each payout it creates.
-- =============================================================
create or replace function generate_payouts(p_start date, p_end date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid := auth_org_id();
  v_count   int := 0;
  r         record;
  v_fee     numeric(12,2);
  v_payout  uuid;
begin
  if v_org is null or not is_manager() then
    raise exception 'only a manager can generate payouts';
  end if;

  for r in
    select p.id as property_id, p.owner_id, p.currency, p.management_fee_percent as fee_pct,
           coalesce(g.gross, 0) as gross,
           coalesce(e.exp, 0) as exp
    from properties p
    left join (
      select u.property_id, sum(i.amount) as gross
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      where i.org_id = v_org
        and i.status = 'paid'
        and i.paid_date between p_start and p_end
      group by u.property_id
    ) g on g.property_id = p.id
    left join (
      select property_id, sum(amount) as exp
      from expenses
      where org_id = v_org and date between p_start and p_end
      group by property_id
    ) e on e.property_id = p.id
    where p.org_id = v_org
      and (coalesce(g.gross, 0) <> 0 or coalesce(e.exp, 0) <> 0)
      and not exists (
        select 1 from payouts po
        where po.property_id = p.id
          and po.period_start = p_start
          and po.period_end = p_end
      )
  loop
    v_fee := round(r.gross * r.fee_pct / 100, 2);
    insert into payouts (
      org_id, property_id, owner_id, period_start, period_end, currency,
      gross_collected, expenses_total, fee_percent, fee_amount, net_amount, status
    )
    values (
      v_org, r.property_id, r.owner_id, p_start, p_end, r.currency,
      r.gross, r.exp, r.fee_pct, v_fee, r.gross - r.exp - v_fee, 'pending'
    )
    returning id into v_payout;

    insert into payout_expenses (org_id, payout_id, expense_id, category, amount, expense_date, note)
    select v_org, v_payout, ex.id, ex.category, ex.amount, ex.date, ex.note
    from expenses ex
    where ex.org_id = v_org and ex.property_id = r.property_id and ex.date between p_start and p_end;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
