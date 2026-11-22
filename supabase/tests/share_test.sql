-- Private sharing test for public.get_shared_view. Creates a throwaway user with a debt, payment, plan, goal
-- and share link, then checks what a visitor holding the link (anon) can and cannot see. Always rolls back:
-- success is the error message "ALL_SHARE_CHECKS_PASSED"; failures start with "SHARE FAIL".
do $$
declare
  a uuid := gen_random_uuid(); d uuid; p uuid; sid uuid; v jsonb; n int;
  tok text := 'tok_' || repeat('x', 40);
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at) values (a,'authenticated','authenticated','share-a@example.test',now(),now());
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.debts (name, start_balance, apr, min_amount) values ('Card A', 30000, 16, 500) returning id into d;
  insert into public.payment_records (debt_id, paid_on, amount, note) values (d, current_date, 1500, 'secret note');
  insert into public.debt_plans (name, balance, apr, fixed_payment, notes) values ('Plan A', 30000, 16, 1500, 'plan note') returning id into p;
  insert into public.financial_goals (title, kind, target_amount) values ('Get to 10k', 'reduce_total_to', 10000);
  insert into public.shared_plans (token_hash, plan_id, include_debts, show_amounts, show_payments, show_goals, show_notes)
    values (extensions.digest(tok, 'sha256'), p, true, false, false, true, false) returning id into sid;

  -- a visitor with the link (anon) can read the view, and only what was allowed
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  v := public.get_shared_view(tok);
  if v is null then raise exception 'SHARE FAIL: valid link returned nothing'; end if;
  if (v->'plan'->>'balance')::numeric <> 100 then raise exception 'SHARE FAIL: plan amount not hidden (%)', v->'plan'->>'balance'; end if;
  if (v->'plan'->>'fixed_payment')::numeric <> 5 then raise exception 'SHARE FAIL: plan payment not scaled (%)', v->'plan'->>'fixed_payment'; end if;
  if v->'plan'->>'notes' is not null then raise exception 'SHARE FAIL: plan notes leaked'; end if;
  if (v->'debts'->0->>'start_balance')::numeric <> 100 then raise exception 'SHARE FAIL: debt amount not hidden'; end if;
  if v->'debts'->0->'payments' <> 'null'::jsonb then raise exception 'SHARE FAIL: payments leaked (%)', v->'debts'->0->'payments'; end if;
  if v->'debts'->0->>'id' = d::text then raise exception 'SHARE FAIL: real debt id leaked'; end if;
  -- payment history hidden: only the month's total, scaled, dated at the month's start
  if (v->'debts'->0->'monthly_paid'->0->>'amount')::numeric <> 5 then raise exception 'SHARE FAIL: monthly total wrong (%)', v->'debts'->0->'monthly_paid'; end if;
  if v->'debts'->0->'monthly_paid'->0 ? 'note' then raise exception 'SHARE FAIL: monthly totals carry notes'; end if;
  if v->'goals'->0->>'target_amount' is not null then raise exception 'SHARE FAIL: goal amount leaked'; end if;
  if v::text like '%secret note%' or v::text like '%plan note%' then raise exception 'SHARE FAIL: a note leaked'; end if;
  if public.get_shared_view(tok || 'x') is not null then raise exception 'SHARE FAIL: wrong token accepted'; end if;
  if public.get_shared_view('short') is not null then raise exception 'SHARE FAIL: short token accepted'; end if;
  begin
    select count(*) into n from public.shared_plans;
    raise exception 'SHARE FAIL: anon read shared_plans';
  exception when insufficient_privilege then null;
  end;

  -- amounts and payments shown when allowed
  execute 'reset role';
  update public.shared_plans set show_amounts = true, show_payments = true, show_notes = true where id = sid;
  execute 'set local role anon';
  v := public.get_shared_view(tok);
  if (v->'plan'->>'balance')::numeric <> 30000 then raise exception 'SHARE FAIL: amount not shown when allowed'; end if;
  if (v->'debts'->0->'payments'->0->>'amount')::numeric <> 1500 then raise exception 'SHARE FAIL: payment not shown when allowed'; end if;
  if v->'debts'->0->'monthly_paid' <> 'null'::jsonb then raise exception 'SHARE FAIL: monthly totals sent alongside full history'; end if;

  -- revoked and expired links stop working
  execute 'reset role';
  update public.shared_plans set revoked_at = now() where id = sid;
  execute 'set local role anon';
  if public.get_shared_view(tok) is not null then raise exception 'SHARE FAIL: revoked link still works'; end if;
  execute 'reset role';
  update public.shared_plans set revoked_at = null, expires_at = now() - interval '1 minute' where id = sid;
  execute 'set local role anon';
  if public.get_shared_view(tok) is not null then raise exception 'SHARE FAIL: expired link still works'; end if;

  raise exception 'ALL_SHARE_CHECKS_PASSED';
end $$;
