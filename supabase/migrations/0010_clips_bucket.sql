-- M-content addendum: private storage bucket for auto-cut source clips.
-- Run in the Supabase SQL Editor after 0009_ig_account_insights.sql.

insert into storage.buckets (id, name, public)
values ('clips', 'clips', false)
on conflict (id) do nothing;

create policy "clips insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "clips select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "clips delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
