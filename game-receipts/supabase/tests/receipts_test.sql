-- Behavioural checks for 0001_game_receipts.sql. Run against a scratch DB after
-- supabase/tests/auth_stub.sql (local Postgres) — see README "Database".
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@x.dev'), ('22222222-2222-2222-2222-222222222222', 'b@x.dev');
insert into public.questions (id, league, category, kind, title, criteria, resolution_source, baseline_yes, baseline_source, specificity, resolves_by, review_status)
values ('q1', 'NBA', 'trade', 'binary', 'X is traded', 'YES if traded', 'NBA.com', 0.3, 'mock-consensus', 0.6, now() + interval '90 days', 'approved');
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare p public.predictions; r public.predictions; ok boolean;
begin
  p := public.lock_prediction('q1', 'He is gone', 'X is traded — YES (70%)', '{"type":"binary","pYes":0.7}');
  assert p.prev_hash = repeat('0', 64), 'first receipt chains from genesis';
  assert public.verify_prediction(p.id), 'hash verifies';
  assert p.baseline_snapshot->>'baselineYes' = '0.3', 'baseline snapshotted';

  begin perform public.lock_prediction('q1', 'again', 'dup', '{"type":"binary","pYes":0.2}'); assert false, 'dup allowed';
  exception when unique_violation then null; end;

  -- No UPDATE/DELETE policies: RLS makes these silent no-ops for clients.
  update public.predictions set forecast = '{"type":"binary","pYes":0.99}' where id = p.id;
  delete from public.predictions where id = p.id;
  select (forecast->>'pYes')::numeric = 0.7 into ok from public.predictions where id = p.id;
  assert ok, 'client could alter or delete a receipt';

  begin insert into public.predictions (user_id, kind, category, original_text, structured_text, criteria, grading_version, chain_id, prev_hash, hash)
    values (auth.uid(), 'debate', 'debate', 'x', 'x', 'x', 'v', gen_random_uuid(), 'x', 'forged'); raise exception 'NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  r := public.lock_prediction('q1', 'injury news', 'X is traded — NO (60%)', '{"type":"binary","pYes":0.4}', null, p.id);
  assert r.chain_id = p.chain_id and r.revision_number = 2 and r.prev_hash = p.hash, 'revision chains';
  select superseded_at is not null into ok from public.predictions where id = p.id;
  assert ok, 'original superseded';
  assert public.verify_prediction(p.id), 'original still verifies after supersede';
end $$;

-- Other users see public receipts but can't touch them.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare n int;
begin
  select count(*) into n from public.predictions; assert n = 2, 'public receipts readable';
  begin perform public.withdraw_prediction((select id from public.predictions where superseded_at is null limit 1)); raise exception 'NOT_BLOCKED';
  exception when raise_exception then if sqlerrm = 'NOT_BLOCKED' then raise; end if; end;
  begin update public.profiles set role = 'admin' where id = auth.uid(); raise exception 'NOT_BLOCKED';
  exception when raise_exception then if sqlerrm = 'NOT_BLOCKED' then raise; end if; end;
end $$;
reset role;

-- Even with RLS bypassed (service role / owner), the trigger forbids edits and deletes.
do $$
declare pid uuid := (select id from public.predictions order by locked_at limit 1);
begin
  begin update public.predictions set original_text = 'rewritten' where id = pid; raise exception 'NOT_BLOCKED';
  exception when raise_exception then if sqlerrm = 'NOT_BLOCKED' then raise; end if; end;
  begin delete from public.predictions where id = pid; raise exception 'NOT_BLOCKED';
  exception when raise_exception then if sqlerrm = 'NOT_BLOCKED' then raise; end if; end;
  update public.predictions set hidden = true where id = pid;  -- lifecycle fields stay writable for moderation/grading
  assert public.verify_prediction(pid), 'lifecycle update broke the hash';
end $$;
select 'RECEIPTS_SQL_TESTS_OK';
