-- M1: profiles table, RLS, and auto-create-on-signup trigger.
-- Run this in the Supabase SQL Editor (Studio) for your project, or via
-- `supabase db push` if you're using the Supabase CLI linked to this project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'America/New_York',
  birthdate date,
  -- context_summary is injected verbatim into every therapist-mode system
  -- prompt (see M9) so the AI stays grounded in who Tommy actually is,
  -- rather than giving generic chatbot responses.
  context_summary text,
  crisis_resources_ack boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own profile" on public.profiles
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profiles row whenever a new auth user signs up, so the app
-- never has to handle a "missing profile" case for a valid session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
