# Home Screen: Golf-Hole Navigation — Design

**Date:** 2026-07-08
**Status:** Approved
**Scope:** The home screen (a draggable golf-hole navigation hub) and the navigation shell around it. The five destination sections (Recovery, Reflect, Plan, Life, Invest) keep their existing screens and internal layouts untouched; each will be designed separately afterward.

## Summary

The app's home screen becomes an interactive rendering of the 16th hole at TPC Sawgrass. The user drags a golf ball along the fairway; five stops along the hole map to the app's five sections. The bottom tab bar is removed entirely — the hole is the sole navigation hub.

## Decisions made during brainstorming

- **Golf hole fully replaces the tab bar.** No bottom tabs anywhere.
- **Drag reveals a preview card; a tap on the card enters the section.** Release does not auto-navigate.
- **Photorealistic art**: a high-resolution aerial photograph of the real hole, bundled as a static image asset (revised 2026-07-08 from an earlier semi-realistic procedural approach — the user wants it "basically real").
- **TPC Sawgrass hole 16** (par 5: tee → layup zone → fairway bunkers → water's edge → peninsula green, lake down the right side).
- **Ball position persists** — it starts at the last stop visited, stored in AsyncStorage.
- **Return path from a section:** back chevron in the header, plus swipe-down-to-dismiss (modal-style presentation), plus platform back gesture/button.
- **The old "Today" screen content** (greeting, brief, habit checklist) moves into a compact collapsible "Today" summary card docked at the top of the hole screen.

## New dependencies

All included in Expo Go (install with `npx expo install`):

- `react-native-gesture-handler` — pan/tap gestures
- `react-native-reanimated` — UI-thread animation (shared values, springs, worklets)
- `@shopify/react-native-skia` — the scene rendering (aerial image, ball shadow, dark-mode dusk tint, overlay effects)
- `expo-haptics` — soft tick when the ball nears a stop

`react-native-gesture-handler` requires `GestureHandlerRootView` at the app root and `react-native-reanimated` requires its Babel plugin in `babel.config.js`.

## The scene

Top-down aerial photograph of the real Sawgrass #16, roughly **2.5 screens tall** — the whole hole is never visible at once; dragging the ball travels down it.

- **Source imagery:** high-zoom aerial/satellite tiles of the actual hole (Esri World Imagery, which permits use with attribution; a small attribution line appears in the app's settings screen). Tiles are stitched and cropped **at build time** into a single bundled asset (WebP or PNG, sized so the width matches ~2× a typical device width for retina sharpness; target ≤ 2–3 MB). This is a one-time preprocessing step checked into `assets/`; the app never fetches map tiles at runtime.
- **Rendering:** a Skia `Image` drawn on the canvas; the camera transform pans/zooms it. Skia also renders the ball's contact shadow and any overlay effects.
- **Dark mode:** the photo cannot re-tint, so dark mode applies a translucent **dusk tint** overlay (dark blue-grey color filter) — the hole at twilight. UI chrome (cards, flags, hint) still uses `constants/theme.ts` tokens.
- **Optional flourish (build last, cut if it looks off):** a subtle animated specular shimmer masked to the lake area, disabled under Reduce Motion.
- **Flags** — one marker per stop, pinned in image coordinates.

The fairway path and stop positions are defined in the image's coordinate space, so swapping the asset later means re-tracing the path in `constants/hole.ts` only.

## Stops

| # | Location on hole | Section | Route |
|---|---|---|---|
| 1 | Tee box | Recovery | `/recovery` |
| 2 | Layup zone (left fairway) | Reflect | `/reflect` |
| 3 | Fairway bunkers | Plan | `/plan` |
| 4 | Water's-edge approach | Life | `/life` |
| 5 | Peninsula green | Invest | `/invest` |

## Interaction model

- The fairway centerline is a curved path (cubic bézier segments) defined in scene coordinates. The **ball is constrained to this path**: finger position is projected onto the path (via precomputed arc-length samples) and the ball follows the curve — it never cuts across the rough.
- **Camera follow:** the scene translates (with slight zoom) to keep the ball centered as it travels. Camera easing is disabled under Reduce Motion.
- **Near a stop** (within a threshold of the stop's arc-length position): haptic tick, flag animates, and a **preview card** slides up from the bottom showing the section name, icon, and a live stat (see Data below). **Tapping the card navigates** to the section.
- **On release** between stops, the ball springs to the nearest stop.
- **Tapping any flag** animates the ball along the path to that stop and opens its preview card — the accessibility and discoverability fallback (each flag gets an accessibility label + role).
- All gesture math and animation run on the UI thread via Reanimated worklets.
- **First-launch hint:** a one-time "drag the ball down the fairway" overlay, dismissed permanently after the first successful drag (flag stored in AsyncStorage).

## Navigation shell

- The root `Tabs` navigator in `app/(tabs)/_layout.tsx` is replaced with a `Stack`.
- The hole screen is the stack's index route. Each section (`recovery`, `reflect`, `plan`, `life`, `invest`) is pushed as a full-screen card with `presentation: 'modal'`-style behavior: swipe-down dismiss on iOS, back gesture/button on Android, and an always-visible back chevron in each section's header.
- Section groups keep their existing nested `_layout.tsx` files and sub-screens; only the shell around them changes.
- `modal/settings` and `modal/profile` keep working as they do today.
- The ball's last-visited stop is written to AsyncStorage on navigation and read on mount; missing/invalid stored value falls back to the tee (stop 1).

## Today summary card

The current `app/(tabs)/index.tsx` content (greeting, brief lines, habit checklist with check-off, quick stats) is condensed into a collapsible card docked at the top of the hole screen: collapsed shows greeting + "N things left today"; expanded reveals the checklist (habit check-off still works via the existing `useUpsertLog` mutation). It floats above the scene and never blocks the drag area below it.

## Data flow

- Preview-card stats reuse existing TanStack Query hooks: Recovery shows best days-clean (`useHabits` + `useRelapses` + `daysClean`); sections without data layers yet (Reflect, Plan, Life, Invest) show a static tagline.
- Loading or errored queries degrade to the tagline — a stat never blocks navigation.
- No new Supabase tables, migrations, or API functions. The only persistence is two AsyncStorage keys: last-visited stop and first-run-hint-dismissed.

## Code structure

- `constants/hole.ts` — scene dimensions, path control points, stop definitions (arc-length position, route, label, icon, tagline). Pure data; the single file to edit to remap stops or swap holes later.
- `lib/holePath.ts` — pure geometry: bézier evaluation, arc-length sampling/lookup, project-point-to-path, nearest-stop. No React imports (same convention as `lib/streaks.ts`).
- `components/hole/HoleScene.tsx` — the Skia canvas (all scene layers).
- `components/hole/Ball.tsx` — the ball marker + shadow.
- `components/hole/Flag.tsx` — stop markers + tap targets.
- `components/hole/StopPreviewCard.tsx` — the slide-up preview card.
- `components/hole/TodayCard.tsx` — the collapsible Today summary.
- `components/hole/useHoleCamera.ts` — camera translate/zoom derived from ball progress.
- `app/(tabs)/index.tsx` — becomes the hole screen composition; `app/(tabs)/_layout.tsx` — becomes the Stack shell.

## Error handling

- Stored stop index invalid/out of range → tee.
- Query errors on preview stats → tagline fallback, no error UI on the hole itself.
- Reduce Motion → no lake shimmer, no camera easing; drag and tap-to-travel still work.
- Image asset fails to decode (corrupt/missing) → plain fairway-green background so navigation still works.

## Testing

No test runner is configured in the project. `lib/holePath.ts` is kept pure so it is trivially unit-testable when one lands. Type-check with `npx tsc --noEmit`. Behavior verification is manual in Expo Go: drag along the full hole, snap behavior, preview-card tap navigation, flag-tap travel, back/swipe-down return, position persistence across app restarts, light/dark mode, and Reduce Motion.

## Out of scope

- Redesign of any section's internal screens (each gets its own spec later).
- Multiple holes / course selection.
- Sound effects.
- Regenerating `types/database.types.ts` (no schema changes).
