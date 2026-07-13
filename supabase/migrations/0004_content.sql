-- M-content: Content Creation section — reel ideas, edit plans, Instagram stats.
-- Run in the Supabase SQL Editor after 0003_scratch_messages.sql.

create table if not exists public.reel_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  hook text not null,
  outline text not null,
  format text not null default 'reel',
  status text not null default 'new' check (status in ('new', 'saved', 'planned', 'filmed', 'posted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_reel_ideas_updated_at
  before update on public.reel_ideas
  for each row execute function public.set_updated_at();

create table if not exists public.edit_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  idea_id uuid not null references public.reel_ideas (id) on delete cascade,
  shot_list jsonb not null default '[]',
  beats jsonb not null default '[]',
  caption text not null default '',
  hashtags text not null default '',
  music text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ig_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followers integer not null,
  following integer not null default 0,
  media_count integer not null default 0,
  captured_at timestamptz not null default now()
);

create table if not exists public.ig_media_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_id text not null,
  caption text,
  permalink text,
  posted_at timestamptz,
  plays integer,
  likes integer not null default 0,
  comments integer not null default 0,
  captured_at timestamptz not null default now(),
  unique (user_id, media_id)
);

alter table public.reel_ideas enable row level security;
alter table public.edit_plans enable row level security;
alter table public.ig_snapshots enable row level security;
alter table public.ig_media_stats enable row level security;

create policy "select own reel_ideas" on public.reel_ideas for select using (auth.uid() = user_id);
create policy "insert own reel_ideas" on public.reel_ideas for insert with check (auth.uid() = user_id);
create policy "update own reel_ideas" on public.reel_ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own reel_ideas" on public.reel_ideas for delete using (auth.uid() = user_id);

create policy "select own edit_plans" on public.edit_plans for select using (auth.uid() = user_id);
create policy "insert own edit_plans" on public.edit_plans for insert with check (auth.uid() = user_id);
create policy "update own edit_plans" on public.edit_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own edit_plans" on public.edit_plans for delete using (auth.uid() = user_id);

create policy "select own ig_snapshots" on public.ig_snapshots for select using (auth.uid() = user_id);
create policy "insert own ig_snapshots" on public.ig_snapshots for insert with check (auth.uid() = user_id);
create policy "delete own ig_snapshots" on public.ig_snapshots for delete using (auth.uid() = user_id);

create policy "select own ig_media_stats" on public.ig_media_stats for select using (auth.uid() = user_id);
create policy "insert own ig_media_stats" on public.ig_media_stats for insert with check (auth.uid() = user_id);
create policy "update own ig_media_stats" on public.ig_media_stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own ig_media_stats" on public.ig_media_stats for delete using (auth.uid() = user_id);

create index if not exists reel_ideas_user_status_idx on public.reel_ideas (user_id, status, created_at desc);
create index if not exists edit_plans_user_idea_idx on public.edit_plans (user_id, idea_id, created_at desc);
create index if not exists ig_snapshots_user_captured_idx on public.ig_snapshots (user_id, captured_at desc);
