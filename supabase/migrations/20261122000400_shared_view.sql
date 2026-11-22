-- Private sharing: the ONLY way a recipient reads shared data. Recipients have no table access at all;
-- this security-definer function takes the raw link token, checks its SHA-256 hash against shared_plans
-- (not revoked, not expired), records the view, and returns only what the owner allowed.
-- When show_amounts is false, every money value is rescaled so the starting balance is 100 (percent of the
-- starting balance): progress, dates and chart shapes stay exact, but no real amount leaves the database.
create or replace function public.get_shared_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shared_plans%rowtype;
  result jsonb;
  plan_json jsonb := null;
  debts_json jsonb := '[]'::jsonb;
  goals_json jsonb := '[]'::jsonb;
  p public.debt_plans%rowtype;
  f numeric;
begin
  if p_token is null or char_length(p_token) < 32 or char_length(p_token) > 128 then
    return null;
  end if;

  select * into s from public.shared_plans
  where token_hash = extensions.digest(p_token, 'sha256')
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if not found then
    return null;
  end if;

  update public.shared_plans set last_viewed_at = now() where id = s.id;

  -- the shared plan (a calculator scenario)
  if s.plan_id is not null then
    select * into p from public.debt_plans where id = s.plan_id and user_id = s.owner_id;
    if found then
      f := case when s.show_amounts then 1 else 100 / p.balance end;
      plan_json := jsonb_build_object(
        'name', p.name,
        'balance', round(p.balance * f, 4),
        'apr', p.apr,
        'min_pct', p.min_pct,
        'min_floor', round(p.min_floor * f, 4),
        'fixed_payment', round(p.fixed_payment * f, 4),
        'target_months', p.target_months,
        'bonus_amount', case when p.bonus_amount is null then null else round(p.bonus_amount * f, 4) end,
        'bonus_month', p.bonus_month,
        'start_date', p.start_date,
        'currency', p.currency,
        'notes', case when s.show_notes then p.notes else null end
      );
    end if;
  end if;

  -- the owner's debts, with payments and active plan if allowed
  if s.include_debts then
    select coalesce(jsonb_agg(d_json order by d_created), '[]'::jsonb) into debts_json
    from (
      select d.created_at as d_created,
        jsonb_build_object(
          'id', md5(d.id::text || s.id::text), -- not the real id
          'name', d.name,
          'kind', d.kind,
          'start_balance', round(d.start_balance * fd.f, 4),
          'start_date', d.start_date,
          'apr', d.apr,
          'min_pct', d.min_pct,
          'min_amount', round(d.min_amount * fd.f, 4),
          'due_day', d.due_day,
          'currency', d.currency,
          'status', d.status,
          'payments', case when s.show_payments then (
            select coalesce(jsonb_agg(jsonb_build_object(
              'paid_on', pr.paid_on,
              'amount', round(pr.amount * fd.f, 4),
              'note', case when s.show_notes then pr.note else null end
            ) order by pr.paid_on), '[]'::jsonb)
            from public.payment_records pr where pr.debt_id = d.id and pr.user_id = s.owner_id
          ) else null end,
          'schedule', (
            select jsonb_build_object(
              'balance', round(rs.balance * fd.f, 4),
              'apr', rs.apr,
              'monthly_payment', round(rs.monthly_payment * fd.f, 4),
              'start_date', rs.start_date
            )
            from public.repayment_schedules rs
            where rs.debt_id = d.id and rs.user_id = s.owner_id and rs.is_active
          )
        ) as d_json
      from public.debts d
      cross join lateral (select case when s.show_amounts then 1::numeric else 100 / d.start_balance end as f) fd
      where d.user_id = s.owner_id and d.status <> 'archived'
    ) x;
  end if;

  -- goals (amount targets only when amounts are shown)
  if s.show_goals then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', g.title,
      'kind', g.kind,
      'target_date', g.target_date,
      'target_pct', g.target_pct,
      'target_amount', case when s.show_amounts then g.target_amount else null end,
      'achieved', g.achieved_at is not null
    ) order by g.created_at), '[]'::jsonb) into goals_json
    from public.financial_goals g where g.user_id = s.owner_id;
  end if;

  result := jsonb_build_object(
    'label', s.label,
    'created_at', s.created_at,
    'expires_at', s.expires_at,
    'show_amounts', s.show_amounts,
    'show_payments', s.show_payments,
    'show_goals', s.show_goals,
    'show_notes', s.show_notes,
    'include_debts', s.include_debts,
    'plan', plan_json,
    'debts', debts_json,
    'goals', goals_json
  );
  return result;
end;
$$;

revoke execute on function public.get_shared_view(text) from public;
grant execute on function public.get_shared_view(text) to anon, authenticated;
