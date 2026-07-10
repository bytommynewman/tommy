-- M-content addendum: preview image per synced Instagram post.
-- Run in the Supabase SQL Editor after 0005_snaptrade.sql.

alter table public.ig_media_stats add column if not exists thumbnail_url text;
