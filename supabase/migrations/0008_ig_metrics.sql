-- M-content addendum: deeper per-reel insight metrics.
-- Run in the Supabase SQL Editor after 0007_ig_profile.sql.

alter table public.ig_media_stats add column if not exists reach integer;
alter table public.ig_media_stats add column if not exists saves integer;
alter table public.ig_media_stats add column if not exists shares integer;
