-- M-quit: cannabis quit tracker — the "quit weed" data layer.
-- Run in the Supabase SQL Editor after 0010_clips_bucket.sql.
--
-- Design notes
--  * One quit_attempts row per quit. It links to a habits row (kind
--    'recovery') so the existing days-clean streak, relapse_incidents and
--    the Scratch agent keep working unchanged; slips still go to
--    relapse_incidents.
--  * withdrawal_checkins is the once-a-day, under-60-second check-in. The
--    headline symptoms are real columns (queryable for trends); the full
--    19-item Cannabis Withdrawal Scale (Allsop et al. 2011) is optional and
--    stored as jsonb keyed by item, with the total denormalized.
--  * cravings is the in-the-moment log: intensity, HALT flags, trigger,
--    what was done instead, and whether it passed. Craving duration is
--    what proves to the user that urges peak and fade on their own.
--  * coping_tools / if_then_plans / quit_milestones / support_contacts are
--    the personal toolkit, seeded from constants/quit.ts by the app on
--    quit start (user_id defaults to auth.uid(), so seeds must be inserted
--    by the signed-in user, not by this migration).

create table if not exists public.quit_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid references public.habits (id) on delete set null,
  substance text not null default 'cannabis' check (substance in ('cannabis', 'nicotine', 'alcohol', 'other')),
  method text not null default 'cold_turkey' check (method in ('cold_turkey', 'taper')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  -- Free-text picture of use right before quitting ("1 g live resin cart every ~72h").
  baseline_use text,
  -- What the habit cost per week, in cents, for the money-saved counter.
  baseline_cost_cents_per_week integer not null default 0 check (baseline_cost_cents_per_week >= 0),
  -- The user's own reasons, in their own words. Shown back during cravings.
  reasons text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active attempt per substance per user.
create unique index if not exists quit_attempts_one_active_idx
  on public.quit_attempts (user_id, substance)
  where status = 'active';

create table if not exists public.withdrawal_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  checkin_date date not null,
  -- 0–10 scales (0 = none / terrible, 10 = extreme / great, see labels in constants/quit.ts)
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  sleep_quality smallint check (sleep_quality between 0 and 10),
  appetite smallint check (appetite between 0 and 10),
  mood smallint check (mood between 0 and 10),
  anxiety smallint check (anxiety between 0 and 10),
  irritability smallint check (irritability between 0 and 10),
  energy smallint check (energy between 0 and 10),
  craving_peak smallint check (craving_peak between 0 and 10),
  -- Common physical withdrawal flags
  vivid_dreams boolean not null default false,
  night_sweats boolean not null default false,
  headache boolean not null default false,
  nausea boolean not null default false,
  -- Body-maintenance behaviours that predict a good day
  meals_count smallint check (meals_count between 0 and 10),
  ate_breakfast boolean not null default false,
  worked_out boolean not null default false,
  got_outside boolean not null default false,
  -- Substances
  used_cannabis boolean not null default false,
  nicotine_level smallint check (nicotine_level between 0 and 3), -- 0 none, 1 light, 2 usual, 3 heavy
  drinks_count smallint check (drinks_count between 0 and 30),
  -- Optional full Cannabis Withdrawal Scale: { item_key: 0–10, ... } and the
  -- "how much did these interfere with normal daily activities" item.
  cws_items jsonb,
  cws_total smallint check (cws_total between 0 and 190),
  cws_interference smallint check (cws_interference between 0 and 10),
  win text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, checkin_date)
);

create table if not exists public.cravings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  intensity smallint not null check (intensity between 0 and 10),
  -- HALT check
  hungry boolean not null default false,
  angry boolean not null default false,
  lonely boolean not null default false,
  tired boolean not null default false,
  trigger_tags text[] not null default '{}',
  context text,
  -- What was done instead (free text or a coping_tools.name)
  coping_action text,
  coping_tool_id uuid, -- FK added below, after coping_tools exists
  duration_minutes smallint check (duration_minutes between 0 and 600),
  outcome text check (outcome in ('passed', 'used', 'partial')),
  intensity_after smallint check (intensity_after between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coping_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('move', 'body', 'mind', 'social', 'swap', 'build')),
  instructions text not null default '',
  minutes smallint not null default 10 check (minutes between 1 and 240),
  -- Where it works: 'anywhere' | 'home' | 'out'
  setting text not null default 'anywhere' check (setting in ('anywhere', 'home', 'out')),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  times_used integer not null default 0,
  helpful_votes integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cravings.coping_tool_id references coping_tools, which is created after
-- cravings above. Postgres resolves the FK at statement time, so add it here.
alter table public.cravings
  drop constraint if exists cravings_coping_tool_id_fkey;
alter table public.cravings
  add constraint cravings_coping_tool_id_fkey
  foreign key (coping_tool_id) references public.coping_tools (id) on delete set null;

-- Implementation intentions ("if X then Y"). Gollwitzer-style if-then plans
-- roughly double follow-through on goal intentions; these are pre-decided
-- moves for the user's known trigger situations.
create table if not exists public.if_then_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid references public.quit_attempts (id) on delete cascade,
  situation text not null,
  response text not null,
  category text not null default 'general'
    check (category in ('general', 'night_out', 'home', 'sleep', 'food', 'social', 'mood', 'nicotine', 'alcohol', 'ex')),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  times_triggered integer not null default 0,
  times_held integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pre-committed rewards. Contingency management is the best-evidenced
-- behavioural lever for cannabis use disorder; self-applied, the reward is
-- decided up-front and only cashed when the day is reached clean.
create table if not exists public.quit_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 3650),
  title text not null,
  what_to_expect text,
  reward text,
  reached_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, day_number)
);

create table if not exists public.support_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'family', 'therapist', 'doctor', 'friend', 'crisis_line', 'other')),
  phone text,
  text_ok boolean not null default true,
  late_night_ok boolean not null default false,
  -- How much they know: 'full' = knows about the quit, 'partial', 'none'
  knows text not null default 'none' check (knows in ('full', 'partial', 'none')),
  notes text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------

alter table public.quit_attempts enable row level security;
alter table public.withdrawal_checkins enable row level security;
alter table public.cravings enable row level security;
alter table public.coping_tools enable row level security;
alter table public.if_then_plans enable row level security;
alter table public.quit_milestones enable row level security;
alter table public.support_contacts enable row level security;

create policy "select own quit_attempts" on public.quit_attempts for select using (auth.uid() = user_id);
create policy "insert own quit_attempts" on public.quit_attempts for insert with check (auth.uid() = user_id);
create policy "update own quit_attempts" on public.quit_attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own quit_attempts" on public.quit_attempts for delete using (auth.uid() = user_id);

create policy "select own withdrawal_checkins" on public.withdrawal_checkins for select using (auth.uid() = user_id);
create policy "insert own withdrawal_checkins" on public.withdrawal_checkins for insert with check (auth.uid() = user_id);
create policy "update own withdrawal_checkins" on public.withdrawal_checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own withdrawal_checkins" on public.withdrawal_checkins for delete using (auth.uid() = user_id);

create policy "select own cravings" on public.cravings for select using (auth.uid() = user_id);
create policy "insert own cravings" on public.cravings for insert with check (auth.uid() = user_id);
create policy "update own cravings" on public.cravings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own cravings" on public.cravings for delete using (auth.uid() = user_id);

create policy "select own coping_tools" on public.coping_tools for select using (auth.uid() = user_id);
create policy "insert own coping_tools" on public.coping_tools for insert with check (auth.uid() = user_id);
create policy "update own coping_tools" on public.coping_tools for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own coping_tools" on public.coping_tools for delete using (auth.uid() = user_id);

create policy "select own if_then_plans" on public.if_then_plans for select using (auth.uid() = user_id);
create policy "insert own if_then_plans" on public.if_then_plans for insert with check (auth.uid() = user_id);
create policy "update own if_then_plans" on public.if_then_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own if_then_plans" on public.if_then_plans for delete using (auth.uid() = user_id);

create policy "select own quit_milestones" on public.quit_milestones for select using (auth.uid() = user_id);
create policy "insert own quit_milestones" on public.quit_milestones for insert with check (auth.uid() = user_id);
create policy "update own quit_milestones" on public.quit_milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own quit_milestones" on public.quit_milestones for delete using (auth.uid() = user_id);

create policy "select own support_contacts" on public.support_contacts for select using (auth.uid() = user_id);
create policy "insert own support_contacts" on public.support_contacts for insert with check (auth.uid() = user_id);
create policy "update own support_contacts" on public.support_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own support_contacts" on public.support_contacts for delete using (auth.uid() = user_id);

-- updated_at triggers --------------------------------------------------------

create trigger set_quit_attempts_updated_at before update on public.quit_attempts
  for each row execute function public.set_updated_at();
create trigger set_withdrawal_checkins_updated_at before update on public.withdrawal_checkins
  for each row execute function public.set_updated_at();
create trigger set_cravings_updated_at before update on public.cravings
  for each row execute function public.set_updated_at();
create trigger set_coping_tools_updated_at before update on public.coping_tools
  for each row execute function public.set_updated_at();
create trigger set_if_then_plans_updated_at before update on public.if_then_plans
  for each row execute function public.set_updated_at();
create trigger set_quit_milestones_updated_at before update on public.quit_milestones
  for each row execute function public.set_updated_at();
create trigger set_support_contacts_updated_at before update on public.support_contacts
  for each row execute function public.set_updated_at();

-- Indexes --------------------------------------------------------------------

create index if not exists quit_attempts_user_started_idx on public.quit_attempts (user_id, started_at desc);
create index if not exists withdrawal_checkins_attempt_date_idx on public.withdrawal_checkins (attempt_id, checkin_date desc);
create index if not exists cravings_attempt_occurred_idx on public.cravings (attempt_id, occurred_at desc);
create index if not exists coping_tools_user_order_idx on public.coping_tools (user_id, sort_order);
create index if not exists if_then_plans_user_order_idx on public.if_then_plans (user_id, sort_order);
create index if not exists quit_milestones_attempt_day_idx on public.quit_milestones (attempt_id, day_number);
create index if not exists support_contacts_user_order_idx on public.support_contacts (user_id, sort_order);
