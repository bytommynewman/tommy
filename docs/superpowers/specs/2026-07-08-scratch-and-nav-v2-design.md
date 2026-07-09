# Scratch + Navigation v2 — Design

**Date:** 2026-07-08
**Status:** Approved (verbally; see User Review Gate)
**Builds on:** the golf-hole home navigation (branch `golf-home`, PR #1). Two sub-projects sharing this spec:
- **Project A — Navigation v2:** Scratch page (placeholder brain), two-button toggle, Sections usability fixes
- **Project B — Scratch brain:** Supabase Edge Function agent with live data tools

## Summary

The app gets two top-level pages toggled by a floating two-button pill bar: **Scratch** (home — a personal AI caddie with a daily read and per-section overview cards) and **Sections** (the golf-hole navigator, made easier to use: swipe to travel, pinch-out overview with direct tap-to-enter).

## Decisions from brainstorming

- **Scratch is the landing page.** Agent header up top, AI "daily read" below it, then per-section overview cards, chat bar pinned above the toggle. The overview below the AI is a core requirement.
- **The mascot holds a golf club.** Original character (no Malbon IP): golf-ball-headed caddie — dimpled ball head, bucket hat, retro shades, towel over the shoulder, golf club in hand. Malbon-inspired lane: bold retro streetwear-golf, cream/forest-green/gold, chunky uppercase type, badge/patch details. Drawn as in-app vector art.
- **Two-button toggle** (SCRATCH / SECTIONS), floating pill, bottom-center on both pages at `insets.bottom + 16` so nothing clips behind the home indicator. Active segment filled primary-green with cream text; springy slide between states.
- **Swipe replaces free-drag** on the golf page (the drag "teleport to finger" feel was the complaint).
- **Full agent scope** for Scratch (chat + reads data + takes actions), gated gracefully when the API key isn't configured yet.
- PR #1 merge decision deferred to the user; v2 branches from the `golf-home` code either way.

## Project A — Navigation v2

### Shell

- `app/(tabs)/_layout.tsx` remains a Stack. Its index route becomes a two-page pager group: **`scratch`** (initial) and **`course`** (the existing hole screen, renamed route). The five section groups stay as modal-style cards pushed above everything, unchanged.
- `components/ui/ToggleBar.tsx`: the floating pill (2 segments, icons + labels, animated active indicator, haptic tick on switch). Rendered by both pages; switching uses `router.replace` between `/scratch` and `/course` (state each page needs survives via existing persistence; no tab-navigator state retention required).
- The hole screen's `StopPreviewCard` moves up: `bottom = insets.bottom + TOGGLE_BAR_HEIGHT + 16 + spacing`.

### Scratch page (`app/(tabs)/scratch.tsx`)

Top to bottom:
1. **Mascot header** — `components/scratch/ScratchMascot.tsx` (react-native-svg vector art per the mascot decision, golf club included) + "What's the play today, Tommy?" (profile display name), chunky uppercase kicker `YOUR CADDIE — SCRATCH`.
2. **Daily read card** — badge-styled card. Project A: composed locally from real data (best days-clean, checklist remaining, same logic as TodayCard's brief) with a `Scratch is warming up — connect his brain for the full read` footnote when the agent isn't configured. Project B replaces the body with the agent-written brief.
3. **Overview grid** — one badge-style card per section (Recovery, Reflect, Plan, Life, Invest): icon, label, one stat line (Recovery: live days-clean + today's checkoff count via existing hooks; others: their tagline until built out). Tap → pushes that section (same routes as the flags).
4. **Chat bar** — pinned above the toggle bar. Project A: opens a chat sheet with Scratch's placeholder responses ("Brain's not hooked up yet — here's what I can see…" + the local daily read). Project B: real conversation.

The old TodayCard remains on the course page unchanged (its habit checklist still works there); the Scratch page's daily read covers the "what's going on" job on home.

### Sections (course) page fixes

- **Swipe to travel:** vertical swipe (fling up/down anywhere on the course) glides the ball along the fairway to the next/previous stop (`withTiming`, same easing as flag-tap travel). Free-drag projection is removed. Reduce Motion: instant jumps.
- **Pinch-out overview:** pinch gesture zooms the camera between travel zoom (2.0) and fit-whole-hole zoom. Below a zoom threshold the page enters **overview mode**: all five flags enlarge slightly, and **tapping a flag navigates directly into its section** (no ball travel, no preview card step). Pinch back in (or tap the ball) to return to travel mode.
- Zoomed in (travel mode), flag tap keeps current behavior: ball glides there, preview card slides up, tap card to enter.
- Preview card and flags restyled toward the badge aesthetic (chunky labels, patch borders) — light-touch polish, same components.

## Project B — Scratch brain

### Backend

- **Edge Function `supabase/functions/scratch-agent/`** (Deno). Secrets: `ANTHROPIC_API_KEY` (set via Supabase dashboard/CLI — never in the app bundle or repo). Uses the caller's JWT so every data access is RLS-scoped to the signed-in user.
- Request: `{ messages: [...last N turns...] }`. The function:
  1. Loads context snapshot (profile, habits, recent logs, relapses) via the user's client.
  2. Calls Claude (latest Sonnet-class model) with a Scratch personality system prompt + context + **tools**: `list_habits`, `upsert_habit_log` (check off / unskip a habit for a date), `create_habit`, `log_relapse`, `get_streaks` (computed server-side mirroring `lib/streaks.ts`).
  3. Runs the tool-use loop until Claude produces a final text reply; returns `{ reply, actions: [...tool calls made...] }` (non-streaming v1).
- **Daily read endpoint:** same function, `{ mode: 'brief' }` → one-shot analysis, no tools, returns the brief text. The app caches it for the day (AsyncStorage) so reopening doesn't re-bill.
- **`scratch_messages` migration** (`supabase/migrations/0003_scratch_messages.sql`): `id, user_id (default auth.uid()), role ('user'|'assistant'), content text, created_at` — RLS `auth.uid() = user_id`, standard conventions from existing migrations. App loads the last ~30 messages on open; function receives the tail.

### App wiring

- `lib/api/scratch.ts` (calls the edge function via `supabase.functions.invoke`) → `lib/hooks/useScratch.ts` (TanStack mutations/queries, cache invalidation of habit queries after any action Scratch performed) → screens. Same layering as every other domain.
- Chat UI upgrades from placeholder to live; action results render as small "Scratch did: ✓ checked off Gym" chips in the thread; affected data refetches immediately.
- **Unconfigured/failed state:** if the function returns "no key configured" (or errors), chat shows the friendly setup card / "Scratch shanked that one — try again" retry. Analysis card falls back to the local composition. Nothing on the page hard-fails.

### User to-dos (only Tommy can do these)

1. Create an Anthropic API key at console.anthropic.com.
2. Set it as an Edge Function secret + deploy the function (exact commands land in the plan; requires the Supabase CLI login).
3. Run migration 0003 in Supabase Studio's SQL editor (same manual flow as 0001/0002).

## Data flow, error handling, testing

- All new data access follows `api/` → `hooks/` → screen. No direct `supabase` calls from components.
- New pure logic (swipe→stop stepping, zoom-mode threshold) lives in `lib/` and gets vitest coverage; existing 9 geometry tests must stay green.
- Type-check `npx tsc --noEmit`; on-device Expo Go pass per page (toggle reachability above home indicator explicitly on the checklist).
- Edge function errors, missing key, and offline: every Scratch surface has a designed fallback (local brief, setup card, retry) — the page never blanks.

## Out of scope

- Redesigning the five sections' internals (still their own later specs).
- Streaming responses, voice, images in chat.
- Journal/goals tools for Scratch (tables don't exist yet — tools cover the habits/recovery domain that exists).
- Android polish beyond "doesn't break".

## Build order

1. **Project A** (all UI, placeholder brain) — usable immediately, no key needed.
2. **Project B** (edge function + live chat/brief + actions) — needs Tommy's API key to light up.
