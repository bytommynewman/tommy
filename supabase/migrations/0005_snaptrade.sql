-- M-invest: SnapTrade connection secrets (Wealthsimple portfolio sync).
-- Run in the Supabase SQL Editor after 0004_content.sql.

create table if not exists public.snaptrade_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  st_user_secret text not null,
  created_at timestamptz not null default now()
);

-- RLS on with NO policies: client roles can never read the SnapTrade user
-- secret. Only the snaptrade-portfolio edge function (service role) touches
-- this table.
alter table public.snaptrade_users enable row level security;
