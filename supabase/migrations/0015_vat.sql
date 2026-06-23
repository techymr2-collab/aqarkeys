-- =============================================================
-- VAT handling (UAE)
--
--   UAE VAT on property rent is split by use:
--     • commercial   -> standard-rated 5%
--     • residential  -> exempt (0%)
--   so VAT is a per-property policy, not a blanket rate.
--
--   vat_rate lives on the property (percent; default 0 = exempt).
--   vat_amount is snapshotted onto each invoice at generation time
--   so historical invoices stay correct if a rate ever changes.
--   VAT applies to net rent only (late fees are outside VAT scope),
--   and is kept separate from `amount` so revenue/NOI — which sum
--   net rent — are unaffected by this pass-through liability.
-- =============================================================

alter table properties add column if not exists vat_rate   numeric not null default 0;
alter table invoices   add column if not exists vat_amount numeric not null default 0;

-- Regenerate the invoice generator (defined in 0014) so it snapshots
-- VAT from the lease's property. Everything else is unchanged.
create or replace function generate_due_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v       record;
  v_step  int;
  v_ps    date;
  v_pe    date;
  v_today date := current_date;
  v_vat   numeric;
  v_total int := 0;
  v_n     int;
begin
  for v in
    select l.id, l.org_id, l.start_date, l.end_date, l.rent_amount,
           l.frequency, l.currency, coalesce(p.vat_rate, 0) as vat_rate
    from leases l
    join units u      on u.id = l.unit_id
    join properties p on p.id = u.property_id
    where l.status = 'active'
  loop
    v_step := case v.frequency
      when 'monthly'    then 1
      when 'quarterly'  then 3
      when 'semiannual' then 6
      else 12
    end;
    v_vat := round(v.rent_amount * v.vat_rate / 100.0, 2);
    v_ps := v.start_date;
    for i in 0..239 loop
      exit when v_ps > v_today or v_ps > v.end_date;
      v_pe := (v_ps + make_interval(months => v_step))::date;
      insert into invoices (org_id, lease_id, period_start, period_end,
                            amount, vat_amount, currency, due_date, status)
      values (v.org_id, v.id, v_ps, v_pe,
              v.rent_amount, v_vat, v.currency, v_ps,
              (case when v_ps < v_today then 'overdue' else 'sent' end)::invoice_status)
      on conflict (lease_id, period_start) do nothing;
      get diagnostics v_n = row_count;
      v_total := v_total + v_n;
      v_ps := v_pe;
    end loop;
  end loop;
  return v_total;
end;
$$;
