-- M-scratch: persisted conversation with the Scratch agent.
-- Run in the Supabase SQL Editor after 0002_habits_recovery.sql.

-- Messages are append-only (never edited after insert), so there is no
-- updated_at column and no set_updated_at trigger.
create table if not exists public.scratch_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.scratch_messages enable row level security;

create policy "select own scratch_messages" on public.scratch_messages
  for select using (auth.uid() = user_id);
create policy "insert own scratch_messages" on public.scratch_messages
  for insert with check (auth.uid() = user_id);
create policy "update own scratch_messages" on public.scratch_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own scratch_messages" on public.scratch_messages
  for delete using (auth.uid() = user_id);

create index if not exists scratch_messages_user_created_idx on public.scratch_messages (user_id, created_at desc);
