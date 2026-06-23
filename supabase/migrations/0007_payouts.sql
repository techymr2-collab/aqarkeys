-- =============================================================
-- Owner payouts (disbursements)
--
-- A payout is the agency paying an owner their net for a period,
-- computed PER PROPERTY so currencies never mix:
--   net = rent collected - expenses - management fee
-- The fee is a per-property percent of collected rent.
-- =============================================================

alter table properties
  add column management_fee_percent numeric(5,2) not null default 5;

create type payout_status as enum ('pending', 'paid');

create table payouts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  property_id     uuid not null references properties (id) on delete cascade,
  owner_id        uuid not null references owners (id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  currency        currency_code not null,
  gross_collected numeric(12,2) not null default 0,
  expenses_total  numeric(12,2) not null default 0,
  fee_percent     numeric(5,2) not null default 0,
  fee_amount      numeric(12,2) not null default 0,
  net_amount      numeric(12,2) not null default 0,
  status          payout_status not null default 'pending',
  paid_date       date,
  method          payment_method,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (property_id, period_start, period_end)
);
create index payouts_org_idx   on payouts (org_id);
create index payouts_owner_idx on payouts (owner_id);

create trigger trg_payouts_updated
  before update on payouts
  for each row execute function set_updated_at();

alter table payouts enable row level security;

create policy payouts_mgr_all on payouts
  for all using (is_manager() and org_id = auth_org_id())
  with check (is_manager() and org_id = auth_org_id());

create policy payouts_owner_read on payouts
  for select using (owner_id = current_owner_id());

-- =============================================================
-- Generate payouts for a period for the caller's org. One row per
-- property with rent collected or expenses in the window, skipping
-- any that already exist. Returns the number created.
-- =============================================================
create or replace function generate_payouts(p_start date, p_end date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org   uuid := auth_org_id();
  v_count int := 0;
  r       record;
  v_fee   numeric(12,2);
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
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function generate_payouts(date, date) from public;
grant execute on function generate_payouts(date, date) to authenticated;
