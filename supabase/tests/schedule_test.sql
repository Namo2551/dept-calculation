-- public.start_repayment_schedule: one active plan per debt, atomic change, owner only. Always rolls back:
-- success is the error message "ALL_SCHEDULE_CHECKS_PASSED".
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); d uuid; n int;
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at) values
    (a,'authenticated','authenticated','sched-a@example.test',now(),now()), (b,'authenticated','authenticated','sched-b@example.test',now(),now());
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.debts (name, start_balance, apr) values ('x', 1000, 10) returning id into d;
  perform public.start_repayment_schedule(d, null, 1000, 10, 100, current_date);
  perform public.start_repayment_schedule(d, null, 1000, 10, 200, current_date);
  select count(*) into n from public.repayment_schedules where debt_id = d and is_active;
  if n <> 1 then raise exception 'SCHED FAIL: % active', n; end if;
  if (select monthly_payment from public.repayment_schedules where debt_id = d and is_active) <> 200 then raise exception 'SCHED FAIL: wrong active'; end if;
  begin
    perform public.start_repayment_schedule(d, null, 1000, 10, 0, current_date);
    raise exception 'SCHED FAIL: bad schedule accepted';
  exception when check_violation then null;
  end;
  select count(*) into n from public.repayment_schedules where debt_id = d and is_active;
  if n <> 1 then raise exception 'SCHED FAIL: failed change left % active', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true);
  begin
    perform public.start_repayment_schedule(d, null, 1000, 10, 300, current_date);
    raise exception 'SCHED FAIL: B started a plan on A''s debt';
  exception when foreign_key_violation or unique_violation then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
  if (select monthly_payment from public.repayment_schedules where debt_id = d and is_active) <> 200 then raise exception 'SCHED FAIL: B changed A''s plan'; end if;
  raise exception 'ALL_SCHEDULE_CHECKS_PASSED';
end $$;
