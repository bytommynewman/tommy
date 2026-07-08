# Golf-Hole Home Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom tab bar with a photorealistic, draggable rendering of TPC Sawgrass hole 16 — the user drags a golf ball along the real fairway (aerial photo) and taps preview cards at five stops to enter the app's five sections.

**Architecture:** A Skia canvas draws a bundled aerial photo of the real hole (~2.5 screens tall) under a camera transform driven by Reanimated shared values. The ball is constrained to a Catmull-Rom path traced over the photo; pure geometry lives in `lib/holePath.ts`, scene data in `constants/hole.ts`. The root `Tabs` navigator becomes a `Stack`; sections push as modal-style cards.

**Tech Stack:** Expo SDK 54 (Expo Go — no dev client), expo-router 6, react-native-gesture-handler ~2.28.0, react-native-reanimated ~4.1.1 (+ react-native-worklets 0.5.1), @shopify/react-native-skia 2.2.12, expo-haptics ~15.0.8, sharp (devDependency, build-time only), vitest (devDependency).

**Spec:** `docs/superpowers/specs/2026-07-08-home-golf-navigation-design.md`

## Global Constraints

- App runs in **Expo Go** on iPhone — only Expo Go-bundled native modules. Install native deps with `npx expo install` (never plain `npm install`), which pins the SDK 54 versions listed above.
- TypeScript strict mode; verify every task with `npx tsc --noEmit` (no test/lint scripts exist beyond the vitest script Task 2 adds).
- UI chrome (cards, flags, hint, text) uses `useTheme()` tokens from `constants/theme.ts` — never hardcoded colors. Skia scene colors (fallback green, dusk tint, ball) are the one sanctioned exception and live in `constants/hole.ts`.
- No new Supabase tables, migrations, or `lib/api/*` functions. The only persistence is AsyncStorage keys `hole.lastStop` and `hole.hintDismissed`.
- Imagery attribution string (exact copy): `Hole imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community` — shown in Settings.
- Section screens' internal content is out of scope — only the shell/headers around them change.
- After installing native deps, start Metro once with `npx expo start -c` (clear cache) before judging runtime errors.
- Commit after every task; the repo has two commits (`abfc3cb` spec, `54dbd32` baseline) and no remote.

---

### Task 1: Install dependencies and gesture root

**Files:**
- Modify: `package.json` (via `npx expo install` / `npm install -D`)
- Modify: `app/_layout.tsx`

**Interfaces:**
- Produces: `GestureHandlerRootView` at the app root (required before any `GestureDetector` mounts); all five runtime libraries available to later tasks.

- [ ] **Step 1: Install the runtime dependencies**

```bash
cd /Users/tommynewman/Desktop/coding-projects/my-first-project
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets @shopify/react-native-skia expo-haptics
```

Expected: `package.json` gains `react-native-gesture-handler: ~2.28.0`, `react-native-reanimated: ~4.1.1`, `react-native-worklets: 0.5.1`, `@shopify/react-native-skia: 2.2.12`, `expo-haptics: ~15.0.8`. Do **not** edit `babel.config.js` — `babel-preset-expo` on SDK 54 auto-configures the worklets Babel plugin when `react-native-worklets` is present.

- [ ] **Step 2: Wrap the app root in GestureHandlerRootView**

In `app/_layout.tsx`, add the import and wrap the existing tree:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

and change `RootLayout` to:

```tsx
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verify types and boot**

```bash
npx tsc --noEmit
```
Expected: no errors.

```bash
npx expo start -c
```
Open in Expo Go. Expected: app boots to the Today screen with **no** red error screen and **no** `[Reanimated]` warning in the Metro logs. (If Metro complains about worklets/babel, stop — that contradicts the SDK 54 assumption; check `babel-preset-expo` version before improvising.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/_layout.tsx
git commit -m "feat: add gesture-handler, reanimated, skia, haptics; gesture root"
```

---

### Task 2: Path geometry library (`lib/holePath.ts`) with vitest

**Files:**
- Modify: `package.json` (add vitest + test script)
- Create: `lib/holePath.ts`
- Test: `lib/__tests__/holePath.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 4, 6):
  - `type Vec = { x: number; y: number }`
  - `type HolePath = { pts: Vec[]; cum: number[]; total: number }`
  - `buildHolePath(waypoints: Vec[], samplesPerSegment?: number): HolePath` — JS-thread only
  - `pointAtDistance(path: HolePath, d: number): Vec` — worklet-safe
  - `projectToPath(path: HolePath, p: Vec): number` — worklet-safe, returns distance along path
  - `nearestStop(stopDists: number[], d: number): { index: number; gap: number }` — worklet-safe
  - `clamp(v: number, lo: number, hi: number): number` — worklet-safe

- [ ] **Step 1: Add vitest**

```bash
npm install -D vitest
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing tests**

Create `lib/__tests__/holePath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildHolePath, pointAtDistance, projectToPath, nearestStop, clamp } from '../holePath';

// A straight horizontal line from (0,0) to (100,0).
const line = buildHolePath([{ x: 0, y: 0 }, { x: 100, y: 0 }]);

describe('buildHolePath', () => {
  it('measures a straight line accurately', () => {
    expect(line.total).toBeGreaterThan(99);
    expect(line.total).toBeLessThan(101);
    expect(line.cum[0]).toBe(0);
    expect(line.cum[line.cum.length - 1]).toBeCloseTo(line.total, 6);
  });

  it('a bent path is longer than the straight-line distance between its endpoints', () => {
    const bent = buildHolePath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
    const straight = Math.hypot(100, 100);
    expect(bent.total).toBeGreaterThan(straight);
  });
});

describe('pointAtDistance', () => {
  it('returns the midpoint of a straight line at half distance', () => {
    const p = pointAtDistance(line, line.total / 2);
    expect(p.x).toBeCloseTo(50, 0);
    expect(Math.abs(p.y)).toBeLessThan(1);
  });

  it('clamps below zero to the start', () => {
    const p = pointAtDistance(line, -50);
    expect(p.x).toBeCloseTo(0, 6);
  });

  it('clamps beyond the end to the end', () => {
    const p = pointAtDistance(line, line.total + 50);
    expect(p.x).toBeCloseTo(100, 0);
  });
});

describe('projectToPath', () => {
  it('projects a point beside the line onto the nearest spot', () => {
    const d = projectToPath(line, { x: 30, y: 25 });
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(35);
  });

  it('projects a point past the end onto the end', () => {
    const d = projectToPath(line, { x: 500, y: 0 });
    expect(d).toBeCloseTo(line.total, 0);
  });
});

describe('nearestStop', () => {
  const stops = [0, 50, 100];
  it('finds the nearest stop and gap', () => {
    expect(nearestStop(stops, 40)).toEqual({ index: 1, gap: 10 });
    expect(nearestStop(stops, 4)).toEqual({ index: 0, gap: 4 });
    expect(nearestStop(stops, 98)).toEqual({ index: 2, gap: 2 });
  });
});

describe('clamp', () => {
  it('clamps both ends', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module '../holePath'` (or equivalent resolve error).

- [ ] **Step 4: Implement `lib/holePath.ts`**

```ts
// Pure geometry for the golf-hole path: a Catmull-Rom spline through traced
// waypoints, sampled into a polyline with an arc-length lookup table.
// No React imports (same convention as lib/streaks.ts). Functions carrying a
// 'worklet' directive run on the UI thread inside Reanimated worklets — keep
// them free of closures over JS-thread-only objects.

export type Vec = { x: number; y: number };

export type HolePath = {
  pts: Vec[]; // sampled points along the spline, scene px
  cum: number[]; // cumulative arc length at each point; cum[0] === 0
  total: number; // total path length
};

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (p2.x - p0.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (p2.y - p0.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
  };
}

// Built once on the JS thread; the returned plain object is safely captured
// by worklets (arrays of numbers/objects serialize fine).
export function buildHolePath(waypoints: Vec[], samplesPerSegment = 40): HolePath {
  if (waypoints.length < 2) throw new Error('buildHolePath needs at least 2 waypoints');
  // Duplicate the endpoints so the spline passes through them.
  const w = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const pts: Vec[] = [];
  for (let seg = 0; seg < w.length - 3; seg++) {
    const last = seg === w.length - 4;
    const n = last ? samplesPerSegment + 1 : samplesPerSegment; // include t=1 only on the final segment
    for (let i = 0; i < n; i++) {
      pts.push(catmullRom(w[seg], w[seg + 1], w[seg + 2], w[seg + 3], i / samplesPerSegment));
    }
  }
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, total: cum[cum.length - 1] };
}

export function pointAtDistance(path: HolePath, d: number): Vec {
  'worklet';
  const dd = clamp(d, 0, path.total);
  // Linear scan is fine: ~300 samples at 60fps is trivial.
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < dd) i++;
  const d0 = path.cum[i - 1];
  const d1 = path.cum[i];
  const t = d1 === d0 ? 0 : (dd - d0) / (d1 - d0);
  const a = path.pts[i - 1];
  const b = path.pts[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function projectToPath(path: HolePath, p: Vec): number {
  'worklet';
  let best = 0;
  let bestSq = Infinity;
  for (let i = 0; i < path.pts.length; i++) {
    const dx = path.pts[i].x - p.x;
    const dy = path.pts[i].y - p.y;
    const sq = dx * dx + dy * dy;
    if (sq < bestSq) {
      bestSq = sq;
      best = i;
    }
  }
  return path.cum[best];
}

export function nearestStop(stopDists: number[], d: number): { index: number; gap: number } {
  'worklet';
  let index = 0;
  let gap = Math.abs(stopDists[0] - d);
  for (let i = 1; i < stopDists.length; i++) {
    const g = Math.abs(stopDists[i] - d);
    if (g < gap) {
      gap = g;
      index = i;
    }
  }
  return { index, gap };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test && npx tsc --noEmit
```
Expected: all tests PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/holePath.ts lib/__tests__/holePath.test.ts
git commit -m "feat: hole path geometry (catmull-rom + arc-length LUT) with vitest"
```

---

### Task 3: Aerial photo asset of the real hole 16

**Files:**
- Create: `scripts/stitch-hole16.mjs`
- Create: `assets/hole16.webp` (generated)
- Modify: `.gitignore` (ignore the inspection PNG)
- Modify: `package.json` (sharp devDependency)

**Interfaces:**
- Produces: `assets/hole16.webp` — portrait aerial photo, tee at bottom, green at top, width 1200px, height ≈ 2600–3200px. The script prints the exact final `width x height`; Task 4 copies those numbers into `SCENE`.

- [ ] **Step 1: Install sharp (build-time only)**

```bash
npm install -D sharp
```

- [ ] **Step 2: Ignore the inspection image**

Append to `.gitignore`:

```
# stitch-hole16 inspection output
scripts/hole16-rotated.png
```

- [ ] **Step 3: Write the stitch script**

Create `scripts/stitch-hole16.mjs`:

```js
// One-time build script: fetches Esri World Imagery tiles of TPC Sawgrass
// hole 16, stitches them, rotates/crops to a portrait framing (tee at the
// bottom, green at the top), and writes assets/hole16.webp.
// Run: node scripts/stitch-hole16.mjs
// Iterate: inspect scripts/hole16-rotated.png, adjust CONFIG, re-run.
import sharp from 'sharp';

const CONFIG = {
  zoom: 19,
  // Starting bbox around the 16/17 hole complex at TPC Sawgrass Stadium
  // Course (Ponte Vedra Beach, FL). Landmark: 17's island green is the
  // unmistakable small round green surrounded by water; 16's green sits just
  // left (west) of it on the same lake, and 16's par-5 fairway runs up from
  // the southwest with the lake on the right of the approach.
  latMin: 30.1922,
  latMax: 30.1988,
  lonMin: -81.4008,
  lonMax: -81.3928,
  // Degrees clockwise. Adjust until the tee is at the bottom and the green
  // at the top of scripts/hole16-rotated.png.
  rotateDeg: 0,
  // After rotation looks right, set a portrait crop (aspect between 1:2.2
  // and 1:2.7) tightly framing the hole, e.g. { left: 600, top: 200, width: 1400, height: 3400 }.
  crop: null,
  outWidth: 1200,
};

const TILE = 256;
const tileUrl = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

async function main() {
  const { zoom, latMin, latMax, lonMin, lonMax } = CONFIG;
  const x0 = Math.floor(lonToX(lonMin, zoom));
  const x1 = Math.floor(lonToX(lonMax, zoom));
  const y0 = Math.floor(latToY(latMax, zoom)); // note: y grows southward
  const y1 = Math.floor(latToY(latMin, zoom));
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  console.log(`Fetching ${cols}x${rows} = ${cols * rows} tiles at z${zoom}...`);

  const composites = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const res = await fetch(tileUrl(zoom, x, y));
      if (!res.ok) throw new Error(`tile ${x},${y}: HTTP ${res.status}`);
      composites.push({
        input: Buffer.from(await res.arrayBuffer()),
        left: (x - x0) * TILE,
        top: (y - y0) * TILE,
      });
    }
  }

  let buf = await sharp({
    create: { width: cols * TILE, height: rows * TILE, channels: 3, background: '#000' },
  })
    .composite(composites)
    .png()
    .toBuffer();

  if (CONFIG.rotateDeg) {
    buf = await sharp(buf).rotate(CONFIG.rotateDeg, { background: '#000' }).toBuffer();
  }
  await sharp(buf).png().toFile('scripts/hole16-rotated.png');
  console.log('Inspection image: scripts/hole16-rotated.png');

  if (!CONFIG.crop) {
    console.log('CONFIG.crop not set — inspect the PNG, set rotateDeg/crop, re-run.');
    return;
  }
  buf = await sharp(buf).extract(CONFIG.crop).toBuffer();
  const info = await sharp(buf)
    .resize({ width: CONFIG.outWidth })
    .webp({ quality: 82 })
    .toFile('assets/hole16.webp');
  console.log(`assets/hole16.webp: ${info.width}x${info.height} (${Math.round(info.size / 1024)} KB)`);
  console.log('>>> Copy these dimensions into SCENE in constants/hole.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: Run, inspect, iterate**

```bash
node scripts/stitch-hole16.mjs
open scripts/hole16-rotated.png
```

Iterate on `CONFIG` until correct:
1. Find 17's island green in the image (small round green fully ringed by water). Hole 16's green is the one immediately west of it on the same lake; trace its par-5 fairway back southwest to the tee boxes.
2. If the hole isn't fully inside the image, widen the bbox and re-run.
3. Set `rotateDeg` so the hole runs bottom (tee) → top (green).
4. Set `crop` to a tight portrait framing (~1:2.2–1:2.7 aspect) with modest margins of rough/trees around the fairway; re-run.

Expected final run output: `assets/hole16.webp: 1200x<H>` where `<H>` is between 2600 and 3300, file size well under 3 MB. Open `assets/hole16.webp` and confirm: real grass/water/sand photo, tee bottom, green top, lake on the right side of the upper half. **Record the printed `width x height` for Task 4.**

- [ ] **Step 5: Commit**

```bash
git add scripts/stitch-hole16.mjs assets/hole16.webp .gitignore package.json package-lock.json
git commit -m "feat: stitched aerial photo of TPC Sawgrass 16 + build script"
```

---

### Task 4: Hole configuration (`constants/hole.ts`)

**Files:**
- Create: `constants/hole.ts`

**Interfaces:**
- Consumes: `Vec` from `lib/holePath.ts`; asset dimensions printed by Task 3.
- Produces (consumed by Tasks 5–9):
  - `SCENE: { width: number; height: number }` — the image's pixel dimensions
  - `HOLE_IMAGE` — the `require`d asset
  - `WAYPOINTS: Vec[]` — fairway centerline in scene px
  - `type HoleStop = { frac: number; route: Href; label: string; icon: keyof typeof Ionicons.glyphMap; tagline: string }`
  - `STOPS: HoleStop[]` — 5 stops, `frac` = fraction of total path length
  - `BALL_RADIUS`, `STOP_NEAR_THRESHOLD`, `CAMERA_ZOOM`, `DRAG_ZOOM_BOOST`: numbers
  - `SCENE_COLORS: { fallback: string; duskTint: string; ball: string; ballShadow: string }`
  - `LAST_STOP_KEY`, `HINT_DISMISSED_KEY`: strings
  - `SHOW_PATH_DEBUG: boolean`

- [ ] **Step 1: Write `constants/hole.ts`**

Replace `width: 1200, height: 3000` below with the **actual dimensions printed by Task 3** (width will be 1200; height varies with the crop).

```ts
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Vec } from '../lib/holePath';

// The aerial photo's pixel dimensions — MUST match assets/hole16.webp
// (printed by scripts/stitch-hole16.mjs). All scene math is in image px.
export const SCENE = { width: 1200, height: 3000 };

export const HOLE_IMAGE = require('../assets/hole16.webp');

// Fairway centerline traced over the photo, tee (bottom) → green (top),
// normalized 0–1. Starting estimate — tune with SHOW_PATH_DEBUG=true until
// the red line hugs the fairway in the actual photo.
const NORM_WAYPOINTS: Vec[] = [
  { x: 0.42, y: 0.94 }, // tee boxes
  { x: 0.4, y: 0.8 },
  { x: 0.42, y: 0.66 },
  { x: 0.48, y: 0.52 }, // fairway bunker zone
  { x: 0.55, y: 0.4 },
  { x: 0.6, y: 0.28 }, // approach, lake right
  { x: 0.62, y: 0.17 },
  { x: 0.58, y: 0.08 }, // green
];

export const WAYPOINTS: Vec[] = NORM_WAYPOINTS.map((p) => ({
  x: p.x * SCENE.width,
  y: p.y * SCENE.height,
}));

export type HoleStop = {
  frac: number; // position along the path as a fraction of total length
  route: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tagline: string;
};

export const STOPS: HoleStop[] = [
  { frac: 0.0, route: '/recovery', label: 'Recovery', icon: 'shield-checkmark-outline', tagline: 'Habits, streaks, staying on track' },
  { frac: 0.27, route: '/reflect', label: 'Reflect', icon: 'book-outline', tagline: 'Journal and therapist chat' },
  { frac: 0.52, route: '/plan', label: 'Plan', icon: 'calendar-outline', tagline: 'Calendar, goals, and content' },
  { frac: 0.78, route: '/life', label: 'Life', icon: 'body-outline', tagline: 'Fitness and people' },
  { frac: 1.0, route: '/invest', label: 'Invest', icon: 'trending-up-outline', tagline: 'Portfolio, watchlist, markets' },
];

export const BALL_RADIUS = 14; // scene px
export const STOP_NEAR_THRESHOLD = 90; // scene px along the path
export const CAMERA_ZOOM = 1.15; // scene fills 115% of screen width
export const DRAG_ZOOM_BOOST = 1.06; // extra zoom while a drag is active

// Scene rendering colors (the sanctioned exception to theme tokens — these
// sit over a photo, not over themed UI).
export const SCENE_COLORS = {
  fallback: '#3E7355', // fairway green shown if the photo fails to load/decode
  duskTint: 'rgba(10, 14, 34, 0.38)', // dark-mode twilight overlay
  ball: '#FFFFFF',
  ballShadow: 'rgba(0,0,0,0.45)',
};

export const LAST_STOP_KEY = 'hole.lastStop';
export const HINT_DISMISSED_KEY = 'hole.hintDismissed';

// Dev aid: draws the centerline + waypoints in red over the photo.
export const SHOW_PATH_DEBUG = false;
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```
Expected: no errors. (Typed routes: `/recovery` etc. are valid `Href` values because the route groups exist.)

- [ ] **Step 3: Commit**

```bash
git add constants/hole.ts
git commit -m "feat: hole 16 scene config — waypoints, stops, camera constants"
```

---

### Task 5: HoleScene Skia canvas + first render on the home screen

**Files:**
- Create: `components/hole/HoleScene.tsx`
- Modify: `app/(tabs)/index.tsx` (full rewrite — old Today content returns in Task 8)

**Interfaces:**
- Consumes: `SCENE`, `HOLE_IMAGE`, `SCENE_COLORS`, `BALL_RADIUS`, `SHOW_PATH_DEBUG` (Task 4); `HolePath`, `Vec` (Task 2).
- Produces: `HoleScene` component with props `{ width: number; height: number; ballPos: DerivedValue<Vec>; tx: DerivedValue<number>; ty: DerivedValue<number>; scale: DerivedValue<number>; scheme: 'light' | 'dark'; path: HolePath }` — consumed by Task 6's rewrite of `index.tsx` and never changed after. (`DerivedValue<T>` = `Readonly<SharedValue<T>>`; plain mutable `SharedValue`s are assignable to it, so Task 5's static screen and Task 6's derived camera both fit.)

- [ ] **Step 1: Write `components/hole/HoleScene.tsx`**

```tsx
import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  Path as SkiaPath,
  Shadow,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';
import type { HolePath, Vec } from '../../lib/holePath';
import {
  BALL_RADIUS,
  HOLE_IMAGE,
  SCENE,
  SCENE_COLORS,
  SHOW_PATH_DEBUG,
} from '../../constants/hole';

// DerivedValue<T> is Readonly<SharedValue<T>> — accepts both plain shared
// values (Task 5's static camera) and derived ones (useHoleDrag's camera).
type HoleSceneProps = {
  width: number; // screen px
  height: number;
  ballPos: DerivedValue<Vec>; // scene px
  tx: DerivedValue<number>; // camera translate, screen px
  ty: DerivedValue<number>;
  scale: DerivedValue<number>; // screen px per scene px
  scheme: 'light' | 'dark';
  path: HolePath;
};

export function HoleScene({ width, height, ballPos, tx, ty, scale, scheme, path }: HoleSceneProps) {
  const image = useImage(HOLE_IMAGE);

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);
  const ballCx = useDerivedValue(() => ballPos.value.x);
  const ballCy = useDerivedValue(() => ballPos.value.y);

  const debugPath = useMemo(() => {
    if (!SHOW_PATH_DEBUG) return null;
    const p = Skia.Path.Make();
    p.moveTo(path.pts[0].x, path.pts[0].y);
    for (const pt of path.pts) p.lineTo(pt.x, pt.y);
    return p;
  }, [path]);

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <Group transform={transform}>
          <SkiaImage image={image} x={0} y={0} width={SCENE.width} height={SCENE.height} fit="fill" />
          {debugPath ? (
            <SkiaPath path={debugPath} color="red" style="stroke" strokeWidth={4} />
          ) : null}
          <Circle cx={ballCx} cy={ballCy} r={BALL_RADIUS} color={SCENE_COLORS.ball}>
            <Shadow dx={0} dy={3} blur={6} color={SCENE_COLORS.ballShadow} />
          </Circle>
        </Group>
      ) : (
        // Loading OR decode failure: plain fairway green so the screen (and,
        // after Task 6, navigation) still works.
        <Fill color={SCENE_COLORS.fallback} />
      )}
      {scheme === 'dark' ? <Fill color={SCENE_COLORS.duskTint} /> : null}
    </Canvas>
  );
}
```

- [ ] **Step 2: Rewrite `app/(tabs)/index.tsx` as a static first render**

Replace the entire file (temporary static camera pinned to the tee; Task 6 replaces this file again with the interactive version):

```tsx
import React, { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { HoleScene } from '../../components/hole/HoleScene';
import { useTheme } from '../../lib/theme';
import { buildHolePath, clamp, pointAtDistance } from '../../lib/holePath';
import { CAMERA_ZOOM, SCENE, WAYPOINTS } from '../../constants/hole';

export default function HoleScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);

  const s = (width / SCENE.width) * CAMERA_ZOOM;
  const tee = pointAtDistance(path, 0);
  const ballPos = useSharedValue(tee);
  const scale = useSharedValue(s);
  const tx = useSharedValue(clamp(width / 2 - tee.x * s, width - SCENE.width * s, 0));
  const ty = useSharedValue(clamp(height * 0.55 - tee.y * s, height - SCENE.height * s, 0));

  return (
    <View style={{ flex: 1 }}>
      <HoleScene
        width={width}
        height={height}
        ballPos={ballPos}
        tx={tx}
        ty={ty}
        scale={scale}
        scheme={scheme}
        path={path}
      />
    </View>
  );
}
```

- [ ] **Step 3: Verify in Expo Go — and tune the traced path**

```bash
npx tsc --noEmit && npx expo start
```

Expected on the Today tab: the real aerial photo, zoomed to the bottom (tee) area, with a white ball sitting on it. Dark-mode device → dusk-tinted photo.

Now set `SHOW_PATH_DEBUG = true` in `constants/hole.ts` and reload. Temporarily change `ty`'s initializer to `useSharedValue(0)` to see the top of the hole, and adjust `NORM_WAYPOINTS` in `constants/hole.ts` until the red line follows the fairway centerline tee→green in the photo (nudge values by 0.01–0.03 per iteration; Fast Refresh applies each save). When it hugs the fairway, restore `ty`'s initializer and set `SHOW_PATH_DEBUG = false`.

- [ ] **Step 4: Commit**

```bash
git add components/hole/HoleScene.tsx "app/(tabs)/index.tsx" constants/hole.ts
git commit -m "feat: Skia hole scene renders aerial photo with camera transform"
```

---

### Task 6: Drag gesture, camera follow, and snapping (`useHoleDrag`)

**Files:**
- Create: `components/hole/useHoleDrag.ts`
- Modify: `app/(tabs)/index.tsx` (full rewrite — this is the final overall structure; Tasks 7–9 only add to it)

**Interfaces:**
- Consumes: geometry (Task 2), config (Task 4), `HoleScene` (Task 5).
- Produces: `useHoleDrag(screenW: number, screenH: number, opts?: { onDragEnd?: () => void })` returning:
  - `path: HolePath`, `stopDists: number[]`
  - `ballPos: SharedValue<Vec>` (derived), `tx`, `ty`, `scale`: `SharedValue<number>`
  - `gesture: PanGesture`
  - `activeStop: number | null` (React state — stop the ball is currently near)
  - `goToStop(index: number): void` (animates the ball along the path)
  - `setBallInstant(index: number): void` (no animation — used for restore-on-mount)
  Tasks 7–9 rely on these exact names.

- [ ] **Step 1: Write `components/hole/useHoleDrag.ts`**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  buildHolePath,
  clamp,
  nearestStop,
  pointAtDistance,
  projectToPath,
} from '../../lib/holePath';
import {
  CAMERA_ZOOM,
  DRAG_ZOOM_BOOST,
  SCENE,
  STOPS,
  STOP_NEAR_THRESHOLD,
  WAYPOINTS,
} from '../../constants/hole';

export function useHoleDrag(
  screenW: number,
  screenH: number,
  opts?: { onDragEnd?: () => void }
) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const reduceMotion = useReducedMotion();

  const baseScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const ballDist = useSharedValue(0);
  const scale = useSharedValue(baseScale);

  const ballPos = useDerivedValue(() => pointAtDistance(path, ballDist.value));
  // Camera keeps the ball horizontally centered and slightly below the
  // vertical midpoint (traveling "up" the hole reads better with the ball low).
  const tx = useDerivedValue(() =>
    clamp(screenW / 2 - ballPos.value.x * scale.value, screenW - SCENE.width * scale.value, 0)
  );
  const ty = useDerivedValue(() =>
    clamp(screenH * 0.55 - ballPos.value.y * scale.value, screenH - SCENE.height * scale.value, 0)
  );

  const [activeStop, setActiveStop] = useState<number | null>(0);

  const onStopChange = useCallback((index: number) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, ballDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr);
    }
  );

  const onDragEnd = opts?.onDragEnd;
  const notifyDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          if (!reduceMotion) {
            scale.value = withTiming(baseScale * DRAG_ZOOM_BOOST, { duration: 250 });
          }
        })
        .onChange((e) => {
          // Finger position (screen px) → scene px → distance along the path.
          const sceneP = {
            x: (e.x - tx.value) / scale.value,
            y: (e.y - ty.value) / scale.value,
          };
          ballDist.value = projectToPath(path, sceneP);
        })
        .onEnd(() => {
          const n = nearestStop(stopDists, ballDist.value);
          ballDist.value = reduceMotion
            ? stopDists[n.index]
            : withSpring(stopDists[n.index], { damping: 18, stiffness: 120 });
          runOnJS(notifyDragEnd)();
        })
        .onFinalize(() => {
          if (!reduceMotion) {
            scale.value = withTiming(baseScale, { duration: 250 });
          }
        }),
    [path, stopDists, reduceMotion, baseScale, notifyDragEnd]
  );

  const goToStop = useCallback(
    (index: number) => {
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: 700, easing: Easing.inOut(Easing.cubic) });
    },
    [stopDists, reduceMotion]
  );

  const setBallInstant = useCallback(
    (index: number) => {
      ballDist.value = stopDists[index];
    },
    [stopDists]
  );

  return { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, goToStop, setBallInstant };
}
```

- [ ] **Step 2: Rewrite `app/(tabs)/index.tsx` with the gesture wired in**

Replace the entire file:

```tsx
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { HoleScene } from '../../components/hole/HoleScene';
import { useHoleDrag } from '../../components/hole/useHoleDrag';
import { useTheme } from '../../lib/theme';

export default function HoleScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const { path, ballPos, tx, ty, scale, gesture } = useHoleDrag(width, height);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <HoleScene
            width={width}
            height={height}
            ballPos={ballPos}
            tx={tx}
            ty={ty}
            scale={scale}
            scheme={scheme}
            path={path}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
```

- [ ] **Step 3: Verify in Expo Go**

```bash
npx tsc --noEmit && npx expo start
```

Expected: dragging anywhere moves the ball smoothly **along the fairway curve** (never off it); the camera follows the ball down/up the hole; a slight zoom-in while dragging; on release the ball springs to the nearest of the five stop positions; a soft haptic tick fires as the ball comes near each stop. Drag fast end-to-end — no stutter (all math is worklet-side).

- [ ] **Step 4: Commit**

```bash
git add components/hole/useHoleDrag.ts "app/(tabs)/index.tsx"
git commit -m "feat: path-constrained ball drag with camera follow and stop snapping"
```

---

### Task 7: Flags, preview card, navigation, and last-stop persistence

**Files:**
- Create: `components/hole/Flag.tsx`
- Create: `components/hole/StopPreviewCard.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useHoleDrag` returns (Task 6), `STOPS`/keys (Task 4), existing hooks `useHabits`, `useRelapses` (`lib/hooks/useHabits.ts`), `daysClean` (`lib/streaks.ts`).
- Produces:
  - `Flag`: props `{ stop: HoleStop; scenePos: Vec; tx: DerivedValue<number>; ty: DerivedValue<number>; scale: DerivedValue<number>; active: boolean; onPress: () => void }`
  - `StopPreviewCard`: props `{ stop: HoleStop; stat: string | null; onEnter: () => void }`

- [ ] **Step 1: Write `components/hole/Flag.tsx`**

```tsx
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, type DerivedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Vec } from '../../lib/holePath';
import type { HoleStop } from '../../constants/hole';
import { useTheme } from '../../lib/theme';

const FLAG_SIZE = 34;

type FlagProps = {
  stop: HoleStop;
  scenePos: Vec; // stop position in scene px (static)
  tx: DerivedValue<number>;
  ty: DerivedValue<number>;
  scale: DerivedValue<number>;
  active: boolean;
  onPress: () => void;
};

export function Flag({ stop, scenePos, tx, ty, scale, active, onPress }: FlagProps) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: scenePos.x * scale.value + tx.value - FLAG_SIZE / 2 },
      // Anchor the chip just above the spot on the course it marks.
      { translateY: scenePos.y * scale.value + ty.value - FLAG_SIZE - 6 },
      { scale: withSpring(active ? 1.2 : 1) },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Go to ${stop.label}`}
        style={{
          width: FLAG_SIZE,
          height: FLAG_SIZE,
          borderRadius: FLAG_SIZE / 2,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Ionicons name={stop.icon} size={18} color={active ? colors.onPrimary : colors.text} />
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Write `components/hole/StopPreviewCard.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HoleStop } from '../../constants/hole';
import { useTheme } from '../../lib/theme';

type StopPreviewCardProps = {
  stop: HoleStop;
  stat: string | null; // live stat line; null → show the tagline
  onEnter: () => void;
};

export function StopPreviewCard({ stop, stat, onEnter }: StopPreviewCardProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + spacing.lg,
      }}
    >
      <Pressable
        onPress={onEnter}
        accessibilityRole="button"
        accessibilityLabel={`Enter ${stop.label}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={stop.icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>{stop.label}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {stat ?? stop.tagline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Wire flags, card, navigation, and persistence into `app/(tabs)/index.tsx`**

Replace the entire file:

```tsx
import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HoleScene } from '../../components/hole/HoleScene';
import { useHoleDrag } from '../../components/hole/useHoleDrag';
import { Flag } from '../../components/hole/Flag';
import { StopPreviewCard } from '../../components/hole/StopPreviewCard';
import { useTheme } from '../../lib/theme';
import { pointAtDistance } from '../../lib/holePath';
import { LAST_STOP_KEY, STOPS } from '../../constants/hole';
import { useHabits, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

export default function HoleScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, goToStop, setBallInstant } =
    useHoleDrag(width, height);

  // Restore the ball to the last-visited stop (invalid/missing → stays at tee).
  useEffect(() => {
    AsyncStorage.getItem(LAST_STOP_KEY).then((v) => {
      const i = v == null ? NaN : Number(v);
      if (Number.isInteger(i) && i >= 0 && i < STOPS.length) setBallInstant(i);
    });
  }, [setBallInstant]);

  // Live stat per stop; null falls back to the stop's tagline (also covers
  // loading/error — a stat never blocks navigation).
  const { data: habits = [] } = useHabits();
  const { data: relapses = [] } = useRelapses();
  const stats = useMemo<(string | null)[]>(() => {
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery
      .map((h) => daysClean(h, relapses))
      .sort((a, b) => b - a)[0];
    return STOPS.map((s) =>
      s.label === 'Recovery' && best !== undefined && best > 0 ? `${best} days clean` : null
    );
  }, [habits, relapses]);

  const enterStop = (index: number) => {
    AsyncStorage.setItem(LAST_STOP_KEY, String(index));
    router.push(STOPS[index].route);
  };

  const stopScenePos = useMemo(
    () => stopDists.map((d) => pointAtDistance(path, d)),
    [path, stopDists]
  );

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <HoleScene
            width={width}
            height={height}
            ballPos={ballPos}
            tx={tx}
            ty={ty}
            scale={scale}
            scheme={scheme}
            path={path}
          />
        </View>
      </GestureDetector>
      {STOPS.map((stop, i) => (
        <Flag
          key={stop.label}
          stop={stop}
          scenePos={stopScenePos[i]}
          tx={tx}
          ty={ty}
          scale={scale}
          active={activeStop === i}
          onPress={() => goToStop(i)}
        />
      ))}
      {activeStop != null ? (
        <StopPreviewCard
          stop={STOPS[activeStop]}
          stat={stats[activeStop]}
          onEnter={() => enterStop(activeStop)}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Verify in Expo Go**

```bash
npx tsc --noEmit && npx expo start
```

Expected: five flag chips pinned to the course, moving perfectly with the photo as you drag; the chip nearest the ball highlights; a preview card slides up when the ball is near a stop ("Recovery — N days clean" if you have a streak, taglines otherwise); tapping the card opens the section (tab bar is still there — that's fine until Task 10); tapping a distant flag rolls the ball along the fairway to it. Kill and reopen the app: the ball starts at the last stop you entered.

- [ ] **Step 5: Commit**

```bash
git add components/hole/Flag.tsx components/hole/StopPreviewCard.tsx "app/(tabs)/index.tsx"
git commit -m "feat: stop flags, preview card, section navigation, last-stop persistence"
```

---

### Task 8: Today summary card + first-run hint

**Files:**
- Create: `components/hole/TodayCard.tsx`
- Create: `components/hole/HintOverlay.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: existing hooks (`useProfile`, `useHabits`, `useRecentLogs`, `useRelapses`, `useUpsertLog`), `daysClean`, theme; `HINT_DISMISSED_KEY` (Task 4); `onDragEnd` option of `useHoleDrag` (Task 6).
- Produces: `TodayCard` (props: none), `HintOverlay` (props `{ visible: boolean }`).

- [ ] **Step 1: Write `components/hole/TodayCard.tsx`** (the old Today screen, condensed and collapsible)

```tsx
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useHabits, useRecentLogs, useRelapses, useUpsertLog } from '../../lib/hooks/useHabits';
import { useProfile } from '../../lib/hooks/useProfile';
import { daysClean } from '../../lib/streaks';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayCard() {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const { data: profile } = useProfile();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const upsertLog = useUpsertLog();

  const today = format(new Date(), 'yyyy-MM-dd');
  const doneIds = new Set(
    logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
  );
  const remaining = habits.filter((h) => !doneIds.has(h.id));
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';

  const recoveryHabits = habits.filter((h) => h.kind === 'recovery');
  const bestClean = recoveryHabits
    .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
    .sort((a, b) => b.days - a.days)[0];

  const summary =
    habits.length === 0
      ? 'Set up habits in Recovery'
      : remaining.length === 0
        ? 'All done today'
        : `${remaining.length} left today`;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse today summary' : 'Expand today summary'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {greeting()}, {firstName}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{summary}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textFaint}
        />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {bestClean && bestClean.days > 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              {bestClean.days} days clean on {bestClean.habit.name.toLowerCase()} — protect the streak.
            </Text>
          ) : null}
          {habits.map((habit) => {
            const done = doneIds.has(habit.id);
            return (
              <Pressable
                key={habit.id}
                onPress={() =>
                  upsertLog.mutate({
                    habit_id: habit.id,
                    log_date: today,
                    status: done ? 'skipped' : 'done',
                  })
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.xs + 2,
                  gap: spacing.sm,
                }}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={done ? colors.success : colors.textFaint}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                      flex: 1,
                    },
                  ]}
                >
                  {habit.kind === 'recovery'
                    ? `Stay on track — ${habit.name.toLowerCase()}`
                    : habit.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Write `components/hole/HintOverlay.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

export function HintOverlay({ visible }: { visible: boolean }) {
  const { colors, spacing, radii, typography } = useTheme();
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.delay(600)}
      exiting={FadeOut}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '58%',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        }}
      >
        <Ionicons name="arrow-up" size={16} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.text }]}>
          Drag the ball down the fairway
        </Text>
      </View>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Add both to `app/(tabs)/index.tsx`**

Add imports:

```tsx
import { TodayCard } from '../../components/hole/TodayCard';
import { HintOverlay } from '../../components/hole/HintOverlay';
import { HINT_DISMISSED_KEY } from '../../constants/hole';
```

(merge `HINT_DISMISSED_KEY` into the existing `constants/hole` import). Add hint state inside `HoleScreen`, and pass `onDragEnd` to the hook — change the `useHoleDrag(width, height)` call to:

```tsx
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(HINT_DISMISSED_KEY).then((v) => {
      if (v == null) setHintVisible(true);
    });
  }, []);
  const dismissHint = useCallback(() => {
    setHintVisible((visible) => {
      if (visible) AsyncStorage.setItem(HINT_DISMISSED_KEY, '1');
      return false;
    });
  }, []);

  const { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, goToStop, setBallInstant } =
    useHoleDrag(width, height, { onDragEnd: dismissHint });
```

(also add `useState`, `useCallback` to the React import). Then in the JSX, after the `{activeStop != null ? ... : null}` block and before the closing `</View>`, add:

```tsx
      <HintOverlay visible={hintVisible} />
      <TodayCard />
```

- [ ] **Step 4: Verify in Expo Go**

```bash
npx tsc --noEmit && npx expo start
```

Expected: collapsed Today card at the top (greeting + count); tapping expands to the checklist and check-off works; the "Drag the ball down the fairway" pill shows on first launch and disappears permanently after your first drag (kill + reopen to confirm it stays gone). Card and pill don't intercept drags on the course area around them.

- [ ] **Step 5: Commit**

```bash
git add components/hole/TodayCard.tsx components/hole/HintOverlay.tsx "app/(tabs)/index.tsx"
git commit -m "feat: collapsible Today card and first-run drag hint on the hole screen"
```

---

### Task 9: Swap the tab bar for a stack shell + back chevrons + attribution

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (full rewrite)
- Modify: `components/ui/SegmentedTabLayout.tsx`
- Modify: `app/(tabs)/recovery/_layout.tsx`
- Modify: `app/modal/settings.tsx`

**Interfaces:**
- Consumes: everything prior; existing section layouts.
- Produces: tab-bar-free navigation — sections present as modal-style cards over the hole.

- [ ] **Step 1: Rewrite `app/(tabs)/_layout.tsx`**

```tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme';

// The "(tabs)" group name is historical — it's now a stack shell over the
// golf-hole home screen; keeping the folder name avoids churning every route.
export default function HomeShellLayout() {
  const { colors } = useTheme();

  const section = {
    headerShown: false,
    presentation: 'modal' as const, // iOS: swipe-down to dismiss; Android: back gesture/button
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="recovery" options={section} />
      <Stack.Screen name="reflect" options={section} />
      <Stack.Screen name="plan" options={section} />
      <Stack.Screen name="life" options={section} />
      <Stack.Screen name="invest" options={section} />
    </Stack>
  );
}
```

- [ ] **Step 2: Add a back chevron to `components/ui/SegmentedTabLayout.tsx`**

Replace the title `<Text>` block with a row containing a dismiss button:

```tsx
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the course"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      </View>
```

Add the needed imports at the top: `Pressable` (from `react-native`) and `Ionicons` (from `@expo/vector-icons`).

Note: `SegmentedTabLayout` uses `paddingTop: insets.top + spacing.sm` — with `presentation: 'modal'` on iOS the card is inset from the top so the inset is 0 there; the padding still works on Android. No change needed.

- [ ] **Step 3: Add a back chevron to the Recovery stack's index screen**

In `app/(tabs)/recovery/_layout.tsx`, add imports:

```tsx
import { Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
```

and change the index screen registration to:

```tsx
      <Stack.Screen
        name="index"
        options={{
          title: 'Recovery',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to the course"
            >
              <Ionicons name="chevron-down" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
```

- [ ] **Step 4: Add imagery attribution to `app/modal/settings.tsx`**

Inside the existing `<View style={{ gap: spacing.md }}>`, after the `<Button label="Sign out" ... />` line, add:

```tsx
        <Text style={[typography.caption, { color: colors.textFaint }]}>
          Hole imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community
        </Text>
```

- [ ] **Step 5: Verify in Expo Go**

```bash
npx tsc --noEmit && npx expo start
```

Expected: **no tab bar anywhere**. From the hole, entering each of the five sections presents it as a card; every section shows a chevron-down that returns to the hole; iOS swipe-down also dismisses; segmented controls inside sections still switch sub-screens; `new-habit`/`relapse` modals inside Recovery still open; Settings shows the attribution line. The ball sits at the stop you last entered when you return.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/_layout.tsx" components/ui/SegmentedTabLayout.tsx "app/(tabs)/recovery/_layout.tsx" app/modal/settings.tsx
git commit -m "feat: replace tab bar with stack shell; back chevrons and imagery attribution"
```

---

### Task 10: Final polish pass and full manual verification

**Files:**
- Modify: `CLAUDE.md` (architecture note)
- Possibly: small fixes surfaced by verification

**Interfaces:** none new.

- [ ] **Step 1: Update `CLAUDE.md`**

In the **Routing** paragraph of `CLAUDE.md`, replace the sentence describing the `(tabs)` group with:

```
Each former tab (`plan`, `recovery`, `reflect`, `life`, `invest`) is its own route group with a nested `_layout.tsx`, presented as a modal-style card over the home screen. `app/(tabs)/_layout.tsx` is a Stack (not Tabs): the home screen is an interactive golf-hole navigator (`components/hole/`, config in `constants/hole.ts`, geometry in `lib/holePath.ts`, aerial asset regenerated by `scripts/stitch-hole16.mjs`). There is no tab bar.
```

Also update the "no test script" sentence in **Commands** to:

```
`npm test` runs vitest (unit tests for pure lib/ functions only); there is no lint script.
```

- [ ] **Step 2: Full manual verification checklist (Expo Go, physical iPhone)**

Run `npx tsc --noEmit && npm test && npx expo start`, then verify each:

1. Drag tee→green and back: ball stays on the fairway, camera follows, no stutter.
2. Release mid-fairway: ball springs to nearest stop; haptic tick near stops.
3. Preview card: correct label/icon/stat per stop; tap enters the section.
4. Tap each of the five flags from the tee: ball travels the path; card opens.
5. Enter each section; return via chevron-down AND via iOS swipe-down.
6. Kill the app, reopen: ball at last-entered stop; hint pill does not reappear.
7. Today card: expand, check off a habit, confirm it persists into the Recovery section's data.
8. Dark mode (device setting): dusk tint over the photo; cards/flags use dark tokens.
9. Settings → Accessibility → Motion → Reduce Motion ON: drag still works, ball jumps without springs, no zoom pulse.
10. Airplane mode relaunch: photo still renders (bundled asset); preview stats fall back to taglines.

- [ ] **Step 3: Fix anything that failed, re-verify, then commit**

```bash
git add -A
git commit -m "docs: update CLAUDE.md for golf-hole navigation; polish fixes"
```

---

## Self-Review Notes

- **Spec coverage:** photo asset (T3), Skia scene + dusk tint + decode fallback (T5), path-constrained drag + camera + haptics + reduce-motion (T6), preview cards + live stat + tap-to-enter + flag tap-travel + persistence (T7), Today card + hint (T8), stack shell + back chevrons + swipe-down + attribution (T9), CLAUDE.md + full manual checklist (T10). Geometry + tests (T2). Dependencies (T1).
- **Type consistency:** `useHoleDrag` return names (`ballPos`, `tx`, `ty`, `scale`, `gesture`, `activeStop`, `goToStop`, `setBallInstant`) match usage in T7/T8; `HoleStop` fields match `constants/hole.ts`; `Vec`/`HolePath` match T2.
- **Known tuning points (not placeholders):** `NORM_WAYPOINTS`, stop `frac` values, and the stitch `CONFIG` ship with concrete starting values plus an explicit visual tuning procedure (T3 step 4, T5 step 3).
