# HUD Course "Satellite Feed" (PR B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the course page as the approved satellite feed — real aerial photo with live HUD overlay, 1:1 drag along the hole, tap-first target markers, no ball, edge-to-edge overview — per `docs/superpowers/specs/2026-07-09-hud-lookfeel-design.md`.

**Architecture:** Keep the traced path/spline machinery (`lib/holePath.ts`, `WAYPOINTS`, `STOPS`) and the Skia scene rendering. Replace the swipe-to-step gesture model with a pan-driven camera (`useSatelliteNav` replaces `useCourseNav`), remove the ball, replace `Flag`/`StopPreviewCard`/`TodayCard` with `TargetMarker` + `FeedChrome` overlays. New pure framing math in `lib/courseNav.ts` (unit-tested).

**Tech Stack:** Reanimated 4 (`withDecay`, derived values), react-native-gesture-handler (Pan/Pinch), @shopify/react-native-skia (photo, dashed path, tint), HUD field kit from PR A.

## Global Constraints

- Branch: `hud-course` (off `hud-lookfeel`); PR B's base is `hud-lookfeel` (GitHub retargets to `main` when PR #3 merges).
- Must run in Expo Go; no new native dependencies.
- HUD colors/font only (`constants/hud.ts`); course page is always dark — remove the `scheme` prop plumbing.
- All animation respects `useReducedMotion()`.
- The old model to delete entirely: ball, swipe-fling stepping, `StopPreviewCard`, `TodayCard` on the course page, snapping-to-stops on release.
- `npx tsc --noEmit` and `npm test` pass after every task; commit per task with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Framing math in `lib/courseNav.ts` (TDD)

**Files:**
- Modify: `lib/courseNav.ts` (add functions; delete `stepStop`, keep `cameraOffset`, `isOverviewZoom`)
- Test: `lib/__tests__/courseNav.test.ts` (extend; delete `stepStop` tests)

**Interfaces:**
- Consumes: `HolePath`, `Vec`, `clamp` from `lib/holePath.ts`.
- Produces (Task 2 consumes):
  - `pathBounds(path: HolePath, margin: number, sceneW: number, sceneH: number): { x: number; y: number; w: number; h: number }` — bounding box of all sampled path points, expanded by `margin`, clamped to the scene rect.
  - `coverScale(screenW: number, screenH: number, bounds: {w: number; h: number}): number` — `Math.max(screenW / bounds.w, screenH / bounds.h)`; fills the screen edge-to-edge (crops the long axis; zero dead space).
  - `centerOffset(screenLen: number, boundStart: number, boundLen: number, scale: number): number` — translate that centers the bounds region: `screenLen / 2 - (boundStart + boundLen / 2) * scale`.
  - `dragDelta(changeY: number, scale: number): number` — finger-to-path-distance mapping for the 1:1 drag: `-changeY / scale` (drag up advances toward the green at the top of the photo).

- [ ] **Step 1: Write the failing tests** (append to `lib/__tests__/courseNav.test.ts`; remove the `stepStop` describe block in the same edit)

```ts
import { centerOffset, coverScale, dragDelta, pathBounds } from '../courseNav';
import { buildHolePath } from '../holePath';

describe('pathBounds', () => {
  it('bounds the path points with margin, clamped to the scene', () => {
    const path = buildHolePath([{ x: 100, y: 50 }, { x: 300, y: 950 }]);
    const b = pathBounds(path, 60, 1200, 1000);
    expect(b.x).toBe(40); // 100 - 60
    expect(b.y).toBe(0); // 50 - 60 clamps to 0
    expect(b.x + b.w).toBe(360); // 300 + 60
    expect(b.y + b.h).toBe(1000); // 950 + 60 clamps to scene height
  });
});

describe('coverScale', () => {
  it('fills the screen on both axes (crops the long one)', () => {
    expect(coverScale(200, 400, { w: 100, h: 100 })).toBe(4); // height dominates
    expect(coverScale(400, 200, { w: 100, h: 100 })).toBe(4); // width dominates
  });
});

describe('centerOffset', () => {
  it('centers the bounds region on screen', () => {
    // bounds 100..300 at scale 2 → center 400 → screen 400 wide → offset -200
    expect(centerOffset(400, 100, 200, 2)).toBe(-200);
  });
});

describe('dragDelta', () => {
  it('maps finger movement 1:1 into path distance against the zoom', () => {
    expect(dragDelta(-30, 2)).toBe(15); // drag up 30 screen px at 2x → +15 scene px
    expect(dragDelta(30, 2)).toBe(-15);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (functions missing). Also expect the removed `stepStop` tests to be gone, not failing.

- [ ] **Step 3: Implement in `lib/courseNav.ts`** (delete `stepStop`; keep `cameraOffset` + `isOverviewZoom` untouched)

```ts
import { clamp, type HolePath } from './holePath';

export function pathBounds(
  path: HolePath,
  margin: number,
  sceneW: number,
  sceneH: number
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of path.pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const x = clamp(minX - margin, 0, sceneW);
  const y = clamp(minY - margin, 0, sceneH);
  return { x, y, w: clamp(maxX + margin, 0, sceneW) - x, h: clamp(maxY + margin, 0, sceneH) - y };
}

export function coverScale(screenW: number, screenH: number, bounds: { w: number; h: number }): number {
  'worklet';
  return Math.max(screenW / bounds.w, screenH / bounds.h);
}

export function centerOffset(screenLen: number, boundStart: number, boundLen: number, scale: number): number {
  'worklet';
  return screenLen / 2 - (boundStart + boundLen / 2) * scale;
}

export function dragDelta(changeY: number, scale: number): number {
  'worklet';
  return -changeY / scale;
}
```

- [ ] **Step 4: Run** — `npm test` → all pass. `npx tsc --noEmit` → clean (nothing imports `stepStop` after Task 2, but Task 2 isn't done yet — `useCourseNav.ts` still imports it, so DO NOT delete `stepStop` until Task 2 removes that import; if tsc fails here, keep `stepStop` temporarily and delete it in Task 2).

- [ ] **Step 5: Commit** — `git add lib/courseNav.ts lib/__tests__/courseNav.test.ts && git commit -m "Add satellite-feed framing math (pathBounds, coverScale, centerOffset, dragDelta)"`

---

### Task 2: `useSatelliteNav` hook (replaces `useCourseNav`)

**Files:**
- Create: `components/hole/useSatelliteNav.ts`
- Delete: `components/hole/useCourseNav.ts` (in Task 5, when nothing imports it)

**Interfaces:**
- Consumes: Task 1 helpers, `pointAtDistance`, `nearestStop`, `clamp`, constants (`SCENE`, `STOPS`, `CAMERA_ZOOM`, `STOP_NEAR_THRESHOLD`, `WAYPOINTS`).
- Produces: `useSatelliteNav(screenW, screenH)` returning `{ path, stopDists, tx, ty, scale, gesture, activeStop: number | null, isOverview: boolean, setCameraInstant(frac: number): void, cameraFrac: SharedValue<number>-backed getter via onDistChange callback }` — exact shape in code below (course screen consumes `path, stopDists, tx, ty, scale, gesture, activeStop, isOverview, setCameraInstant, onSettle`).

- [ ] **Step 1: Write `components/hole/useSatelliteNav.ts`**

```ts
import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { buildHolePath, clamp, nearestStop, pointAtDistance } from '../../lib/holePath';
import {
  cameraOffset,
  centerOffset,
  coverScale,
  dragDelta,
  isOverviewZoom,
  pathBounds,
} from '../../lib/courseNav';
import { CAMERA_ZOOM, SCENE, STOPS, STOP_NEAR_THRESHOLD, WAYPOINTS } from '../../constants/hole';

const ZOOM_MS = 350;
const OVERVIEW_MARGIN = 120; // scene px of photo kept around the path in overview
const GLIDE_DECELERATION = 0.995; // gentle glide-to-rest, no flick-jumps

// Satellite-feed camera: a pan gesture drags the camera 1:1 along the traced
// fairway (no stops, no snapping); pinch toggles travel <-> whole-hole cover
// framing. `onSettle` reports the camera fraction for persistence.
export function useSatelliteNav(
  screenW: number,
  screenH: number,
  opts?: { onInteract?: () => void; onSettle?: (frac: number) => void }
) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const bounds = useMemo(() => pathBounds(path, OVERVIEW_MARGIN, SCENE.width, SCENE.height), [path]);
  const reduceMotion = useReducedMotion();

  const travelScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const fitScale = useMemo(() => coverScale(screenW, screenH, bounds), [screenW, screenH, bounds]);

  const cameraDist = useSharedValue(0);
  const scale = useSharedValue(travelScale);
  const hapticsArmed = useSharedValue(false);

  const camPos = useDerivedValue(() => pointAtDistance(path, cameraDist.value));
  const overviewNow = useDerivedValue(() => isOverviewZoom(scale.value, travelScale, fitScale));

  const tx = useDerivedValue(() =>
    overviewNow.value
      ? centerOffset(screenW, bounds.x, bounds.w, scale.value)
      : cameraOffset(screenW, SCENE.width * scale.value, screenW / 2 - camPos.value.x * scale.value)
  );
  const ty = useDerivedValue(() =>
    overviewNow.value
      ? centerOffset(screenH, bounds.y, bounds.h, scale.value)
      : cameraOffset(screenH, SCENE.height * scale.value, screenH * 0.55 - camPos.value.y * scale.value)
  );

  const [activeStop, setActiveStop] = useState<number | null>(0);
  const [isOverview, setIsOverview] = useState(false);

  const onStopChange = useCallback((index: number, buzz: boolean) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0 && buzz) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, cameraDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr, hapticsArmed.value);
    }
  );
  useAnimatedReaction(
    () => overviewNow.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setIsOverview)(curr);
    }
  );

  const onInteract = opts?.onInteract;
  const notifyInteract = useCallback(() => onInteract?.(), [onInteract]);
  const onSettle = opts?.onSettle;
  const notifySettle = useCallback(
    (dist: number) => onSettle?.(path.total === 0 ? 0 : dist / path.total),
    [onSettle, path.total]
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        hapticsArmed.value = true;
        runOnJS(notifyInteract)();
      })
      .onChange((e) => {
        if (overviewNow.value) return; // overview is a fixed full-hole frame
        cameraDist.value = clamp(cameraDist.value + dragDelta(e.changeY, scale.value), 0, path.total);
      })
      .onEnd((e) => {
        if (overviewNow.value) return;
        cameraDist.value = withDecay(
          {
            velocity: dragDelta(e.velocityY, scale.value),
            deceleration: GLIDE_DECELERATION,
            clamp: [0, path.total],
          },
          () => runOnJS(notifySettle)(cameraDist.value)
        );
      });

    const pinchStart = { value: 1 };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStart.value = scale.value;
        runOnJS(notifyInteract)();
      })
      .onUpdate((e) => {
        scale.value = clamp(pinchStart.value * e.scale, Math.min(fitScale, travelScale), Math.max(fitScale, travelScale));
      })
      .onEnd(() => {
        const target = isOverviewZoom(scale.value, travelScale, fitScale) ? fitScale : travelScale;
        scale.value = reduceMotion ? target : withTiming(target, { duration: ZOOM_MS });
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [path.total, fitScale, travelScale, reduceMotion, notifyInteract, notifySettle]);

  const setCameraInstant = useCallback(
    (frac: number) => {
      cameraDist.value = clamp(frac, 0, 1) * path.total;
    },
    [path.total]
  );

  return { path, stopDists, tx, ty, scale, gesture, activeStop, isOverview, setCameraInstant };
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (old `useCourseNav.ts` still compiles alongside; both exist until Task 5). `npm test` → pass.

- [ ] **Step 3: Commit** — `git add components/hole/useSatelliteNav.ts && git commit -m "Add useSatelliteNav: 1:1 drag camera with gentle glide, cover-fit overview"`

---

### Task 3: Satellite scene — HUD photo treatment, dashed path, no ball

**Files:**
- Modify: `components/hole/HoleScene.tsx` (full rewrite below)
- Modify: `constants/hole.ts` (SCENE_COLORS additions; ball constants removed in Task 5)

**Interfaces:**
- Produces: `HoleScene({ width, height, tx, ty, scale, path })` — `ballPos` and `scheme` props REMOVED. Task 5 updates the call site.

- [ ] **Step 1: In `constants/hole.ts`**, replace the `SCENE_COLORS` block with:

```ts
// Scene rendering colors (the sanctioned exception to theme tokens — these
// sit over a photo, not over themed UI). Satellite tint matches HUD_COLORS.bg.
export const SCENE_COLORS = {
  fallback: '#3E7355', // fairway green shown if the photo fails to load/decode
  satelliteTint: 'rgba(7, 20, 16, 0.42)', // always-on dark feed tint
  pathLine: '#5DCAA5', // dashed fairway line (HUD mint)
};
```

- [ ] **Step 2: Rewrite `components/hole/HoleScene.tsx`**

```tsx
import React, { useEffect, useMemo } from 'react';
import {
  Canvas,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  Path as SkiaPath,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type DerivedValue,
} from 'react-native-reanimated';
import type { HolePath } from '../../lib/holePath';
import { HOLE_IMAGE, SCENE, SCENE_COLORS, SHOW_PATH_DEBUG } from '../../constants/hole';

type HoleSceneProps = {
  width: number; // screen px
  height: number;
  tx: DerivedValue<number>; // camera translate, screen px
  ty: DerivedValue<number>;
  scale: DerivedValue<number>; // screen px per scene px
  path: HolePath;
};

const DASH_ON = 16;
const DASH_OFF = 12;

export function HoleScene({ width, height, tx, ty, scale, path }: HoleSceneProps) {
  const image = useImage(HOLE_IMAGE);
  const reduceMotion = useReducedMotion();

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  const skPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(path.pts[0].x, path.pts[0].y);
    for (const pt of path.pts) p.lineTo(pt.x, pt.y);
    return p;
  }, [path]);

  // Slow dash crawl so the feed reads "live"; static under reduced motion.
  const dashPhase = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    dashPhase.value = withRepeat(
      withTiming(-(DASH_ON + DASH_OFF), { duration: 1200, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(dashPhase);
  }, [reduceMotion, dashPhase]);

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <Group transform={transform}>
          <SkiaImage image={image} x={0} y={0} width={SCENE.width} height={SCENE.height} fit="fill" />
          <SkiaPath
            path={skPath}
            color={SCENE_COLORS.pathLine}
            style="stroke"
            strokeWidth={4}
            opacity={0.85}
          >
            <DashPathEffect intervals={[DASH_ON, DASH_OFF]} phase={dashPhase} />
          </SkiaPath>
          {SHOW_PATH_DEBUG ? (
            <SkiaPath path={skPath} color="red" style="stroke" strokeWidth={2} />
          ) : null}
        </Group>
      ) : (
        <Fill color={SCENE_COLORS.fallback} />
      )}
      <Fill color={SCENE_COLORS.satelliteTint} />
    </Canvas>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` will FAIL at the old `course.tsx` call site (`ballPos`/`scheme` props) and old `useCourseNav` imports of removed constants only if constants were removed — ball constants stay until Task 5, so the ONLY expected error is the `HoleScene` call site prop mismatch. That's fixed in Task 5; to keep every task green, do NOT run the commit gate on tsc here — instead verify with `npm test` (passes) and commit Tasks 3–5 knowing tsc goes green again at the end of Task 5. If you prefer strict green, fold Tasks 3–5 into one commit.

Preferred: fold — implement Tasks 3, 4, 5 then run the full gate and commit once as "Rebuild course page as satellite feed".

---

### Task 4: `TargetMarker` and `FeedChrome` overlays

**Files:**
- Create: `components/hole/TargetMarker.tsx`
- Create: `components/hole/FeedChrome.tsx`

**Interfaces:**
- Produces:
  - `TargetMarker({ stop, index, scenePos, tx, ty, scale, active, onPress })` — reticle ring + name plate, one Pressable (~56pt tall total), brighter when `active`.
  - `FeedChrome({ isOverview, onLegendPress(i) })` — top plates (`satellite feed · live` with pulsing dot; `TPC Sawgrass · no. 16 · par 5`), corner brackets, and the 1–5 legend panel in overview.

- [ ] **Step 1: Create `components/hole/TargetMarker.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, type DerivedValue } from 'react-native-reanimated';
import type { Vec } from '../../lib/holePath';
import type { HoleStop } from '../../constants/hole';
import { HUD_COLORS, HUD_FONT } from '../../constants/hud';

const RING = 34;
const WIDTH = 120; // whole marker (ring + plate) is one easy tap target

type TargetMarkerProps = {
  stop: HoleStop;
  index: number;
  scenePos: Vec;
  tx: DerivedValue<number>;
  ty: DerivedValue<number>;
  scale: DerivedValue<number>;
  active: boolean;
  onPress: () => void;
};

export function TargetMarker({ stop, index, scenePos, tx, ty, scale, active, onPress }: TargetMarkerProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: scenePos.x * scale.value + tx.value - WIDTH / 2 },
      { translateY: scenePos.y * scale.value + ty.value - RING / 2 },
      { scale: withSpring(active ? 1.12 : 1) },
    ],
  }));

  const color = active ? HUD_COLORS.mint : HUD_COLORS.mintSoft;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: WIDTH, opacity: active ? 1 : 0.8 }, style]}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Enter ${stop.label}`}
        style={{ alignItems: 'center' }}
      >
        <View
          style={{
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderWidth: 1.5,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(4, 36, 27, 0.55)',
            shadowColor: HUD_COLORS.mint,
            shadowOpacity: active ? 0.6 : 0,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
        </View>
        <View
          style={{
            marginTop: 4,
            backgroundColor: 'rgba(4, 36, 27, 0.8)',
            borderWidth: 0.75,
            borderColor: active ? HUD_COLORS.lineBright : HUD_COLORS.line,
            borderRadius: 3,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.text }}>
            {`${index + 1} · ${stop.label.toLowerCase()}`}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Create `components/hole/FeedChrome.tsx`**

```tsx
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';

function Bracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = { position: 'absolute' as const, width: 18, height: 18, borderColor: HUD_COLORS.mint, opacity: 0.7 };
  const pos = {
    tl: { top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
    tr: { top: 0, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    br: { bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  }[corner];
  return <View pointerEvents="none" style={[base, pos]} />;
}

export function FeedChrome({
  isOverview,
  onLegendPress,
}: {
  isOverview: boolean;
  onLegendPress: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const plate = {
    backgroundColor: 'rgba(4, 36, 27, 0.8)',
    borderWidth: 0.75,
    borderColor: HUD_COLORS.line,
    borderRadius: HUD_RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as const;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 6, left: 10, right: 10, bottom: 10 }}>
        <Bracket corner="tl" />
        <Bracket corner="tr" />
        <Bracket corner="bl" />
        <Bracket corner="br" />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={[plate, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Animated.View
            style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: HUD_COLORS.mint }, dotStyle]}
          />
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mint }}>
            {isOverview ? 'tactical overview' : 'satellite feed · live'}
          </Text>
        </View>
        <View style={plate}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
            TPC Sawgrass · no. 16 · par 5
          </Text>
        </View>
      </View>
      {isOverview ? (
        <View style={[plate, { position: 'absolute', left: 16, bottom: insets.bottom + 110, paddingVertical: 6 }]}>
          {STOPS.map((stop, i) => (
            <Pressable
              key={stop.label}
              onPress={() => onLegendPress(i)}
              accessibilityRole="button"
              accessibilityLabel={`Enter ${stop.label}`}
              style={{ paddingVertical: 3 }}
            >
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
                {`${i + 1} ${stop.label.toLowerCase()}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Continue to Task 5 (single combined commit at the end of Task 5).**

---

### Task 5: Assemble the course screen; delete the old model

**Files:**
- Modify: `app/(tabs)/course.tsx` (full rewrite below)
- Modify: `components/hole/HintOverlay.tsx` (HUD restyle + copy)
- Modify: `constants/hole.ts` (remove `BALL_RADIUS`; replace `LAST_STOP_KEY` with `LAST_DIST_KEY`)
- Delete: `components/hole/useCourseNav.ts`, `components/hole/Flag.tsx`, `components/hole/StopPreviewCard.tsx`, `components/hole/TodayCard.tsx`

**Interfaces:**
- Consumes: everything produced in Tasks 1–4.

- [ ] **Step 1: In `constants/hole.ts`** remove `export const BALL_RADIUS = 14; // scene px` and replace the storage-keys block with:

```ts
export const LAST_DIST_KEY = 'hole.lastDist'; // camera position as a 0..1 fraction
export const HINT_DISMISSED_KEY = 'hole.hintDismissed';
```

- [ ] **Step 2: Rewrite `app/(tabs)/course.tsx`**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HoleScene } from '../../components/hole/HoleScene';
import { useSatelliteNav } from '../../components/hole/useSatelliteNav';
import { TargetMarker } from '../../components/hole/TargetMarker';
import { FeedChrome } from '../../components/hole/FeedChrome';
import { HintOverlay } from '../../components/hole/HintOverlay';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { pointAtDistance } from '../../lib/holePath';
import { HINT_DISMISSED_KEY, LAST_DIST_KEY, STOPS } from '../../constants/hole';
import { HUD_COLORS } from '../../constants/hud';

export default function CourseScreen() {
  const { width, height } = useWindowDimensions();

  const [hintVisible, setHintVisible] = useState(false);
  const hintWritten = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(HINT_DISMISSED_KEY)
      .then((v) => {
        if (v == null) setHintVisible(true);
      })
      .catch(() => {});
  }, []);
  const dismissHint = useCallback(() => {
    if (!hintWritten.current) {
      hintWritten.current = true;
      AsyncStorage.setItem(HINT_DISMISSED_KEY, '1').catch(() => {});
    }
    setHintVisible(false);
  }, []);

  const persistDist = useCallback((frac: number) => {
    AsyncStorage.setItem(LAST_DIST_KEY, String(frac)).catch(() => {});
  }, []);

  const { path, stopDists, tx, ty, scale, gesture, activeStop, isOverview, setCameraInstant } =
    useSatelliteNav(width, height, { onInteract: dismissHint, onSettle: persistDist });

  useEffect(() => {
    AsyncStorage.getItem(LAST_DIST_KEY)
      .then((v) => {
        const f = v == null ? NaN : Number(v);
        if (Number.isFinite(f) && f >= 0 && f <= 1) setCameraInstant(f);
      })
      .catch(() => {});
  }, [setCameraInstant]);

  const enterStop = (index: number) => {
    setCameraInstant(stopDists[index] / (path.total || 1));
    persistDist(stopDists[index] / (path.total || 1));
    router.push(STOPS[index].route);
  };

  const stopScenePos = useMemo(() => stopDists.map((d) => pointAtDistance(path, d)), [path, stopDists]);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <HoleScene width={width} height={height} tx={tx} ty={ty} scale={scale} path={path} />
        </View>
      </GestureDetector>
      {STOPS.map((stop, i) => (
        <TargetMarker
          key={stop.label}
          stop={stop}
          index={i}
          scenePos={stopScenePos[i]}
          tx={tx}
          ty={ty}
          scale={scale}
          active={activeStop === i || isOverview}
          onPress={() => enterStop(i)}
        />
      ))}
      <FeedChrome isOverview={isOverview} onLegendPress={enterStop} />
      <HintOverlay visible={hintVisible && !isOverview} />
      <ToggleBar active="course" />
    </View>
  );
}
```

- [ ] **Step 3: Restyle `components/hole/HintOverlay.tsx`** — swap `useTheme` for HUD constants (container: `backgroundColor: 'rgba(4, 36, 27, 0.85)'`, `borderColor: HUD_COLORS.line`, `borderRadius: HUD_RADIUS`; text: `fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft`; icon color `HUD_COLORS.mint`) and change the copy to `drag ↑↓ · tap a target · pinch for overview`.

- [ ] **Step 4: Delete the old model**

```bash
git rm components/hole/useCourseNav.ts components/hole/Flag.tsx components/hole/StopPreviewCard.tsx components/hole/TodayCard.tsx
grep -rn "useCourseNav\|Flag\|StopPreviewCard\|TodayCard\|BALL_RADIUS\|LAST_STOP_KEY\|ballPos\|stepStop" app/ components/ lib/ constants/ --include="*.ts" --include="*.tsx"
```

Expected: no hits outside comments/this plan (fix any stragglers — e.g. delete `stepStop` from `lib/courseNav.ts` now if Task 1 kept it).

- [ ] **Step 5: Full gate** — `npx tsc --noEmit` → clean; `npm test` → all pass (courseNav suite reflects new helpers).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "Rebuild course page as satellite feed: drag camera, target markers, no ball"`

---

### Task 6: Verification + PR B

- [ ] **Step 1:** `npx tsc --noEmit && npm test` → clean, all pass.
- [ ] **Step 2: Tommy's phone checklist (Expo Go):**
  - Course opens on the treated photo with corner brackets, dashed mint fairway line, `satellite feed · live` + `TPC Sawgrass · no. 16 · par 5` plates
  - Drag up/down: the hole follows your finger exactly; releasing glides gently to rest; stops firmly at tee and green; NO jumpiness
  - No golf ball anywhere
  - Tap every target marker (ring or plate) → enters that section
  - Pinch out: whole hole edge-to-edge, no dead space, all 5 targets visible + legend panel; tap markers and legend rows → enter sections; pinch in returns to close-up
  - Haptic tick when dragging past a target; reopening the app returns to your last position
- [ ] **Step 3:** `git push -u origin hud-course && gh pr create --base hud-lookfeel --title "Satellite-feed course page (PR B)" --body "..."` — Tommy merges PR #3 then PR B (GitHub retargets it to main automatically).
