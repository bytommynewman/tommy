# Content slice 1: hole 6 + Ideas tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Content becomes hole 6 on the course with a fan-out sub-panel (ideas/editor/stats); the Ideas sub-page generates, saves, and tracks Reel ideas via a new content-agent edge function. Editor/Stats pages ship as HUD "standby" stubs so navigation is complete.

**Architecture:** Mirrors existing house patterns exactly — migration + hand-updated types, RLS-scoped Deno edge function with caller JWT (copy scratch-agent's shell), `lib/api/content.ts` → `lib/hooks/useContent.ts` → screens, pure logic in `lib/contentLogic.ts` (vitest), HUD field kit UI.

**Tech Stack:** existing only (Supabase, TanStack Query, Anthropic SDK in Deno, expo-router). No new dependencies.

## Global Constraints

- Branch `content-creation`; tsc + vitest green each task; commit per task.
- HUD copy lowercase mono; secrets server-side only.
- Derive hole counts from `STOPS.length` — no hardcoded "5"/"front 5" anywhere.

### Task 1: Six stops + count-derived labels
- Modify `constants/hole.ts`: STOPS fracs → [0,.2,.4,.6,.8,1], append `{frac:1, route:'/content', label:'Content', icon:'videocam-outline', tagline:'Reels: ideas, edits, stats'}` (invest moves to .8).
- Modify `components/hud/ScorecardList.tsx` ('// the course — N holes') and `components/hole/FeedChrome.tsx` ('front N') to use `STOPS.length`.
- Gate + commit.

### Task 2: Migration 0004 + types
- Create `supabase/migrations/0004_content.sql`: reel_ideas, edit_plans, ig_snapshots, ig_media_stats per spec (RLS all four, default auth.uid(), set_updated_at trigger on reel_ideas only, unique(user_id, media_id) on ig_media_stats).
- Update `types/database.types.ts` with Row/Insert types + `ReelIdeaStatus`.
- Gate + commit. (Tommy pastes SQL at test time.)

### Task 3: `lib/contentLogic.ts` (TDD)
- `parseIdeas(raw: string): ReelIdeaDraft[] | null` — parse/validate model JSON (accepts fenced JSON), max 8, each {title, hook, outline, format} non-empty strings.
- `parseEditPlan(raw: string): EditPlanDraft | null` — {shot_list[], beats[], caption, hashtags, music} validated.
- `snapshotPoints(snaps: {followers, captured_at}[], w, h): string` — svg polyline points, oldest→newest, min-max normalized (flat line at h/2 when constant).
- `followerDelta(snaps): number | null`.
- Tests first in `lib/__tests__/contentLogic.test.ts`, then implement. Gate + commit.

### Task 4: content-agent edge function
- Create `supabase/functions/content-agent/index.ts` + `deno.json` (copy scratch-agent shell: CORS, apiKey check → not_configured, caller-JWT client, unauthorized). Model `claude-sonnet-5`.
- mode `ideas`: context = NICHE block (from spec) + habits/today logs (same queries as scratch-agent loadContext, trimmed) + latest ig_snapshot + last 10 reel_ideas titles; system asks for STRICT JSON array of 5 {title,hook,outline,format}; parse server-side with same validation contract as parseIdeas (duplicate tiny validator inline — edge files are outside app tsconfig); insert rows status 'new'; return {ideas}.
- mode `edit_plan` {idea_id}: load idea (RLS), ask for strict JSON plan, insert edit_plans row, return {plan}. (Editor UI is slice 2; function ships now so slice 2 is UI-only.)
- Gate (tsc unaffected) + commit.

### Task 5: api + hooks
- `lib/api/content.ts`: fetchIdeas(), generateIdeas() (invoke content-agent {mode:'ideas'}, localizedBody pattern), setIdeaStatus(id,status), deleteIdea(id), fetchEditPlans(), buildEditPlan(ideaId), fetchSnapshots(), fetchMediaStats(), syncInstagram() (invoke ig-sync; slice 3 backend — returns not_configured until then).
- `lib/hooks/useContent.ts`: useIdeas, useGenerateIdeas (invalidate ['reel_ideas']), useSetIdeaStatus, useDeleteIdea, useEditPlans, useBuildEditPlan, useSnapshots, useMediaStats, useSyncInstagram.
- Gate + commit.

### Task 6: routes + Ideas UI + stubs
- `app/(tabs)/content/_layout.tsx`: Stack headerShown false, HUD bg.
- `content/index.tsx`: `<Redirect href="/content/ideas" />`.
- Shared `components/content/ContentHeader.tsx`: `content · <tab>` title + 3-chip hop row (ideas/editor/stats, active highlighted, router.replace) + safe area, HUD styled.
- `content/ideas.tsx`: generate button (`> radio scratch for ideas_`, pending `scratch is scouting angles…`), NEW ideas as GlowBox cards (hook 15px, outline 12px lines, format chip; `save`/`dismiss`), saved groups by status with tap-to-advance chip (saved→planned→filmed→posted), empty state copy, error state (`shanked that one — run it again`). Pull-to-refresh.
- `content/editor.tsx` + `content/stats.tsx`: HUD stub — header + `standby · shipping this week` panel (editor lists nothing yet; stats shows not-configured pointer).
- Gate + commit.

### Task 7: course fan-out sub-panel
- `app/(tabs)/course.tsx`: `const [expandedStop, setExpandedStop] = useState<number|null>(null)`; content stop tap (route === '/content') → toggle expandedStop instead of enterStop; any other marker tap, pan/pinch onInteract, or toggle press closes it.
- New `components/hole/SubPanel.tsx`: HUD plate positioned near the content marker (fixed offset above the scorecard, right side), rows `ideas / editor / stats` with 18px number-free chips → router.push respective route (closes panel first).
- Gate + commit.

### Task 8: verify + PR
- Full gate; update `NEXT-STEPS.md` with Tommy's two deploy steps (paste 0004 SQL; `supabase functions deploy content-agent`).
- Phone checklist: hole 6 marker on course + fan-out panel; ideas generate/save/status; stubs reachable; scorecard says front 6; home list shows 6 rows.
- Push, `gh pr create` (base main). Tommy merges after phone pass.
