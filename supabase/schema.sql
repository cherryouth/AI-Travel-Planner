-- Supabase schema for AI Travel Planner persistence
-- Run this script in the Supabase SQL editor or via the CLI.

create table if not exists trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travelers integer not null default 1,
  budget numeric,
  currency text not null default 'CNY',
  plan jsonb not null,
  diagnostics text[] default array[]::text[],
  preferences jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists preference_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  default_pace text,
  default_themes text[] default array[]::text[],
  kid_friendly boolean default false,
  must_have text[] default array[]::text[],
  home_airport text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists plan_expenses (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references trip_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null,
  currency text not null default 'CNY',
  incurred_on date not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists trip_plans_user_idx on trip_plans (user_id, created_at desc);
create index if not exists plan_expenses_plan_idx on plan_expenses (plan_id, incurred_on desc);

-- RLS policies
alter table trip_plans enable row level security;
alter table preference_profiles enable row level security;
alter table plan_expenses enable row level security;

create policy "Users manage their trip plans" on trip_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their preference profiles" on preference_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their plan expenses" on plan_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
