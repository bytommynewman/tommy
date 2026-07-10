-- M-content addendum: 28-day account-level insight totals per snapshot.
-- Run in the Supabase SQL Editor after 0008_ig_metrics.sql.

alter table public.ig_snapshots add column if not exists views_28d integer;
alter table public.ig_snapshots add column if not exists reach_28d integer;
alter table public.ig_snapshots add column if not exists engaged_28d integer;
