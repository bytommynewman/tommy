# HUD look & feel — home "Agency HQ" + course "satellite feed"

**Date:** 2026-07-09
**Status:** approved by Tommy (chat session, mockups D-refined + satellite-feed sketch)
**Scope:** visual/interaction redesign of the two top-level screens only. No backend,
database, or scratch-agent changes. Inner sections (Recovery, Reflect, Plan, Life,
Invest) keep their current look until their own design passes.

## Concept

The app is a futuristic spy-agency golf HUD. Scratch is "agent scratch" — a field
operative who is also your caddie. The home page is agency HQ (mission briefing +
scorecard); the course page is a live satellite feed of TPC Sawgrass No. 16 with
the five app sections as tappable target markers. Golf language and spy language
blend everywhere ("streak day 12 secure", "one shot left on today's card").

Decisions made during brainstorming:

- Style direction: "Field ops HUD" (terminal green on near-black) with golf
  furniture (scorecard, yardage-book stats, wind call) — NOT clubhouse luxe.
- The golf hole imagery and the "TPC Sawgrass · no. 16" label appear ONLY on the
  course page. Home has no hole photo and no TPC label.
- Course page keeps the REAL aerial photo underneath, with the live HUD layered
  on top (targets, dashed path, plates, grain). Not a drawn vector map.
- The traveling golf ball is REMOVED entirely (no "you are here" dot).
- Course navigation is tap-first and drag-based; the old swipe-to-step model and
  ball-travel animation are removed.
- HUD screens are always dark; no light variant. `useColorScheme` is ignored on
  these two screens only.
- Delivery: two PRs off main — PR A (home), PR B (course).

## 1. Field kit (shared visual language)

New scene-level token set (pattern: like `SCENE_COLORS` in `constants/hole.ts`,
these are sanctioned literal colors, not `useTheme()` tokens, because the HUD is
always dark):

- `HUD_COLORS` in a new `constants/hud.ts`:
  - `bg: '#071410'` (page), `panel: '#04241b'` (raised panel)
  - `line: '#0F6E56'` (hairline borders), `lineBright: '#1D9E75'`
  - `mint: '#5DCAA5'` (primary accent / active), `mintSoft: '#9FE1CB'` (secondary text)
  - `text: '#E1F5EE'` (primary text), `amber: '#FAC775'` (needs-attention / open items)
- Monospace HUD font: `@expo-google-fonts/jetbrains-mono` (JS-only package,
  loads via the already-installed `expo-font`; no native rebuild, runs in Expo
  Go). HUD labels/numbers use mono; Scratch's briefing body text uses mono too
  (terminal voice). Until the font loads, system mono is the fallback.
- Effects kit (new `components/hud/` primitives, Reanimated + Skia, all respecting
  `useReducedMotion`):
  - `GlowBox` — panel with soft outer glow on its border (Skia shadow or layered
    translucent strokes; must stay cheap).
  - `Typewriter` — text that types in character-by-character (used for the daily
    read). Reduced motion: render instantly.
  - `ScanGrain` — very subtle animated grain/scanline overlay for imagery.
  - `RadarSweep` — brief rotating sweep flash used when queries refetch.

## 2. Home page — Agency HQ (`app/(tabs)/index.tsx` + `components/scratch/`)

Keeps: all data hooks (`useDailyRead`, `useScratchMessages`, `useSendToScratch`,
habit hooks), ChatSheet logic, ToggleBar navigation, safe-area handling.
Replaces: all presentation.

Layout top to bottom:

1. **Header row** — `field unit SCR-16` (left), date `thu 07.09 · 14:52` and a
   `clearance: scratch` chip (right). Pure static/derived text.
2. **Briefing card** (GlowBox) — mascot avatar in a framed square, name line
   `agent scratch · caddie`, status `on your bag · channel secure`. Below: the
   Daily Read as `the read: …` rendered with Typewriter. Loading state:
   `decrypting today's read…`; error/not-deployed state keeps current graceful
   copy, restyled.
3. **Stat chips row** (3 chips):
   - `days clean` — max recovery-habit streak from existing `lib/streaks.ts` data.
   - `today's card` — `done/total` habits today from habit logs.
   - `vs. last week` — (habits done in last 7 days) − (done in the 7 days before);
     shown golf-style (negative is good: under par), amber when positive/over.
   Computation lives in a pure helper `lib/hudStats.ts` (unit-tested).
4. **Scorecard list** — `// the course — 5 holes`: five rows (1 · recovery …
   5 · invest), each an easy-tap row navigating to its section route (same routes
   as `STOPS` in `constants/hole.ts`). Right-side status readout:
   - recovery: `secure · day N` (mint) or `attention` (amber) if a habit is open today
   - reflect / plan / life / invest: `standby` (muted) — no fake data; wired up as
     those sections get built.
5. **Chat bar** — `> radio your caddie_` with blinking cursor; opens the existing
   ChatSheet, restyled to HUD (mono font, panel colors, mint user bubbles /
   outlined agent bubbles). Send/typing indicator becomes `scratch is reading
   the green…` in mono.

ToggleBar stays functionally identical, restyled to HUD (labels: `hq` / `course`).

## 3. Course page — satellite feed (`app/(tabs)/course.tsx` + `components/hole/`)

Keeps: `assets/hole16.webp`, `buildHolePath`/`WAYPOINTS` traced fairway,
`lib/courseNav.ts` camera helpers where still useful, route/stop definitions.
Replaces: gesture model, ball, stop preview card presentation.

- **Photo treatment:** the aerial photo gets a deepened/darkened tone (Skia color
  matrix or overlay tint consistent with `HUD_COLORS.bg`), ScanGrain on top, and
  HUD corner brackets. Existing dusk tint logic folds into this (always-dark now).
- **Top plates (small):** left `satellite feed · live` with a pulsing dot; right
  `TPC Sawgrass · no. 16 · par 5`. This is the only place the course/hole name appears.
- **Path:** dashed mint centerline along the traced fairway (subtle glow, slow
  dash-phase animation so it feels alive).
- **Targets:** five reticle markers at the current `STOPS` fractions, each with a
  name plate (`2 · reflect`). Whole reticle+plate is one tap target, minimum 44pt
  in screen space at travel zoom; tapping navigates to the route (both zoom levels).
  Nearest target to screen center renders brighter/full reticle; others dimmer.
- **No ball.** `Flag`, ball drawing, and travel animation code are removed or
  replaced by the target markers.
- **Drag (travel mode):** vertical pan maps 1:1 finger movement → camera position
  along the path (`ballDist` becomes `cameraDist`). On release: decay/momentum with
  gentle deceleration (Reanimated `withDecay`, tuned low), clamped tee↔green.
  No snapping to stops; haptic tick as a target passes screen center.
- **Pinch out → overview:** snaps to a framing that fits the path's bounding box
  (plus margin for plates) edge-to-edge — cropping the photo as needed so there is
  NO letterboxing/dead space, and all five targets are on-screen and tappable.
  Includes the small 1–5 legend panel. Pinch in → back to travel zoom at the
  nearest position. The old fling gestures are removed.
- **Framing math** lives in pure helpers (extend `lib/courseNav.ts`), unit-tested:
  pan→distance mapping, overview fit-with-crop scale/offset, clamping.
- Last-position persistence (`hole.lastStop` key) becomes last camera distance;
  hint overlay copy updates to `drag ↑↓ · tap a target · pinch for overview`.

## 4. Errors, performance, testing, delivery

- No changes to: supabase functions, migrations, `lib/api/*`, auth, or types.
- Photo load failure: existing `SCENE_COLORS.fallback` behavior kept — HUD layers
  render over the flat green.
- All animation respects `useReducedMotion` (instant text, no sweeps, no decay).
- Performance guardrails: grain/glow implemented as cheap Skia layers; if a device
  chokes, effects degrade to static (constants gate them).
- Tests: extend vitest suites for `lib/hudStats.ts` and the new courseNav framing
  math. `npx tsc --noEmit` and `npm test` must pass before each PR.
- Manual phone checklist per PR (Expo Go): home renders, typewriter read, chat
  works, all 5 scorecard rows navigate; course drags smoothly both directions,
  tap enters sections at both zooms, overview has zero dead space, haptics fire.
- **PR A:** field kit + home page. **PR B:** course page. Both branch off main
  (after PR #2 merges).

## Out of scope (future passes)

- Content Creation section (separate brainstorm/spec — next project).
- Section-by-section interior redesigns.
- Scratch reply streaming/speed work beyond the already-deployed model switch.
