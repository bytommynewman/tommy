-- M-scratch: persisted conversation with the Scratch agent.
create table public.scratch_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.scratch_messages enable row level security;

create policy "Users manage own scratch messages"
  on public.scratch_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index scratch_messages_user_created_idx
  on public.scratch_messages (user_id, created_at desc);
