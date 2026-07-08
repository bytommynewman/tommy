# Scratch + Navigation v2 — Project A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Scratch home page (mascot, local daily read, section overview cards, placeholder chat) and a two-button floating toggle, and replace the golf page's fumbly free-drag with swipe-to-travel plus a pinch-out overview with direct tap-to-enter.

**Architecture:** The `(tabs)` Stack gains a second page: `index.tsx` becomes Scratch (home) and the hole screen moves to `course.tsx`; a shared floating `ToggleBar` switches them via `router.replace`. The course interaction hook is rewritten (`useCourseNav` replaces `useHoleDrag`): fling gestures step the ball stop-to-stop along the existing path, a pinch gesture zooms between travel and fit-whole-hole scales, and an overview mode makes flag taps navigate directly. New pure helpers live in `lib/courseNav.ts` with vitest coverage. Scratch's brain is a placeholder (Project B wires the real agent).

**Tech Stack:** Existing stack + `react-native-svg` (bundled in Expo Go SDK 54 at 15.12.1) for the mascot art.

**Spec:** `docs/superpowers/specs/2026-07-08-scratch-and-nav-v2-design.md` (Project A sections)

## Global Constraints

- Expo Go only — native deps via `npx expo install` (SDK 54 pins). The only new native dep is `react-native-svg`.
- TypeScript strict; every task verifies `npx tsc --noEmit` AND `npm test` (existing 9 geometry tests must stay green; this plan adds courseNav tests).
- UI chrome colors via `useTheme()` tokens only ('#000' shadowColor for elevation shadows is the sanctioned exception, matching existing components).
- The mascot MUST hold a golf club (user requirement). Original art only — no Malbon logos/IP; "inspired" palette + attitude.
- The Scratch page MUST show the overview cards below the daily read (user requirement).
- Toggle bar bottom offset: `insets.bottom + 16`; everything else stacks above it.
- Routes: Scratch home = `/` (index), course = `/course`; the five section routes (`/recovery` etc.) are unchanged.
- On-device Expo Go verification is deferred to the human device pass at the end; per-task verification is tsc + vitest.
- Commit after every task on branch `golf-home`. No pushes unless asked.

---

### Task 1: Pure course-navigation helpers (`lib/courseNav.ts`)

**Files:**
- Create: `lib/courseNav.ts`
- Test: `lib/__tests__/courseNav.test.ts`

**Interfaces:**
- Produces (consumed by Task 3):
  - `stepStop(current: number, direction: 1 | -1, stopCount: number): number` — worklet-safe, clamps to [0, stopCount-1]
  - `cameraOffset(screenLen: number, contentLen: number, desired: number): number` — worklet-safe; centers content when it's smaller than the screen, otherwise clamps `desired` to [screenLen−contentLen, 0]
  - `isOverviewZoom(scale: number, travelScale: number, fitScale: number): boolean` — worklet-safe; true below the midpoint of the two scales

- [ ] **Step 1: Write the failing tests** — create `lib/__tests__/courseNav.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stepStop, cameraOffset, isOverviewZoom } from '../courseNav';

describe('stepStop', () => {
  it('steps forward and back', () => {
    expect(stepStop(1, 1, 5)).toBe(2);
    expect(stepStop(1, -1, 5)).toBe(0);
  });
  it('clamps at both ends', () => {
    expect(stepStop(4, 1, 5)).toBe(4);
    expect(stepStop(0, -1, 5)).toBe(0);
  });
});

describe('cameraOffset', () => {
  it('clamps a too-high desired offset to 0 when content is larger', () => {
    expect(cameraOffset(800, 2000, 100)).toBe(0);
  });
  it('clamps a too-low desired offset to screen minus content', () => {
    expect(cameraOffset(800, 2000, -5000)).toBe(800 - 2000);
  });
  it('passes through an in-range offset', () => {
    expect(cameraOffset(800, 2000, -600)).toBe(-600);
  });
  it('centers content smaller than the screen, ignoring desired', () => {
    expect(cameraOffset(800, 600, -500)).toBe(100);
  });
});

describe('isOverviewZoom', () => {
  it('is false at travel scale and true at fit scale', () => {
    expect(isOverviewZoom(0.65, 0.65, 0.37)).toBe(false);
    expect(isOverviewZoom(0.37, 0.65, 0.37)).toBe(true);
  });
  it('flips at the midpoint', () => {
    expect(isOverviewZoom(0.52, 0.65, 0.37)).toBe(false); // above mid (0.51)
    expect(isOverviewZoom(0.5, 0.65, 0.37)).toBe(true); // below mid
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL, cannot resolve `../courseNav`.

- [ ] **Step 3: Implement `lib/courseNav.ts`:**

```ts
// Pure helpers for course navigation (swipe stepping, camera framing,
// overview-mode detection). No React imports; 'worklet'-marked functions run
// on the UI thread (same contract as lib/holePath.ts).

export function stepStop(current: number, direction: 1 | -1, stopCount: number): number {
  'worklet';
  const next = current + direction;
  return next < 0 ? 0 : next > stopCount - 1 ? stopCount - 1 : next;
}

// Camera translate for one axis. Content larger than screen: clamp the
// desired offset so no gap shows. Content smaller (zoomed-out overview):
// center it regardless of desired.
export function cameraOffset(screenLen: number, contentLen: number, desired: number): number {
  'worklet';
  if (contentLen <= screenLen) return (screenLen - contentLen) / 2;
  const lo = screenLen - contentLen;
  return desired < lo ? lo : desired > 0 ? 0 : desired;
}

export function isOverviewZoom(scale: number, travelScale: number, fitScale: number): boolean {
  'worklet';
  return scale < (travelScale + fitScale) / 2;
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → all suites pass (9 holePath + 8 courseNav). `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/courseNav.ts lib/__tests__/courseNav.test.ts
git commit -m "feat: pure course-nav helpers (step, camera offset, overview zoom)"
```

---

### Task 2: ToggleBar + route restructure (Scratch skeleton at `/`, course at `/course`)

**Files:**
- Create: `components/ui/ToggleBar.tsx`
- Create: `app/(tabs)/course.tsx` (the current hole screen, moved)
- Modify: `app/(tabs)/index.tsx` (becomes a Scratch skeleton; fleshed out in Tasks 4–6)
- Modify: `app/(tabs)/_layout.tsx` (register `course`)

**Interfaces:**
- Consumes: theme tokens, expo-router, expo-haptics.
- Produces (consumed by Tasks 3–6):
  - `ToggleBar` component, props `{ active: 'scratch' | 'course' }`
  - `TOGGLE_BAR_CLEARANCE = 76` (exported const: bar height 60 + 16 gap) — content that must sit above the bar offsets by `insets.bottom + 16 + TOGGLE_BAR_CLEARANCE`... precisely: bar bottom is `insets.bottom + 16`, bar height 60, so stacked content uses `bottom: insets.bottom + TOGGLE_BAR_CLEARANCE + 16`.

- [ ] **Step 1: Write `components/ui/ToggleBar.tsx`:**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

export const TOGGLE_BAR_CLEARANCE = 76; // bar height (60) + gap (16)

const SEGMENT_WIDTH = 132;
const BAR_PADDING = 5;

type ToggleBarProps = { active: 'scratch' | 'course' };

const items = [
  { key: 'scratch' as const, label: 'SCRATCH', icon: 'sparkles' as const, route: '/' as const },
  { key: 'course' as const, label: 'SECTIONS', icon: 'golf' as const, route: '/course' as const },
];

export function ToggleBar({ active }: ToggleBarProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const activeIndex = active === 'scratch' ? 0 : 1;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(activeIndex * SEGMENT_WIDTH, { damping: 18, stiffness: 180 }) }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: BAR_PADDING,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: BAR_PADDING,
              left: BAR_PADDING,
              width: SEGMENT_WIDTH,
              height: 50,
              borderRadius: 999,
              backgroundColor: colors.primary,
            },
            indicatorStyle,
          ]}
        />
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${item.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                Haptics.selectionAsync();
                router.replace(item.route);
              }}
              style={{
                width: SEGMENT_WIDTH,
                height: 50,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name={item.icon} size={16} color={isActive ? colors.onPrimary : colors.textMuted} />
              <Text style={[typography.label, { color: isActive ? colors.onPrimary : colors.textMuted }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Move the hole screen** — `git mv "app/(tabs)/index.tsx" "app/(tabs)/course.tsx"` (relative imports stay valid; same directory depth). Then in `course.tsx`: rename the default export function `HoleScreen` → `CourseScreen`, add `import { ToggleBar } from '../../components/ui/ToggleBar';` and render `<ToggleBar active="course" />` as the LAST child of the root `<View>` (after `<TodayCard />`).

- [ ] **Step 3: Create the new Scratch skeleton `app/(tabs)/index.tsx`:**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { useTheme } from '../../lib/theme';

// Scratch home. Tasks 4-6 replace this skeleton with the mascot header,
// daily read, overview grid, and chat bar.
export default function ScratchScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <Text style={[typography.title, { color: colors.text, paddingHorizontal: spacing.lg }]}>Scratch</Text>
      <ToggleBar active="scratch" />
    </View>
  );
}
```

- [ ] **Step 4: Register the course route** — in `app/(tabs)/_layout.tsx`, after `<Stack.Screen name="index" />` add:

```tsx
      <Stack.Screen name="course" />
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` clean (typed routes accept `/` and `/course`); `npm test` green.

- [ ] **Step 6: Commit**

```bash
git add components/ui/ToggleBar.tsx "app/(tabs)/index.tsx" "app/(tabs)/course.tsx" "app/(tabs)/_layout.tsx"
git commit -m "feat: Scratch/Sections toggle bar; hole screen moves to /course"
```

---

### Task 3: Swipe + pinch course navigation (`useCourseNav` replaces `useHoleDrag`)

**Files:**
- Create: `components/hole/useCourseNav.ts`
- Delete: `components/hole/useHoleDrag.ts`
- Modify: `app/(tabs)/course.tsx`
- Modify: `components/hole/HintOverlay.tsx` (copy change)

**Interfaces:**
- Consumes: Task 1 helpers; existing `lib/holePath.ts`, `constants/hole.ts`, `HoleScene`/`Flag`/`StopPreviewCard`/`TodayCard` components (unchanged); `TOGGLE_BAR_CLEARANCE` (Task 2).
- Produces: `useCourseNav(screenW: number, screenH: number, opts?: { onSwipe?: () => void })` returning `{ path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, isOverview, goToStop, exitOverview, setBallInstant }` — same names as the old hook where behavior is unchanged (`path`, `stopDists`, `ballPos`, `tx`, `ty`, `scale`, `gesture`, `activeStop`, `goToStop`, `setBallInstant`); new: `isOverview: boolean`, `exitOverview(): void`; removed: none consumed elsewhere (the old `goToNeighbor` never existed; swipes are internal).

- [ ] **Step 1: Write `components/hole/useCourseNav.ts`:**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { Directions, Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { buildHolePath, clamp, nearestStop, pointAtDistance } from '../../lib/holePath';
import { cameraOffset, isOverviewZoom, stepStop } from '../../lib/courseNav';
import { CAMERA_ZOOM, SCENE, STOPS, STOP_NEAR_THRESHOLD, WAYPOINTS } from '../../constants/hole';

const TRAVEL_MS = 700;
const ZOOM_MS = 350;

export function useCourseNav(screenW: number, screenH: number, opts?: { onSwipe?: () => void }) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const reduceMotion = useReducedMotion();

  const travelScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const fitScale = Math.min(screenW / SCENE.width, screenH / SCENE.height);

  const ballDist = useSharedValue(0);
  const stopIndex = useSharedValue(0); // authoritative current stop for stepping
  const scale = useSharedValue(travelScale);
  const hapticsArmed = useSharedValue(false);

  const ballPos = useDerivedValue(() => pointAtDistance(path, ballDist.value));
  const tx = useDerivedValue(() =>
    cameraOffset(screenW, SCENE.width * scale.value, screenW / 2 - ballPos.value.x * scale.value)
  );
  const ty = useDerivedValue(() =>
    cameraOffset(screenH, SCENE.height * scale.value, screenH * 0.55 - ballPos.value.y * scale.value)
  );

  const [activeStop, setActiveStop] = useState<number | null>(0);
  const [isOverview, setIsOverview] = useState(false);

  const onStopChange = useCallback((index: number, buzz: boolean) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0 && buzz) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, ballDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr, hapticsArmed.value);
    }
  );

  const overviewNow = useDerivedValue(() => isOverviewZoom(scale.value, travelScale, fitScale));
  useAnimatedReaction(
    () => overviewNow.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setIsOverview)(curr);
    }
  );

  const onSwipe = opts?.onSwipe;
  const notifySwipe = useCallback(() => {
    onSwipe?.();
  }, [onSwipe]);

  const gesture = useMemo(() => {
    const travelTo = (index: number) => {
      'worklet';
      stopIndex.value = index;
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic) });
    };
    const swipe = (direction: 1 | -1) => {
      'worklet';
      hapticsArmed.value = true;
      travelTo(stepStop(stopIndex.value, direction, stopDists.length));
      runOnJS(notifySwipe)();
    };
    // Swipe up = ball travels UP the hole (forward); down = back toward the tee.
    const flingUp = Gesture.Fling().direction(Directions.UP).onEnd(() => swipe(1));
    const flingDown = Gesture.Fling().direction(Directions.DOWN).onEnd(() => swipe(-1));

    const pinchStart = { value: 1 };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStart.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = clamp(pinchStart.value * e.scale, fitScale, travelScale);
      })
      .onEnd(() => {
        // Settle to whichever mode we're closer to.
        const target = isOverviewZoom(scale.value, travelScale, fitScale) ? fitScale : travelScale;
        scale.value = reduceMotion ? target : withTiming(target, { duration: ZOOM_MS });
      });

    return Gesture.Race(pinch, Gesture.Exclusive(flingUp, flingDown));
  }, [stopDists, reduceMotion, travelScale, fitScale, notifySwipe]);

  const goToStop = useCallback(
    (index: number) => {
      hapticsArmed.value = true;
      stopIndex.value = index;
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic) });
    },
    [stopDists, reduceMotion]
  );

  const exitOverview = useCallback(() => {
    scale.value = reduceMotion ? travelScale : withTiming(travelScale, { duration: ZOOM_MS });
  }, [reduceMotion, travelScale]);

  const setBallInstant = useCallback(
    (index: number) => {
      stopIndex.value = index;
      ballDist.value = stopDists[index];
    },
    [stopDists]
  );

  return { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, isOverview, goToStop, exitOverview, setBallInstant };
}
```

Note: `pinchStart` as a plain object literal is deliberate — it's only read/written inside the pinch worklets created in the same `useMemo` closure; Reanimated captures it by reference per gesture instance. Do not "fix" it into a shared value.

- [ ] **Step 2: Delete the old hook** — `git rm components/hole/useHoleDrag.ts`.

- [ ] **Step 3: Rewire `app/(tabs)/course.tsx`.** Full replacement of the component body (this is the moved file from Task 2 — imports adjust as shown):

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HoleScene } from '../../components/hole/HoleScene';
import { useCourseNav } from '../../components/hole/useCourseNav';
import { Flag } from '../../components/hole/Flag';
import { StopPreviewCard } from '../../components/hole/StopPreviewCard';
import { TodayCard } from '../../components/hole/TodayCard';
import { HintOverlay } from '../../components/hole/HintOverlay';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { useTheme } from '../../lib/theme';
import { pointAtDistance } from '../../lib/holePath';
import { HINT_DISMISSED_KEY, LAST_STOP_KEY, STOPS } from '../../constants/hole';
import { useHabits, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

export default function CourseScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();

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

  const { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, isOverview, goToStop, exitOverview, setBallInstant } =
    useCourseNav(width, height, { onSwipe: dismissHint });

  useEffect(() => {
    AsyncStorage.getItem(LAST_STOP_KEY)
      .then((v) => {
        const i = v == null ? NaN : Number(v);
        if (Number.isInteger(i) && i >= 0 && i < STOPS.length) setBallInstant(i);
      })
      .catch(() => {});
  }, [setBallInstant]);

  const { data: habits = [] } = useHabits();
  const { data: relapses = [] } = useRelapses();
  const stats = useMemo<(string | null)[]>(() => {
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery.map((h) => daysClean(h, relapses)).sort((a, b) => b - a)[0];
    return STOPS.map((s) =>
      s.label === 'Recovery' && best !== undefined && best > 0 ? `${best} days clean` : null
    );
  }, [habits, relapses]);

  const enterStop = (index: number) => {
    AsyncStorage.setItem(LAST_STOP_KEY, String(index)).catch(() => {});
    router.push(STOPS[index].route);
  };

  // Overview mode: tapping a flag goes straight into the section.
  const onFlagPress = (index: number) => {
    if (isOverview) {
      setBallInstant(index);
      enterStop(index);
    } else {
      goToStop(index);
    }
  };

  const stopScenePos = useMemo(() => stopDists.map((d) => pointAtDistance(path, d)), [path, stopDists]);

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
          active={activeStop === i || isOverview}
          anchor={i === STOPS.length - 1 ? 'below' : 'above'}
          onPress={() => onFlagPress(i)}
        />
      ))}
      {activeStop != null && !isOverview ? (
        <StopPreviewCard stop={STOPS[activeStop]} stat={stats[activeStop]} onEnter={() => enterStop(activeStop)} />
      ) : null}
      <HintOverlay visible={hintVisible && !isOverview} />
      {!isOverview ? <TodayCard /> : null}
      <ToggleBar active="course" />
    </View>
  );
}
```

Behavior notes baked in above: in overview, all flags render highlighted (`active` true) and tappable-to-enter; the preview card, hint, and TodayCard hide so the whole hole is visible; `exitOverview` is available for future use (pinch-in already returns via the gesture).

- [ ] **Step 4: Raise the preview card above the toggle bar** — in `components/hole/StopPreviewCard.tsx`, add the import `import { TOGGLE_BAR_CLEARANCE } from '../ui/ToggleBar';` and change the container's `bottom` from `insets.bottom + spacing.lg` to `insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.md`.

- [ ] **Step 5: Update the hint copy** — in `components/hole/HintOverlay.tsx`, change the text `Drag the ball down the fairway` to `Swipe up to play the hole — pinch out to see it all` and the icon from `arrow-up` to `chevron-up-outline`. (Users who already dismissed the old hint won't see the new copy; acceptable.)

- [ ] **Step 6: Verify** — `npx tsc --noEmit` clean (catches any leftover `useHoleDrag` import); `npm test` green (17 tests). `grep -rn "useHoleDrag" app components lib` → no hits.

- [ ] **Step 7: Commit**

```bash
git add -A -- ':!.superpowers'
git commit -m "feat: swipe-to-travel + pinch overview replace free drag on course"
```

---

### Task 4: Scratch mascot (react-native-svg) + page header

**Files:**
- Modify: `package.json` (via `npx expo install react-native-svg`)
- Create: `components/scratch/ScratchMascot.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Produces: `ScratchMascot` component, props `{ size?: number }` (default 140; renders square). Original golf-caddie character HOLDING A GOLF CLUB (user requirement).

- [ ] **Step 1: Install** — `npx expo install react-native-svg` (SDK 54 pins 15.12.1).

- [ ] **Step 2: Write `components/scratch/ScratchMascot.tsx`:**

```tsx
import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../lib/theme';

// Scratch — the caddie. Original character (retro streetwear-golf energy):
// dimpled golf-ball head, bucket hat, wraparound shades, towel on the
// shoulder, and a golf club in hand (non-negotiable per the design spec).
export function ScratchMascot({ size = 140 }: { size?: number }) {
  const { colors, scheme } = useTheme();
  const cream = scheme === 'dark' ? '#EFEAD8' : '#F7F3E6';
  const green = colors.primary;
  const gold = colors.accent;
  const ink = scheme === 'dark' ? '#10130F' : '#1B1D18';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* club shaft — held diagonally across the body, grip low-left, head high-right */}
      <Line x1="38" y1="176" x2="150" y2="78" stroke={ink} strokeWidth="7" strokeLinecap="round" />
      {/* club head (driver) */}
      <Path d="M146 84 q18 -14 26 -2 q6 10 -8 16 q-12 5 -22 -4 z" fill={gold} stroke={ink} strokeWidth="4" />
      {/* grip */}
      <Line x1="38" y1="176" x2="62" y2="155" stroke={gold} strokeWidth="11" strokeLinecap="round" />

      {/* body */}
      <Path d="M62 196 q0 -52 38 -52 q38 0 38 52 z" fill={green} stroke={ink} strokeWidth="5" />
      {/* towel over the right shoulder */}
      <Path d="M124 152 l26 0 l-6 40 l-14 0 z" fill={cream} stroke={ink} strokeWidth="4" />
      <Line x1="126" y1="166" x2="146" y2="166" stroke={gold} strokeWidth="4" />
      {/* hands gripping the club */}
      <Circle cx="52" cy="164" r="9" fill={cream} stroke={ink} strokeWidth="4" />
      <Circle cx="66" cy="152" r="9" fill={cream} stroke={ink} strokeWidth="4" />

      {/* golf-ball head */}
      <Circle cx="100" cy="92" r="46" fill={cream} stroke={ink} strokeWidth="5" />
      {/* dimples */}
      <G fill={ink} opacity={0.14}>
        <Circle cx="72" cy="104" r="3.4" />
        <Circle cx="86" cy="116" r="3.4" />
        <Circle cx="104" cy="120" r="3.4" />
        <Circle cx="122" cy="112" r="3.4" />
        <Circle cx="132" cy="96" r="3.4" />
      </G>
      {/* wraparound shades */}
      <Path d="M58 82 q42 -14 84 0 l-3 14 q-16 8 -36 4 q-4 -6 -6 -6 q-2 0 -6 6 q-20 4 -30 -4 z" fill={ink} />
      {/* smirk */}
      <Path d="M84 126 q16 12 32 2" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* bucket hat */}
      <Path d="M56 62 q6 -34 44 -34 q38 0 44 34 z" fill={green} stroke={ink} strokeWidth="5" />
      <Ellipse cx="100" cy="63" rx="56" ry="12" fill={green} stroke={ink} strokeWidth="5" />
      {/* hat badge */}
      <Circle cx="100" cy="44" r="7" fill={gold} stroke={ink} strokeWidth="3" />

      {/* ground shadow */}
      <Ellipse cx="100" cy="196" rx="52" ry="5" fill={ink} opacity={0.12} />
      <Rect x="0" y="0" width="0" height="0" fill="none" />
    </Svg>
  );
}
```

- [ ] **Step 3: Put the header on the page** — replace `app/(tabs)/index.tsx` in full:

```tsx
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar, TOGGLE_BAR_CLEARANCE } from '../../components/ui/ToggleBar';
import { ScratchMascot } from '../../components/scratch/ScratchMascot';
import { useTheme } from '../../lib/theme';
import { useProfile } from '../../lib/hooks/useProfile';

export default function ScratchScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <ScratchMascot size={120} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.accent, marginBottom: spacing.xs }]}>
              YOUR CADDIE — SCRATCH
            </Text>
            <Text style={[typography.title, { color: colors.text }]}>
              What&apos;s the play today, {firstName}?
            </Text>
          </View>
        </View>
        {/* Daily read + overview grid land here in Task 5; chat bar in Task 6 */}
      </ScrollView>
      <ToggleBar active="scratch" />
    </View>
  );
}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npm test` green.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/scratch/ScratchMascot.tsx "app/(tabs)/index.tsx"
git commit -m "feat: Scratch mascot (golf club in hand) and page header"
```

---

### Task 5: Daily read card + section overview grid

**Files:**
- Create: `components/scratch/DailyReadCard.tsx`
- Create: `components/scratch/SectionOverviewGrid.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: existing hooks (`useHabits`, `useRecentLogs`, `useRelapses`), `daysClean`, `STOPS` from `constants/hole.ts` (reused as the canonical section list: icon/label/route/tagline).
- Produces: `DailyReadCard` (props: none), `SectionOverviewGrid` (props: none). The overview grid below the daily read is a hard spec requirement.

- [ ] **Step 1: Write `components/scratch/DailyReadCard.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

// Project A: the read is composed locally from live data. Project B replaces
// the body with Scratch's agent-written brief.
export function DailyReadCard() {
  const { colors, spacing, radii, typography } = useTheme();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();

  const lines = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneIds = new Set(
      logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
    );
    const remaining = habits.length - habits.filter((h) => doneIds.has(h.id)).length;
    const out: string[] = [];
    if (habits.length === 0) {
      out.push('No habits on the card yet — set up your first ones in Recovery.');
    } else if (remaining === 0) {
      out.push('Card is clean — everything checked off today. That is how rounds are won.');
    } else {
      out.push(`${remaining} thing${remaining === 1 ? '' : 's'} still open on today's card.`);
    }
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery
      .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
      .sort((a, b) => b.days - a.days)[0];
    if (best && best.days > 0) {
      out.push(`${best.days} days clean on ${best.habit.name.toLowerCase()} — protect that streak.`);
    }
    return out;
  }, [habits, logs, relapses]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Ionicons name="reader-outline" size={16} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>THE DAILY READ</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>
          {line}
        </Text>
      ))}
      <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.xs }]}>
        Scratch&apos;s brain isn&apos;t connected yet — this is the quick read.
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Write `components/scratch/SectionOverviewGrid.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { STOPS } from '../../constants/hole';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

// One badge card per section — the "overview below the AI" the spec requires.
// STOPS is the canonical section list (icon/label/route/tagline), shared with
// the course page so the two stay in sync.
export function SectionOverviewGrid() {
  const { colors, spacing, radii, typography } = useTheme();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();

  const recoveryStat = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneCount = logs.filter((l) => l.log_date === today && l.status === 'done').length;
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery.map((h) => daysClean(h, relapses)).sort((a, b) => b - a)[0];
    if (habits.length === 0) return null;
    const streak = best !== undefined && best > 0 ? `${best} days clean · ` : '';
    return `${streak}${doneCount}/${habits.length} done today`;
  }, [habits, logs, relapses]);

  return (
    <View>
      <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.sm }]}>
        ON THE COURSE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {STOPS.map((stop) => (
          <Pressable
            key={stop.label}
            onPress={() => router.push(stop.route)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${stop.label}`}
            style={{
              width: '48%',
              flexGrow: 1,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons name={stop.icon} size={17} color={colors.primary} />
            </View>
            <Text style={[typography.heading, { color: colors.text }]}>{stop.label}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
              {stop.label === 'Recovery' && recoveryStat ? recoveryStat : stop.tagline}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Mount both on the page** — in `app/(tabs)/index.tsx`, add imports:

```tsx
import { DailyReadCard } from '../../components/scratch/DailyReadCard';
import { SectionOverviewGrid } from '../../components/scratch/SectionOverviewGrid';
```

and replace the placeholder comment line (`{/* Daily read + overview grid land here in Task 5; chat bar in Task 6 */}`) with:

```tsx
        <DailyReadCard />
        <SectionOverviewGrid />
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npm test` green.

- [ ] **Step 5: Commit**

```bash
git add components/scratch/DailyReadCard.tsx components/scratch/SectionOverviewGrid.tsx "app/(tabs)/index.tsx"
git commit -m "feat: daily read card and section overview grid on Scratch home"
```

---

### Task 6: Chat bar + placeholder chat sheet

**Files:**
- Create: `components/scratch/ChatSheet.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Produces: `ChatSheet` component, props `{ visible: boolean; onClose: () => void }`; plus an inline chat bar on the Scratch page. Project B swaps the canned reply for the real agent — the message-list UI and input contract stay.

- [ ] **Step 1: Write `components/scratch/ChatSheet.tsx`:**

```tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { ScratchMascot } from './ScratchMascot';

type ChatMessage = { id: string; role: 'user' | 'scratch'; text: string };

// Project A placeholder brain: canned replies. Project B replaces sendToScratch
// with the real edge-function agent; the UI contract stays identical.
const CANNED = [
  "Brain's not hooked up yet — once my API key is in, I can actually do that for you.",
  "Heard. I'll be able to handle that myself once my brain's connected — for now, hit the Sections page.",
  "Love the energy. Wire up my brain (Settings will walk you through it soon) and I'm on it.",
];

export function ChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'hello', role: 'scratch', text: "What's the play? Ask me anything — habits, streaks, the whole card." },
  ]);
  const [draft, setDraft] = useState('');
  const cannedIndex = useRef(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const reply = CANNED[cannedIndex.current % CANNED.length];
    cannedIndex.current += 1;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text }]);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `s${Date.now()}`, role: 'scratch', text: reply }]);
    }, 450);
  }, [draft]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close chat" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              maxHeight: 560,
              paddingBottom: insets.bottom + spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <ScratchMascot size={40} />
              <Text style={[typography.heading, { color: colors.text, flex: 1 }]}>Scratch</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
              renderItem={({ item }) => (
                <View
                  style={{
                    alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    backgroundColor: item.role === 'user' ? colors.primary : colors.surface,
                    borderRadius: radii.md,
                    borderWidth: item.role === 'user' ? 0 : 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text style={[typography.body, { color: item.role === 'user' ? colors.onPrimary : colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                placeholder="Ask Scratch anything…"
                placeholderTextColor={colors.textFaint}
                returnKeyType="send"
                style={[
                  typography.body,
                  {
                    flex: 1,
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              />
              <Pressable
                onPress={send}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Add the chat bar to the page** — in `app/(tabs)/index.tsx`: add imports `Pressable` (merge into the react-native import), `Ionicons` (`@expo/vector-icons`), `ChatSheet`, and `useState` (merge into the react import). Inside `ScratchScreen`, add state `const [chatOpen, setChatOpen] = useState(false);`. Between `</ScrollView>` and `<ToggleBar active="scratch" />`, insert:

```tsx
      <Pressable
        onPress={() => setChatOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Chat with Scratch"
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        <Text style={[typography.body, { color: colors.textFaint, flex: 1 }]}>Ask Scratch anything…</Text>
      </Pressable>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
```

Also bump the ScrollView's `paddingBottom` to `insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.xl + 56` so content scrolls clear of the chat bar.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` green.

- [ ] **Step 4: Commit**

```bash
git add components/scratch/ChatSheet.tsx "app/(tabs)/index.tsx"
git commit -m "feat: Scratch chat bar with placeholder chat sheet"
```

---

### Task 7: Docs + branch verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md.** In the **Routing** paragraph, replace the sentence beginning "`app/(tabs)/_layout.tsx` is a Stack (not Tabs): the home screen is an interactive golf-hole navigator" through "There is no tab bar." with:

```
`app/(tabs)/_layout.tsx` is a Stack (not Tabs). The home screen (`index`) is Scratch — an AI-caddie page (`components/scratch/`: mascot, daily read, section overview grid, chat sheet with a placeholder brain until the scratch-agent edge function ships). `course` is the interactive golf-hole navigator (`components/hole/`, config in `constants/hole.ts`, geometry in `lib/holePath.ts` + `lib/courseNav.ts`, aerial asset regenerated by `scripts/stitch-hole16.mjs`): swipe up/down steps the ball between stops, pinch toggles a whole-hole overview where tapping a flag enters its section directly. A floating two-button `ToggleBar` (`components/ui/ToggleBar.tsx`) switches Scratch ↔ Sections via `router.replace`. There is no tab bar.
```

- [ ] **Step 2: Full verification** — `npx tsc --noEmit && npm test` (expect 17 tests green). `git status` clean apart from this task's edit.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md for Scratch home + course navigation v2"
```

- [ ] **Step 4: Human device pass (Tommy, Expo Go)** — the boxes only a phone can tick:
1. App opens on Scratch: mascot (with club), daily read, overview cards below it, chat bar, toggle — nothing clipped by the home indicator.
2. Toggle bounces Scratch ↔ Sections with the springy indicator; both directions.
3. Overview cards navigate into their sections; back chevron returns.
4. Course: swipe up/down glides the ball stop to stop; no teleporting.
5. Pinch out → whole hole visible, flags highlighted; tap a flag → straight into that section. Pinch in → travel mode returns.
6. Preview card sits fully above the toggle bar.
7. Chat: send a message, get Scratch's placeholder reply; keyboard doesn't cover the input.
8. Dark mode + Reduce Motion still behave.

---

## Self-Review Notes

- **Spec coverage (Project A):** toggle (T2), Scratch header/mascot-with-club (T4), daily read + overview-below-AI (T5), chat placeholder (T6), swipe travel + pinch overview + direct flag tap + card raise (T3), pure helpers with tests (T1), docs (T7). Project B intentionally excluded (own plan).
- **Type consistency:** `useCourseNav` return names match course.tsx usage; `TOGGLE_BAR_CLEARANCE` consumed in T3 step 4, T4, T6; `ScratchMascot { size }` used at 120/40; `ChatSheet { visible, onClose }` matches usage.
- **Known tuning points (not placeholders):** mascot path coordinates and pinch/travel timing constants are concrete starting values; the device pass is the tuning loop.
