-- M-content addendum: username + avatar on follower snapshots.
-- Run in the Supabase SQL Editor after 0006_ig_thumbnails.sql.

alter table public.ig_snapshots add column if not exists username text;
alter table public.ig_snapshots add column if not exists profile_picture_url text;
