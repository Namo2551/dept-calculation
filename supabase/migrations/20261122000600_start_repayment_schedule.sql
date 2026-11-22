-- Start (or reset) the "original plan" a debt is tracked against, in one transaction: the old active schedule
-- is switched off and the new one inserted together, so a failed insert never leaves a debt without a plan.
-- SECURITY INVOKER: runs as the signed-in user, so RLS and the composite foreign keys still apply.
create or replace function public.start_repayment_schedule(
  p_debt_id uuid,
  p_source_plan_id uuid,
  p_balance numeric,
  p_apr numeric,
  p_monthly_payment numeric,
  p_start_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  update public.repayment_schedules set is_active = false where debt_id = p_debt_id and is_active;
  insert into public.repayment_schedules (debt_id, source_plan_id, balance, apr, monthly_payment, start_date, is_active)
  values (p_debt_id, p_source_plan_id, p_balance, p_apr, p_monthly_payment, p_start_date, true)
  returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function public.start_repayment_schedule(uuid, uuid, numeric, numeric, numeric, date) from public, anon;
grant execute on function public.start_repayment_schedule(uuid, uuid, numeric, numeric, numeric, date) to authenticated;
