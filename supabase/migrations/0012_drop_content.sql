-- Remove the content-creation / Instagram feature entirely (Tommy's call:
-- no content, social media or email anywhere in this app).
-- Run in the Supabase SQL Editor after 0011_quit_cannabis.sql. Safe to run
-- even if the content migrations (old 0004, 0006–0010) were never applied.

drop table if exists public.edit_plans cascade;
drop table if exists public.reel_ideas cascade;
drop table if exists public.ig_media_stats cascade;
drop table if exists public.ig_snapshots cascade;

drop policy if exists "clips insert own" on storage.objects;
drop policy if exists "clips select own" on storage.objects;
drop policy if exists "clips delete own" on storage.objects;
delete from storage.objects where bucket_id = 'clips';
delete from storage.buckets where id = 'clips';
