-- Game Receipts — initial production schema (Supabase / Postgres 15+).
-- Mirrors lib/domain.ts. Conventions: every user-owned table has user_id + RLS;
-- locked prediction fields are immutable (trigger), timestamps/hashes are server-generated,
-- and grading/resolution run only with the service role (edge function / server job).

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_color text not null default '#22E58A',
  favorite_leagues text[] not null default '{}',
  favorite_teams text[] not null default '{}',
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'free' check (plan in ('free','pro','creator')),
  is_creator boolean not null default false,
  onboarded boolean not null default false,
  private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Users may edit their own profile but never their role/plan/creator flag.
create or replace function public.guard_profile_privileges() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and (new.role is distinct from old.role or new.plan is distinct from old.plan or new.is_creator is distinct from old.is_creator) then
    raise exception 'privileged profile fields are read-only';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_privileges();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12), 'New forecaster');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- questions (markets) ----------
create table public.questions (
  id text primary key,
  league text not null check (league in ('NFL','NBA','NCAAF','NCAAB','NHL','MLB')),
  category text not null check (category in ('award','trade','breakout','team','comparison')),
  kind text not null check (kind in ('binary','categorical')),
  title text not null,
  criteria text not null,
  resolution_source text not null,
  options jsonb,                 -- [{id,label,baseline}]
  baseline_yes numeric check (baseline_yes between 0 and 1),
  baseline_source text not null default 'none' check (baseline_source in ('mock-consensus','licensed-consensus','none')),
  specificity numeric not null check (specificity between 0 and 1),
  resolves_by timestamptz not null,
  status text not null default 'open' check (status in ('open','resolved','void')),
  review_status text not null default 'pending' check (review_status in ('approved','pending','rejected')),
  outcome jsonb,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  evidence jsonb not null default '[]',
  awards jsonb not null default '{}',
  developments jsonb not null default '[]',
  created_by uuid references public.profiles(id),   -- null = system catalog
  created_at timestamptz not null default now(),
  check (kind <> 'categorical' or jsonb_typeof(options) = 'array')
);
create index questions_open_idx on public.questions (status, resolves_by);

-- ---------- predictions (receipts) ----------
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('graded','debate')),
  question_id text references public.questions(id),
  league text,
  subject jsonb,                 -- {type:'player'|'team', id} the take is about (shown as its avatar)
  category text not null,
  original_text text not null check (char_length(original_text) between 1 and 500),
  structured_text text not null,
  criteria text not null,
  resolves_by timestamptz,
  forecast jsonb,
  baseline_snapshot jsonb,
  grading_version text not null,
  locked_at timestamptz not null default now(),
  chain_id uuid not null,
  revision_of uuid references public.predictions(id),
  revision_number int not null default 1,
  prev_hash text not null,
  hash text not null unique,
  -- lifecycle (mutable, service role only)
  status text not null default 'pending' check (status in ('pending','resolved','void')),
  superseded_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_in_grace boolean not null default false,
  score jsonb,
  resolved_at timestamptz,
  hidden boolean not null default false,
  check ((kind = 'graded') = (question_id is not null and forecast is not null))
);
create index predictions_user_idx on public.predictions (user_id, locked_at desc);
create index predictions_question_idx on public.predictions (question_id);
create index predictions_feed_idx on public.predictions (locked_at desc) where not hidden and superseded_at is null;
-- One live take per user per question (anti contradictory-spam).
create unique index predictions_one_live_take on public.predictions (user_id, question_id)
  where kind = 'graded' and status = 'pending' and superseded_at is null and withdrawn_at is null;

-- Locked fields can never change, and receipts can never be deleted.
create or replace function public.guard_prediction_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'predictions are permanent'; end if;
  if (new.id, new.user_id, new.kind, new.question_id, new.league, new.category, new.original_text, new.structured_text, new.criteria,
      new.resolves_by, new.forecast, new.baseline_snapshot, new.grading_version, new.locked_at, new.chain_id, new.revision_of,
      new.revision_number, new.prev_hash, new.hash, new.subject)
     is distinct from
     (old.id, old.user_id, old.kind, old.question_id, old.league, old.category, old.original_text, old.structured_text, old.criteria,
      old.resolves_by, old.forecast, old.baseline_snapshot, old.grading_version, old.locked_at, old.chain_id, old.revision_of,
      old.revision_number, old.prev_hash, old.hash, old.subject) then
    raise exception 'locked prediction fields are immutable';
  end if;
  return new;
end $$;
create trigger predictions_immutable before update or delete on public.predictions for each row execute function public.guard_prediction_immutable();

-- Canonical payload hashed for each receipt (jsonb text form is key-sorted and deterministic).
create or replace function public.prediction_payload(p public.predictions) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id', p.id, 'userId', p.user_id, 'kind', p.kind, 'questionId', p.question_id, 'league', p.league, 'category', p.category,
    'subject', p.subject, 'originalText', p.original_text, 'structuredText', p.structured_text, 'criteria', p.criteria, 'resolvesBy', p.resolves_by,
    'forecast', p.forecast, 'baselineSnapshot', p.baseline_snapshot, 'gradingVersion', p.grading_version, 'lockedAt', p.locked_at,
    'chainId', p.chain_id, 'revisionOf', p.revision_of, 'revisionNumber', p.revision_number, 'prevHash', p.prev_hash)
$$;

create or replace function public.verify_prediction(pid uuid) returns boolean language sql stable as $$
  select encode(digest(public.prediction_payload(p)::text, 'sha256'), 'hex') = p.hash from public.predictions p where p.id = pid
$$;

/**
 * The ONLY way clients create receipts. Server sets id, timestamp, baseline snapshot,
 * hash chain and revision bookkeeping. Forecast coherence is re-validated in the app's
 * server layer before calling this (lib/scoring/validateForecast) and checked again here.
 */
create or replace function public.lock_prediction(
  p_question_id text, p_original_text text, p_structured_text text, p_forecast jsonb,
  p_debate_league text default null, p_revision_of uuid default null, p_subject jsonb default null
) returns public.predictions language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q public.questions;
  prev text;
  orig public.predictions;
  rec public.predictions;
  today_count int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));  -- serialise a user's chain
  select coalesce((select hash from public.predictions where user_id = uid order by locked_at desc, id desc limit 1), repeat('0', 64)) into prev;

  rec.id := gen_random_uuid();
  rec.user_id := uid;
  rec.locked_at := now();
  rec.original_text := left(trim(p_original_text), 500);
  rec.subject := p_subject;
  rec.grading_version := 'GR-2026.1';
  rec.prev_hash := prev;
  rec.revision_number := 1;
  rec.chain_id := rec.id;

  if p_question_id is null then
    rec.kind := 'debate'; rec.category := 'debate'; rec.league := p_debate_league;
    rec.structured_text := rec.original_text;
    rec.criteria := 'Debate — not objectively verifiable, so it is never graded.';
  else
    select count(*) into today_count from public.predictions where user_id = uid and kind = 'graded' and locked_at::date = now()::date;
    if today_count >= 20 then raise exception 'daily lock limit reached'; end if;
    select * into q from public.questions where id = p_question_id;
    if q.id is null or q.status <> 'open' or q.resolves_by <= now() or q.review_status = 'rejected' then raise exception 'question is closed'; end if;
    if p_forecast->>'type' is distinct from q.kind then raise exception 'forecast type mismatch'; end if;
    rec.kind := 'graded'; rec.question_id := q.id; rec.league := q.league; rec.category := q.category;
    rec.structured_text := p_structured_text; rec.criteria := q.criteria; rec.resolves_by := q.resolves_by; rec.forecast := p_forecast;
    rec.baseline_snapshot := case when q.kind = 'binary'
      then jsonb_build_object('kind','binary','baselineYes', coalesce(q.baseline_yes, 0.5),'specificity', q.specificity)
      else jsonb_build_object('kind','categorical','options', (select jsonb_agg(jsonb_build_object('id', o->>'id','baseline', (o->>'baseline')::numeric)) from jsonb_array_elements(q.options) o),'specificity', q.specificity) end;
    if p_revision_of is not null then
      select * into orig from public.predictions where id = p_revision_of and user_id = uid and question_id = q.id
        and status = 'pending' and superseded_at is null and withdrawn_at is null for update;
      if orig.id is null then raise exception 'only live takes can be revised'; end if;
      update public.predictions set superseded_at = rec.locked_at where id = orig.id;
      rec.chain_id := orig.chain_id; rec.revision_of := orig.id; rec.revision_number := orig.revision_number + 1;
    end if;
  end if;

  rec.status := 'pending'; rec.withdrawn_in_grace := false; rec.hidden := false;
  rec.hash := encode(digest(public.prediction_payload(rec)::text, 'sha256'), 'hex');
  insert into public.predictions select rec.*;
  insert into public.audit_log (actor_id, action, entity, entity_id, data) values (uid, case when p_revision_of is null then 'lock' else 'revise' end, 'prediction', rec.id::text, jsonb_build_object('hash', rec.hash));
  return rec;
end $$;

create or replace function public.withdraw_prediction(pid uuid) returns public.predictions language plpgsql security definer set search_path = public as $$
declare p public.predictions; in_grace boolean;
begin
  select * into p from public.predictions where id = pid and user_id = auth.uid() for update;
  if p.id is null or p.status <> 'pending' or p.withdrawn_at is not null or p.superseded_at is not null then raise exception 'not withdrawable'; end if;
  in_grace := now() - p.locked_at <= interval '10 minutes';
  update public.predictions set withdrawn_at = now(), withdrawn_in_grace = in_grace,
    status = case when in_grace or p.kind = 'debate' then 'void' else status end
  where id = pid returning * into p;
  insert into public.audit_log (actor_id, action, entity, entity_id, data) values (auth.uid(), 'withdraw', 'prediction', pid::text, jsonb_build_object('inGrace', in_grace));
  return p;
end $$;

-- ---------- social ----------
create table public.follows (follower_id uuid references public.profiles(id) on delete cascade, followee_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, followee_id), check (follower_id <> followee_id));
create index follows_followee_idx on public.follows (followee_id);
create table public.blocks (blocker_id uuid references public.profiles(id) on delete cascade, blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (blocker_id, blocked_id));
create table public.likes (user_id uuid references public.profiles(id) on delete cascade, prediction_id uuid references public.predictions(id),
  created_at timestamptz not null default now(), primary key (user_id, prediction_id));
create table public.comments (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id), body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(), hidden boolean not null default false);
create index comments_prediction_idx on public.comments (prediction_id, created_at);
create table public.debate_votes (user_id uuid references public.profiles(id) on delete cascade, prediction_id uuid references public.predictions(id),
  agree boolean not null, created_at timestamptz not null default now(), primary key (user_id, prediction_id));

create or replace function public.is_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- ---------- battles & leagues ----------
create table public.battles (
  id uuid primary key default gen_random_uuid(), question_id text not null references public.questions(id),
  challenger_id uuid not null references public.profiles(id), opponent_id uuid not null references public.profiles(id),
  challenger_prediction_id uuid not null references public.predictions(id), opponent_prediction_id uuid references public.predictions(id),
  message text not null default '' check (char_length(message) <= 200),
  status text not null default 'open' check (status in ('open','accepted','declined','resolved')),
  winner_id uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz,
  check (challenger_id <> opponent_id));
create index battles_users_idx on public.battles (challenger_id, opponent_id);

create table public.groups (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 3 and 60), slug text not null unique,
  description text not null default '', owner_id uuid not null references public.profiles(id), invite_code text not null unique,
  visibility text not null default 'private' check (visibility in ('public','private')), is_creator_league boolean not null default false,
  question_ids text[] not null default '{}', created_at timestamptz not null default now());
create table public.group_members (group_id uuid references public.groups(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')), joined_at timestamptz not null default now(), primary key (group_id, user_id));

create or replace function public.join_group(code text) returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  select * into g from public.groups where invite_code = upper(trim(code));
  if g.id is null then raise exception 'invite code not found'; end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end $$;

-- ---------- notifications, moderation, audit ----------
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, text text not null, href text not null, actor_id uuid references public.profiles(id), read boolean not null default false,
  created_at timestamptz not null default now());
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('prediction','comment','user')), target_id text not null, reason text not null,
  status text not null default 'open' check (status in ('open','actioned','dismissed')), resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now());
create table public.appeals (id uuid primary key default gen_random_uuid(), prediction_id uuid not null references public.predictions(id),
  user_id uuid not null references public.profiles(id), reason text not null check (char_length(reason) between 10 and 600),
  status text not null default 'open' check (status in ('open','upheld','overturned')), response text, resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), resolved_at timestamptz);
create unique index appeals_one_open on public.appeals (prediction_id) where status = 'open';
create table public.audit_log (id bigint generated always as identity primary key, at timestamptz not null default now(), actor_id uuid,
  action text not null, entity text not null, entity_id text not null, data jsonb);
create table public.waitlist (user_id uuid references public.profiles(id) on delete cascade, plan text not null check (plan in ('pro','creator')),
  created_at timestamptz not null default now(), primary key (user_id, plan));

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.predictions enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.debate_votes enable row level security;
alter table public.battles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_log enable row level security;
alter table public.waitlist enable row level security;

create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy questions_read on public.questions for select using (review_status <> 'rejected' or created_by = auth.uid() or public.is_admin());
-- questions are written by lock flows / admins via security-definer functions or the service role only.

create policy predictions_read on public.predictions for select using (
  user_id = auth.uid() or public.is_admin() or (
    not hidden and not public.is_blocked(auth.uid(), user_id) and (
      not (select private from public.profiles where id = user_id)
      or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = user_id))));
-- No insert/update/delete policies: receipts are created only via lock_prediction(), lifecycle changes only via service role.

create policy follows_read on public.follows for select using (true);
create policy follows_write on public.follows for insert with check (follower_id = auth.uid() and not public.is_blocked(follower_id, followee_id));
create policy follows_delete on public.follows for delete using (follower_id = auth.uid());
create policy blocks_own on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy likes_read on public.likes for select using (true);
create policy likes_write on public.likes for insert with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete using (user_id = auth.uid());
create policy comments_read on public.comments for select using (not hidden or user_id = auth.uid() or public.is_admin());
create policy comments_write on public.comments for insert with check (user_id = auth.uid());
create policy votes_read on public.debate_votes for select using (true);
create policy votes_write on public.debate_votes for insert with check (user_id = auth.uid());
create policy votes_update on public.debate_votes for update using (user_id = auth.uid());
create policy battles_read on public.battles for select using (true);
create policy battles_create on public.battles for insert with check (challenger_id = auth.uid() and status = 'open');
create policy battles_respond on public.battles for update using (opponent_id = auth.uid() and status = 'open') with check (status in ('accepted','declined'));
create policy groups_read on public.groups for select using (visibility = 'public' or exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy groups_create on public.groups for insert with check (owner_id = auth.uid());
create policy groups_owner_update on public.groups for update using (owner_id = auth.uid());
create policy members_read on public.group_members for select using (true);
create policy members_leave on public.group_members for delete using (user_id = auth.uid() and role <> 'owner');
create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update using (user_id = auth.uid());
create policy reports_create on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_admin on public.reports for select using (public.is_admin());
create policy appeals_own on public.appeals for select using (user_id = auth.uid() or public.is_admin());
create policy appeals_create on public.appeals for insert with check (user_id = auth.uid() and exists (select 1 from public.predictions p where p.id = prediction_id and p.user_id = auth.uid() and p.status = 'resolved'));
create policy audit_admin on public.audit_log for select using (public.is_admin());
create policy waitlist_own on public.waitlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant execute on function public.lock_prediction, public.withdraw_prediction, public.join_group, public.verify_prediction to authenticated;
