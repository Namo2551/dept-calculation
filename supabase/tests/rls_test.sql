-- Row Level Security test for the Paydown schema.
-- Creates two throwaway users (A and B), acts as each one, and checks that nobody can see or change
-- another user's rows. The block always ends by raising an exception, so EVERYTHING it created is
-- rolled back: success is the message "ALL_RLS_CHECKS_PASSED"; a failure starts with "RLS FAIL".
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  a_debt uuid;
  a_plan uuid;
  n integer;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'rls-a@example.test', '{"display_name":"A","privacy_consent":"true"}', now(), now()),
    (b, 'authenticated', 'authenticated', 'rls-b@example.test', '{"display_name":"B"}', now(), now());

  -- the sign-up trigger made both profiles; A's consent is recorded, B's is not
  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then raise exception 'RLS FAIL: profiles not created by trigger (%)', n; end if;
  if (select privacy_consent_at from public.profiles where id = a) is null then raise exception 'RLS FAIL: consent not recorded'; end if;
  if (select privacy_consent_at from public.profiles where id = b) is not null then raise exception 'RLS FAIL: consent recorded without consent'; end if;

  -- ---------------------------------------------------------------- act as user A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.debts (name, start_balance, apr) values ('Card A', 30000, 16) returning id into a_debt;
  insert into public.debt_plans (name, balance, apr, fixed_payment, debt_id) values ('Plan A', 30000, 16, 1500, a_debt) returning id into a_plan;
  insert into public.repayment_schedules (debt_id, source_plan_id, balance, apr, monthly_payment, start_date)
    values (a_debt, a_plan, 30000, 16, 1500, current_date);
  insert into public.payment_records (debt_id, paid_on, amount) values (a_debt, current_date, 1500);
  insert into public.financial_goals (title, kind, target_date) values ('Debt free', 'debt_free_by', current_date + 730);
  insert into public.shared_plans (token_hash, plan_id) values (extensions.digest('token-a', 'sha256'), a_plan);

  select count(*) into n from public.debts;
  if n <> 1 then raise exception 'RLS FAIL: A should see 1 debt, saw %', n; end if;

  -- ---------------------------------------------------------------- act as user B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.debts;               if n <> 0 then raise exception 'RLS FAIL: B sees % of A''s debts', n; end if;
  select count(*) into n from public.debt_plans;          if n <> 0 then raise exception 'RLS FAIL: B sees A''s plans'; end if;
  select count(*) into n from public.repayment_schedules; if n <> 0 then raise exception 'RLS FAIL: B sees A''s schedules'; end if;
  select count(*) into n from public.payment_records;     if n <> 0 then raise exception 'RLS FAIL: B sees A''s payments'; end if;
  select count(*) into n from public.financial_goals;     if n <> 0 then raise exception 'RLS FAIL: B sees A''s goals'; end if;
  select count(*) into n from public.shared_plans;        if n <> 0 then raise exception 'RLS FAIL: B sees A''s share links'; end if;
  select count(*) into n from public.profiles;            if n <> 1 then raise exception 'RLS FAIL: B sees % profiles', n; end if;

  update public.debts set name = 'hacked' where id = a_debt;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS FAIL: B updated A''s debt'; end if;

  delete from public.debt_plans where id = a_plan;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS FAIL: B deleted A''s plan'; end if;

  update public.profiles set display_name = 'hacked' where id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS FAIL: B updated A''s profile'; end if;

  -- B cannot attach a payment to A's debt, even with its own user_id (composite foreign key)
  begin
    insert into public.payment_records (debt_id, paid_on, amount) values (a_debt, current_date, 1);
    raise exception 'RLS FAIL: B attached a payment to A''s debt';
  exception when foreign_key_violation then null;
  end;

  -- B cannot create rows that claim to be A's (RLS with check)
  begin
    insert into public.debts (user_id, name, start_balance, apr) values (a, 'fake', 1, 1);
    raise exception 'RLS FAIL: B inserted a debt as A';
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- visitors who are not signed in
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  begin
    select count(*) into n from public.debts;
    raise exception 'RLS FAIL: anon could read debts (% rows)', n;
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- deleting an account removes its data
  execute 'reset role';
  delete from auth.users where id = a;
  select count(*) into n from public.debts where user_id = a;
  if n <> 0 then raise exception 'RLS FAIL: A''s debts survived account deletion'; end if;
  select count(*) into n from public.payment_records where user_id = a;
  if n <> 0 then raise exception 'RLS FAIL: A''s payments survived account deletion'; end if;

  raise exception 'ALL_RLS_CHECKS_PASSED';
end;
$$;
