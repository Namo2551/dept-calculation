-- Covering indexes for the composite (owner, parent) foreign keys flagged by the Supabase performance
-- advisor. Each one also serves "all rows of this user", so the single-column user_id indexes it
-- replaces are dropped.
create index debt_plans_user_debt_idx on public.debt_plans (user_id, debt_id);
drop index if exists public.debt_plans_user_id_idx;

create index financial_goals_user_debt_idx on public.financial_goals (user_id, debt_id);
drop index if exists public.financial_goals_user_id_idx;

create index payment_records_user_debt_idx on public.payment_records (user_id, debt_id);
drop index if exists public.payment_records_user_id_idx;

create index repayment_schedules_user_debt_idx on public.repayment_schedules (user_id, debt_id);
create index repayment_schedules_user_plan_idx on public.repayment_schedules (user_id, source_plan_id);
drop index if exists public.repayment_schedules_user_id_idx;

create index shared_plans_owner_plan_idx on public.shared_plans (owner_id, plan_id);
drop index if exists public.shared_plans_owner_id_idx;
