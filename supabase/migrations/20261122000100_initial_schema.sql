-- Paydown: personal debt management schema.
-- Every private row belongs to one auth user (user_id / owner_id) and is protected by Row Level Security.
-- Money: numeric(14,2). Yearly interest rates in percent: numeric(6,3). Currency: ISO 4217 code, default THB.
-- Balances are never stored: they are derived from start balances and payments by the app's tested math.

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  currency text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),
  privacy_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row is created with every new account. Consent is recorded when the sign-up form sent it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, privacy_consent_at)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), ''),
    case when (new.raw_user_meta_data ->> 'privacy_consent') = 'true' then now() end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- debts (real accounts)
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'credit_card' check (kind in ('credit_card', 'personal_loan', 'other')),
  start_balance numeric(14,2) not null check (start_balance > 0),
  start_date date not null default current_date,
  apr numeric(6,3) not null check (apr >= 0 and apr <= 100),
  min_pct numeric(6,3) check (min_pct is null or (min_pct > 0 and min_pct <= 100)),
  min_amount numeric(14,2) not null default 0 check (min_amount >= 0),
  due_day smallint check (due_day is null or due_day between 1 and 31),
  currency text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active', 'paid_off', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create index debts_user_id_idx on public.debts (user_id);
create trigger debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- debt_plans (calculator scenarios)
create table public.debt_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  balance numeric(14,2) not null check (balance > 0),
  apr numeric(6,3) not null check (apr >= 0 and apr <= 100),
  min_pct numeric(6,3) not null default 5 check (min_pct >= 0.1 and min_pct <= 100),
  min_floor numeric(14,2) not null default 0 check (min_floor >= 0),
  fixed_payment numeric(14,2) not null check (fixed_payment >= 0),
  target_months integer not null default 24 check (target_months between 1 and 1200),
  interest_limit numeric(14,2) not null default 3000 check (interest_limit >= 0),
  bonus_amount numeric(14,2) check (bonus_amount is null or bonus_amount > 0),
  bonus_month integer check (bonus_month is null or bonus_month between 1 and 1200),
  start_date date not null default current_date,
  currency text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name),
  foreign key (user_id, debt_id) references public.debts (user_id, id) on delete set null (debt_id)
);

create index debt_plans_user_id_idx on public.debt_plans (user_id);
create index debt_plans_debt_id_idx on public.debt_plans (debt_id) where debt_id is not null;
create trigger debt_plans_updated_at before update on public.debt_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- repayment_schedules (frozen "original plan" per debt)
-- The planned month-by-month rows are computed from these inputs; only the inputs are stored.
create table public.repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id uuid not null,
  source_plan_id uuid,
  balance numeric(14,2) not null check (balance > 0),
  apr numeric(6,3) not null check (apr >= 0 and apr <= 100),
  monthly_payment numeric(14,2) not null check (monthly_payment > 0),
  start_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, debt_id) references public.debts (user_id, id) on delete cascade,
  foreign key (user_id, source_plan_id) references public.debt_plans (user_id, id) on delete set null (source_plan_id)
);

create index repayment_schedules_user_id_idx on public.repayment_schedules (user_id);
create unique index repayment_schedules_one_active_per_debt on public.repayment_schedules (debt_id) where is_active;
create trigger repayment_schedules_updated_at before update on public.repayment_schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- payment_records (actual payments)
create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id uuid not null,
  paid_on date not null check (paid_on >= date '2000-01-01'),
  amount numeric(14,2) not null check (amount > 0 and amount < 1000000000000),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, debt_id) references public.debts (user_id, id) on delete cascade
);

create index payment_records_user_id_idx on public.payment_records (user_id);
create index payment_records_debt_paid_on_idx on public.payment_records (debt_id, paid_on);
create trigger payment_records_updated_at before update on public.payment_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- financial_goals
create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('debt_free_by', 'debt_paid_by', 'reduce_total_pct', 'reduce_total_to')),
  debt_id uuid,
  target_date date,
  target_amount numeric(14,2) check (target_amount is null or target_amount >= 0),
  target_pct numeric(5,2) check (target_pct is null or (target_pct > 0 and target_pct <= 100)),
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, debt_id) references public.debts (user_id, id) on delete cascade,
  check (
    (kind = 'debt_free_by' and target_date is not null)
    or (kind = 'debt_paid_by' and debt_id is not null and target_date is not null)
    or (kind = 'reduce_total_pct' and target_pct is not null)
    or (kind = 'reduce_total_to' and target_amount is not null)
  )
);

create index financial_goals_user_id_idx on public.financial_goals (user_id);
create trigger financial_goals_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- shared_plans (private read-only links)
-- Only a SHA-256 hash of the link token is stored. Recipients never query these tables directly:
-- a security-definer function (added with the sharing feature) returns only the fields the owner allowed.
create table public.shared_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text check (label is null or char_length(label) <= 80),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  plan_id uuid,
  include_debts boolean not null default false,
  show_amounts boolean not null default true,
  show_payments boolean not null default false,
  show_goals boolean not null default false,
  show_notes boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (owner_id, plan_id) references public.debt_plans (user_id, id) on delete cascade,
  check (plan_id is not null or include_debts)
);

create index shared_plans_owner_id_idx on public.shared_plans (owner_id);

-- ---------------------------------------------------------------- Row Level Security
alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.debt_plans enable row level security;
alter table public.repayment_schedules enable row level security;
alter table public.payment_records enable row level security;
alter table public.financial_goals enable row level security;
alter table public.shared_plans enable row level security;

-- profiles: read and update your own row (rows are created by the trigger and removed with the account)
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- owner tables: full access to your own rows only
do $$
declare
  t text;
begin
  foreach t in array array['debts', 'debt_plans', 'repayment_schedules', 'payment_records', 'financial_goals'] loop
    execute format('create policy "%1$s: read own" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

create policy "shared_plans: read own" on public.shared_plans
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "shared_plans: insert own" on public.shared_plans
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "shared_plans: update own" on public.shared_plans
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "shared_plans: delete own" on public.shared_plans
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Visitors who are not signed in (anon) get no access to any of these tables.
revoke all on public.profiles, public.debts, public.debt_plans, public.repayment_schedules,
  public.payment_records, public.financial_goals, public.shared_plans from anon;
