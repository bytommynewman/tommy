-- M2: habits, habit_logs, relapse_incidents.
-- Run in the Supabase SQL Editor after 0001_profiles.sql.

-- Habit definitions. Both positive habits ("build": gym, sleep) and
-- addiction-recovery tracking ("recovery": gambling, cannabis, nicotine)
-- live here, disambiguated by kind.
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  kind text not null check (kind in ('build', 'recovery')),
  category text,
  target_type text not null default 'boolean' check (target_type in ('boolean', 'count', 'duration', 'abstinence')),
  target_value numeric,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily check-ins. For recovery habits a "done" day means "stayed clean /
-- within my limit"; craving_intensity captures how hard that was, which is
-- high-signal data for the therapist mode even on good days.
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('done', 'skipped', 'partial')),
  value numeric,
  craving_intensity smallint check (craving_intensity between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- Relapse incidents get richer structure than a daily log: trigger analysis
-- and (for gambling) dollar amounts are what make patterns visible over time.
create table if not exists public.relapse_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  trigger text,
  trigger_tags text[] not null default '{}',
  amount numeric,
  severity smallint check (severity between 1 and 5),
  support_used boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.relapse_incidents enable row level security;

create policy "select own habits" on public.habits
  for select using (auth.uid() = user_id);
create policy "insert own habits" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "update own habits" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own habits" on public.habits
  for delete using (auth.uid() = user_id);

create policy "select own habit_logs" on public.habit_logs
  for select using (auth.uid() = user_id);
create policy "insert own habit_logs" on public.habit_logs
  for insert with check (auth.uid() = user_id);
create policy "update own habit_logs" on public.habit_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own habit_logs" on public.habit_logs
  for delete using (auth.uid() = user_id);

create policy "select own relapse_incidents" on public.relapse_incidents
  for select using (auth.uid() = user_id);
create policy "insert own relapse_incidents" on public.relapse_incidents
  for insert with check (auth.uid() = user_id);
create policy "update own relapse_incidents" on public.relapse_incidents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own relapse_incidents" on public.relapse_incidents
  for delete using (auth.uid() = user_id);

create trigger set_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();
create trigger set_habit_logs_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();
create trigger set_relapse_incidents_updated_at
  before update on public.relapse_incidents
  for each row execute function public.set_updated_at();

create index if not exists habit_logs_habit_date_idx on public.habit_logs (habit_id, log_date desc);
create index if not exists relapse_incidents_occurred_idx on public.relapse_incidents (user_id, occurred_at desc);
