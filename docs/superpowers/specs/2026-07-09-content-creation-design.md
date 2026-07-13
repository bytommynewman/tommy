# Content Creation section — ideas, edit director, Instagram stats

**Date:** 2026-07-09
**Status:** approved by Tommy in chat (incl. course-expansion navigation amendment)
**Scope:** new "Content" section (hole 6 on the course) with three sub-pages:
Reel idea generator, AI edit director, Instagram account stats. New migration
0004, two new edge functions. HUD field-kit styling from day one.

## Tommy's niche (feeds all AI prompts)

A creator documenting the come-up: day-in-the-life vlogs, building his own
AI-powered life app with Claude, the investing journey, habit/recovery
self-improvement, cool edits of himself. Format: Instagram Reels (primary).

## Decisions

- **Navigation (Tommy's amendment):** Content lives ON the course as hole 6
  (after invest; marker fracs respaced 0, .2, .4, .6, .8, 1). Tapping the
  content marker does NOT navigate — a HUD sub-panel fans open beside it with
  three options: `ideas / editor / stats`; tapping one opens that sub-page
  (full page, no modal). Scorecard becomes "front 6" everywhere (course
  legend + home list). Other markers keep tap-to-enter behavior.
- **Stats source:** OFFICIAL Instagram API (Tommy's explicit choice over the
  screenshot/manual options). Creator account + Meta developer app in dev
  mode (own account only — no app review). Token stored as edge-function
  secret `IG_ACCESS_TOKEN` (+ `IG_USER_ID`), never in the app or repo.
  A click-by-click runbook `CONNECT-INSTAGRAM.md` gets written for Tommy.
- **Editor v1 = AI edit director** (no on-device video processing in Expo Go;
  a real editor is a future custom-build project).
- **Build order (3 PRs):** (1) section shell + course hole 6 + Ideas tab,
  (2) edit director, (3) stats + ig-sync. Each phone-tested before the next.

## Data (migration 0004, RLS `auth.uid() = user_id` like all tables)

- `reel_ideas`: id, user_id (default auth.uid()), title, hook, outline text,
  format text, status enum ('new','saved','planned','filmed','posted'),
  created_at/updated_at (+ set_updated_at trigger).
- `edit_plans`: id, user_id, idea_id FK -> reel_ideas on delete cascade,
  shot_list jsonb, beats jsonb, caption text, hashtags text, music text,
  created_at.
- `ig_snapshots`: id, user_id, followers int, following int, media_count int,
  captured_at timestamptz.
- `ig_media_stats`: id, user_id, media_id text, caption text, permalink text,
  posted_at timestamptz, plays int, likes int, comments int, captured_at.
  Unique (user_id, media_id, captured_at::date) semantics via upsert on
  (user_id, media_id) keeping latest counts + snapshot history in
  ig_snapshots only (keep it simple: media stats table holds latest per
  media, upsert on conflict (user_id, media_id)).

## Edge functions (Deno, same auth pattern as scratch-agent: caller JWT, RLS)

- `content-agent` (ANTHROPIC_API_KEY, model claude-sonnet-5):
  - mode `ideas`: input none; context = niche block (hardcoded from this
    spec) + Tommy's habit/streak context (reuse scratch-agent's loadContext
    queries) + latest ig_snapshot + 10 most recent reel_ideas (avoid
    repeats). Returns JSON array of 5 ideas {title, hook, outline, format}.
    App inserts them as status 'new'.
  - mode `edit_plan`: input idea_id; loads the idea; returns
    {shot_list: [{shot, note}], beats: [{start, end, description}],
    caption, hashtags, music}. App inserts into edit_plans.
- `ig-sync` (IG_ACCESS_TOKEN, IG_USER_ID secrets): calls Instagram Graph
  `GET /{ig-user-id}?fields=followers_count,follows_count,media_count` and
  `GET /{ig-user-id}/media?fields=id,caption,permalink,timestamp,
  like_count,comments_count,media_type` (+ insights plays where available);
  inserts one ig_snapshot and upserts ig_media_stats. Returns the fresh
  numbers. Errors return {error:'ig_not_configured'|'ig_failed'} and the
  Stats tab degrades to last-synced data with a plain notice.

## App structure

- `constants/hole.ts`: STOPS gains
  `{frac: 1.0 -> respaced, route: '/content', label: 'Content',
  icon: 'videocam-outline', tagline: 'Reels: ideas, edits, stats'}` — 6
  stops at fracs [0, .2, .4, .6, .8, 1]. Home ScorecardList and course
  legend say "front 6" (derive count from STOPS.length, no hardcoded 5s).
- Course: `TargetMarker` gains an `expanded` treatment for the content stop —
  course.tsx tracks `expandedStop`; tapping content toggles a `SubPanel`
  (HUD plate next to the marker) listing ideas/editor/stats; tapping one
  `router.push('/content/ideas' | '/content/editor' | '/content/stats')`.
  Tapping elsewhere/panning closes it.
- Routes: `app/(tabs)/content/_layout.tsx` (Stack), `index.tsx` redirects to
  `ideas`, plus `ideas.tsx`, `editor.tsx`, `stats.tsx`. Each page: HUD
  header (`content · ideas` etc.) + a 3-chip sub-header to hop between the
  three (SegmentedControl-style, HUD-styled), back to course via edge swipe.
- Data layer per house rules: `lib/api/content.ts` (fetch/generate ideas,
  update status, build/fetch edit plans, trigger ig-sync, fetch snapshots +
  media stats) -> `lib/hooks/useContent.ts` (TanStack Query) -> screens.
- `types/database.types.ts` updated with the four new tables.

## UI (all HUD field kit)

- **Ideas:** `> radio scratch for ideas_` button (loading: `scratch is
  scouting angles…`); idea cards (GlowBox): hook big, outline lines, format
  chip; actions per card: `save` / `dismiss` (dismiss deletes 'new' rows),
  saved list below grouped by status with tap-to-advance status chip
  (saved -> planned -> filmed -> posted). Pull-to-refresh refetches.
- **Editor:** list of saved/planned ideas; `build the edit` per idea calls
  edit_plan mode; plan view: shot list with working checkboxes (local state
  persisted in the jsonb via update), beat sheet rows (`0.0-1.2s` mono),
  caption block + `copy caption + tags` (expo-clipboard — Expo Go OK),
  music line. Regenerate button.
- **Stats:** hero follower count + delta vs previous snapshot; simple
  sparkline of snapshots (react-native-svg polyline — no new deps); grid of
  recent reels (plays/likes/comments); `sync` button + sync-on-open;
  `ig_not_configured` state shows a friendly pointer to CONNECT-INSTAGRAM.md.

## Testing & guardrails

- vitest for pure logic: idea JSON parsing/validation, snapshot delta +
  sparkline point math, edit-plan JSON validation (lib/contentLogic.ts).
- tsc + full suite green per task; commits per task.
- Secrets only server-side; token setup by Tommy in terminal (never chat).
- Deploy steps for Tommy per slice: paste migration 0004 in SQL editor,
  `supabase functions deploy content-agent` (and later `ig-sync`).

## Out of scope (later projects)

- On-device video editing (needs EAS custom build).
- Auto-posting/scheduling to Instagram; TikTok/YouTube.
- Scheduled background ig-sync (cron) — v1 syncs on open/button.
