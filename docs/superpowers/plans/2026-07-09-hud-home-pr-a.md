# HUD Home "Agency HQ" (PR A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home screen with the approved spy-HUD "Agency HQ" design (briefing card, stat chips, 5-hole scorecard, radio chat bar) plus the shared HUD field kit, per `docs/superpowers/specs/2026-07-09-hud-lookfeel-design.md`.

**Architecture:** Re-skin in place — all data hooks (`useDailyRead`, `useHabits`, `useRecentLogs`, `useRelapses`, `useProfile`, chat hooks) and the ChatSheet/ToggleBar logic are kept; only presentation is replaced. New pure stat helpers live in `lib/hudStats.ts` (unit-tested). HUD visual primitives live in `components/hud/`.

**Tech Stack:** Expo (Go-compatible only — no native rebuild), React Native, Reanimated 4, expo-font + `@expo-google-fonts/jetbrains-mono`, TanStack Query (existing hooks), vitest for pure lib functions.

## Global Constraints

- Branch: `hud-lookfeel` (already exists, has the spec). PR A targets `main`.
- Must run in Expo Go — JS-only dependencies.
- HUD screens are always dark: use `HUD_COLORS` literals from `constants/hud.ts`, NOT `useTheme()` (sanctioned exception, same pattern as `SCENE_COLORS` in `constants/hole.ts`).
- All animation respects `useReducedMotion()` from `react-native-reanimated` (render instantly / skip effects when true).
- No changes under `supabase/`, `lib/api/`, `lib/hooks/` (hooks are consumed, not modified), `types/`, or migrations.
- HUD copy is lowercase mono-terminal style: `field unit SCR-16`, `the read:`, `> radio your caddie_`.
- After every task: `npx tsc --noEmit` passes and `npm test` passes (22 existing tests + new ones).
- Commit after every task with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Field kit constants + mono font

**Files:**
- Create: `constants/hud.ts`
- Modify: `app/_layout.tsx` (font loading)
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: `HUD_COLORS` (object of color strings), `HUD_FONT`, `HUD_FONT_BOLD` (font family name strings) — every later task imports these from `../../constants/hud`.

- [ ] **Step 1: Install the font package**

Run: `npm install @expo-google-fonts/jetbrains-mono`
Expected: adds one dependency, no peer warnings that mention native code.

- [ ] **Step 2: Create `constants/hud.ts`**

```ts
// Field-kit tokens for the always-dark HUD screens (home + course).
// Sanctioned literal colors — the HUD has no light mode, so these bypass
// useTheme() the same way SCENE_COLORS does. Never use these on the inner
// section screens; those stay on theme tokens until their own design passes.
export const HUD_COLORS = {
  bg: '#071410', // page background
  panel: '#04241b', // raised panel fill
  panelDeep: '#04342C', // avatar frame / deepest fill
  line: '#0F6E56', // hairline borders
  lineBright: '#1D9E75', // emphasized borders (chat bar, avatar frame)
  mint: '#5DCAA5', // primary accent, active states, good news
  mintSoft: '#9FE1CB', // secondary text
  text: '#E1F5EE', // primary text
  amber: '#FAC775', // needs-attention / open items
} as const;

// Loaded in app/_layout.tsx via @expo-google-fonts/jetbrains-mono.
export const HUD_FONT = 'JetBrainsMono_400Regular';
export const HUD_FONT_BOLD = 'JetBrainsMono_700Bold';

export const HUD_RADIUS = 4; // tight corners — HUD panels are not bubbly
```

- [ ] **Step 3: Load the fonts in `app/_layout.tsx`**

Add to imports:

```tsx
import { useFonts, JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
```

In `RootLayout`, before the return:

```tsx
export default function RootLayout() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });
  if (!fontsLoaded) return null; // brief blank on first launch only; fonts are cached after
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    ...
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — Expected: no output (pass).
Run: `npm test` — Expected: `Tests  22 passed (22)`.

- [ ] **Step 5: Commit**

```bash
git add constants/hud.ts app/_layout.tsx package.json package-lock.json
git commit -m "Add HUD field-kit constants and JetBrains Mono font"
```

---

### Task 2: `lib/hudStats.ts` pure stat helpers (TDD)

**Files:**
- Create: `lib/hudStats.ts`
- Test: `lib/__tests__/hudStats.test.ts`

**Interfaces:**
- Consumes: `Habit`, `HabitLog`, `RelapseIncident` from `types/database.types.ts`; `daysClean` from `lib/streaks.ts` (signature: `daysClean(habit: Habit, relapses: RelapseIncident[]): number`).
- Produces (Task 4 imports these):
  - `todaysCard(habits: Habit[], logs: HabitLog[], today: string): { done: number; total: number }`
  - `bestDaysClean(habits: Habit[], relapses: RelapseIncident[]): number | null` (null when no recovery habits)
  - `vsLastWeek(logs: HabitLog[], today: string): number` (done-count last 7 days minus the 7 before; positive = improved)
  - `formatVsPar(delta: number): { text: string; tone: 'good' | 'warn' | 'muted' }` (golf display: improvement shows under par `-2`, decline `+2`, unchanged `E`)
  - `recoveryStatus(habits: Habit[], logs: HabitLog[], relapses: RelapseIncident[], today: string): { text: string; tone: 'good' | 'warn' | 'muted' }`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/hudStats.test.ts`. Test-data helpers keep the required-field noise out of the cases; dates are built with `date-fns` relative to now so `daysClean` (which uses the real clock) stays deterministic.

```ts
import { describe, expect, it } from 'vitest';
import { format, subDays } from 'date-fns';
import { bestDaysClean, formatVsPar, recoveryStatus, todaysCard, vsLastWeek } from '../hudStats';
import type { Habit, HabitLog, RelapseIncident } from '../../types/database.types';

const day = (offset: number) => format(subDays(new Date(), offset), 'yyyy-MM-dd');
const TODAY = day(0);

function habit(over: Partial<Habit>): Habit {
  return {
    id: 'h1', user_id: 'u', name: 'gym', kind: 'build', category: null,
    target_type: 'boolean', target_value: null, color: null, is_archived: false,
    created_at: subDays(new Date(), 30).toISOString(), updated_at: '', ...over,
  };
}
function log(over: Partial<HabitLog>): HabitLog {
  return {
    id: 'l1', user_id: 'u', habit_id: 'h1', log_date: TODAY, status: 'done',
    value: null, craving_intensity: null, notes: null, created_at: '', updated_at: '', ...over,
  };
}
function relapse(over: Partial<RelapseIncident>): RelapseIncident {
  return {
    id: 'r1', user_id: 'u', habit_id: 'h1', occurred_at: subDays(new Date(), 12).toISOString(),
    trigger: null, trigger_tags: [], amount: null, severity: null, support_used: false,
    notes: null, created_at: '', updated_at: '', ...over,
  };
}

describe('todaysCard', () => {
  it('counts done-today logs against total habits', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b' }), habit({ id: 'c' })];
    const logs = [
      log({ habit_id: 'a', log_date: TODAY, status: 'done' }),
      log({ habit_id: 'b', log_date: TODAY, status: 'skipped' }),
      log({ habit_id: 'c', log_date: day(1), status: 'done' }),
    ];
    expect(todaysCard(habits, logs, TODAY)).toEqual({ done: 1, total: 3 });
  });
  it('handles no habits', () => {
    expect(todaysCard([], [], TODAY)).toEqual({ done: 0, total: 0 });
  });
});

describe('bestDaysClean', () => {
  it('returns the max clean streak across recovery habits', () => {
    const habits = [
      habit({ id: 'a', kind: 'recovery' }),
      habit({ id: 'b', kind: 'recovery' }),
      habit({ id: 'c', kind: 'build' }),
    ];
    const relapses = [relapse({ habit_id: 'a', occurred_at: subDays(new Date(), 3).toISOString() })];
    expect(bestDaysClean(habits, relapses)).toBe(30); // b: clean since creation 30d ago
  });
  it('returns null when there are no recovery habits', () => {
    expect(bestDaysClean([habit({ kind: 'build' })], [])).toBeNull();
  });
});

describe('vsLastWeek', () => {
  it('is done-count of last 7 days minus the 7 days before', () => {
    const logs = [
      log({ id: '1', log_date: day(0) }),
      log({ id: '2', log_date: day(6) }),
      log({ id: '3', log_date: day(7) }),
      log({ id: '4', log_date: day(13) }),
      log({ id: '5', log_date: day(14) }), // outside both windows
      log({ id: '6', log_date: day(1), status: 'skipped' }), // not done
    ];
    expect(vsLastWeek(logs, TODAY)).toBe(0); // 2 recent - 2 prior
    expect(vsLastWeek(logs.slice(0, 2), TODAY)).toBe(2);
  });
});

describe('formatVsPar', () => {
  it('shows improvement as under par', () => {
    expect(formatVsPar(2)).toEqual({ text: '-2', tone: 'good' });
  });
  it('shows decline as over par', () => {
    expect(formatVsPar(-3)).toEqual({ text: '+3', tone: 'warn' });
  });
  it('shows even', () => {
    expect(formatVsPar(0)).toEqual({ text: 'E', tone: 'muted' });
  });
});

describe('recoveryStatus', () => {
  it('is standby with no habits', () => {
    expect(recoveryStatus([], [], [], TODAY)).toEqual({ text: 'standby', tone: 'muted' });
  });
  it('flags open habits today', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b' })];
    const logs = [log({ habit_id: 'a', log_date: TODAY, status: 'done' })];
    expect(recoveryStatus(habits, logs, [], TODAY)).toEqual({ text: 'attention · 1 open', tone: 'warn' });
  });
  it('is secure with a day count when the card is clean', () => {
    const habits = [habit({ id: 'a', kind: 'recovery' })];
    const logs = [log({ habit_id: 'a', log_date: TODAY, status: 'done' })];
    expect(recoveryStatus(habits, logs, [], TODAY)).toEqual({ text: 'secure · day 30', tone: 'good' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../hudStats'` (or equivalent), existing 22 still pass.

- [ ] **Step 3: Implement `lib/hudStats.ts`**

```ts
import { format, subDays } from 'date-fns';
import type { Habit, HabitLog, RelapseIncident } from '../types/database.types';
import { daysClean } from './streaks';

export function todaysCard(habits: Habit[], logs: HabitLog[], today: string): { done: number; total: number } {
  const doneIds = new Set(
    logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
  );
  return { done: habits.filter((h) => doneIds.has(h.id)).length, total: habits.length };
}

export function bestDaysClean(habits: Habit[], relapses: RelapseIncident[]): number | null {
  const recovery = habits.filter((h) => h.kind === 'recovery');
  if (recovery.length === 0) return null;
  return Math.max(...recovery.map((h) => daysClean(h, relapses)));
}

// Momentum: habits done in the last 7 days minus the 7 days before that.
// Positive = better week. formatVsPar flips the sign for golf display,
// where under par (negative) is the good direction.
export function vsLastWeek(logs: HabitLog[], today: string): number {
  const dayStrings = (startOffset: number) =>
    new Set(Array.from({ length: 7 }, (_, i) => format(subDays(new Date(today), startOffset + i), 'yyyy-MM-dd')));
  const recent = dayStrings(0);
  const prior = dayStrings(7);
  const done = logs.filter((l) => l.status === 'done');
  return done.filter((l) => recent.has(l.log_date)).length - done.filter((l) => prior.has(l.log_date)).length;
}

export type HudTone = 'good' | 'warn' | 'muted';

export function formatVsPar(delta: number): { text: string; tone: HudTone } {
  if (delta > 0) return { text: `-${delta}`, tone: 'good' };
  if (delta < 0) return { text: `+${-delta}`, tone: 'warn' };
  return { text: 'E', tone: 'muted' };
}

export function recoveryStatus(
  habits: Habit[],
  logs: HabitLog[],
  relapses: RelapseIncident[],
  today: string
): { text: string; tone: HudTone } {
  if (habits.length === 0) return { text: 'standby', tone: 'muted' };
  const { done, total } = todaysCard(habits, logs, today);
  const open = total - done;
  if (open > 0) return { text: `attention · ${open} open`, tone: 'warn' };
  const best = bestDaysClean(habits, relapses);
  return { text: best !== null ? `secure · day ${best}` : 'secure', tone: 'good' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all suites pass (22 existing + the new hudStats tests).

- [ ] **Step 5: Commit**

```bash
git add lib/hudStats.ts lib/__tests__/hudStats.test.ts
git commit -m "Add hudStats helpers for the Agency HQ stat chips and scorecard"
```

---

### Task 3: HUD primitives — `GlowBox` and `Typewriter`

**Files:**
- Create: `components/hud/GlowBox.tsx`
- Create: `components/hud/Typewriter.tsx`

**Interfaces:**
- Produces:
  - `GlowBox({ children, glow?: boolean, style?: ViewStyle })` — bordered HUD panel; `glow` adds the soft mint edge (iOS shadow; falls back to plain border on Android — acceptable, Tommy is on iPhone).
  - `Typewriter({ text: string, style?: TextStyle, charMs?: number })` — types `text` in; instant when reduce-motion is on or `charMs` is 0.

- [ ] **Step 1: Create `components/hud/GlowBox.tsx`**

```tsx
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { HUD_COLORS, HUD_RADIUS } from '../../constants/hud';

// HUD panel: hairline teal border over deep-green panel fill. `glow` adds a
// soft mint edge via shadow — iOS-only by design (Expo Go target is iPhone);
// Android quietly renders the plain border.
export function GlowBox({
  children,
  glow = false,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: HUD_COLORS.panel,
          borderWidth: 0.75,
          borderColor: glow ? HUD_COLORS.lineBright : HUD_COLORS.line,
          borderRadius: HUD_RADIUS,
        },
        glow && {
          shadowColor: HUD_COLORS.mint,
          shadowOpacity: 0.45,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Create `components/hud/Typewriter.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// Types text in character-by-character, terminal style. Reduced motion (or
// charMs 0) renders instantly. Re-runs when `text` changes (new daily read).
export function Typewriter({
  text,
  style,
  charMs = 18,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  charMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  const instant = reduceMotion || charMs <= 0;
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, charMs);
    return () => clearInterval(timer);
  }, [text, charMs, instant]);

  return <Text style={style}>{text.slice(0, count)}</Text>;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: all pass (components are exercised on-device; vitest covers pure lib only, per repo convention).

- [ ] **Step 4: Commit**

```bash
git add components/hud/GlowBox.tsx components/hud/Typewriter.tsx
git commit -m "Add HUD primitives: GlowBox panel and Typewriter text"
```

---

### Task 4: Agency HQ home screen

**Files:**
- Create: `components/hud/BriefingCard.tsx`
- Create: `components/hud/StatChips.tsx`
- Create: `components/hud/ScorecardList.tsx`
- Modify: `app/(tabs)/index.tsx` (full rewrite of presentation; hooks kept)
- Delete: `components/scratch/DailyReadCard.tsx`, `components/scratch/SectionOverviewGrid.tsx` (their data logic moves into the new components; nothing else imports them — verify with grep before deleting)

**Interfaces:**
- Consumes: `HUD_COLORS`, `HUD_FONT`, `HUD_FONT_BOLD`, `HUD_RADIUS` (Task 1); `todaysCard`, `bestDaysClean`, `vsLastWeek`, `formatVsPar`, `recoveryStatus` (Task 2); `GlowBox`, `Typewriter` (Task 3); existing hooks `useDailyRead`, `useHabits`, `useRecentLogs(14)`, `useRelapses`, `useProfile`; `ScratchMascot`; `STOPS` from `constants/hole.ts`; `ChatSheet`, `ToggleBar`, `TOGGLE_BAR_CLEARANCE`.
- Produces: the new home screen. `toneColor(tone)` helper exported from `StatChips.tsx` and reused by `ScorecardList.tsx`.

- [ ] **Step 1: Create `components/hud/BriefingCard.tsx`**

Keeps DailyReadCard's exact data behavior (agent read preferred, local fallback lines, graceful not-connected copy) but renders as the briefing panel with typewriter text.

```tsx
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { GlowBox } from './GlowBox';
import { Typewriter } from './Typewriter';
import { ScratchMascot } from '../scratch/ScratchMascot';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { useDailyRead } from '../../lib/hooks/useScratch';
import { daysClean } from '../../lib/streaks';

// Same data contract as the old DailyReadCard: prefer the agent-written read,
// fall back to a locally composed read whenever the agent one isn't ready.
export function BriefingCard() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const { data: agentRead, isLoading } = useDailyRead();

  const fallback = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneIds = new Set(
      logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
    );
    const remaining = habits.length - habits.filter((h) => doneIds.has(h.id)).length;
    const out: string[] = [];
    if (habits.length === 0) {
      out.push('no habits on the card yet — set up your first ones in recovery.');
    } else if (remaining === 0) {
      out.push('card is clean — everything checked off today. that is how rounds are won.');
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
    return out.join(' ');
  }, [habits, logs, relapses]);

  const read = agentRead?.reply ? agentRead.reply.replace(/\n+/g, ' ') : null;
  const body = isLoading && !read ? 'decrypting today’s read…' : `the read: ${read ?? fallback}`;

  return (
    <GlowBox glow style={{ padding: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: HUD_RADIUS,
            backgroundColor: HUD_COLORS.panelDeep,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <ScratchMascot size={58} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 14, color: HUD_COLORS.text }}>
            agent scratch · caddie
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint, marginTop: 2 }}>
            on your bag · channel secure
          </Text>
        </View>
      </View>
      <Typewriter
        text={body}
        style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 20, color: HUD_COLORS.mintSoft, marginTop: 10 }}
      />
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginTop: 8 }}>
        {read ? 'read by scratch · refreshes daily' : 'local read — scratch will take over when connected'}
      </Text>
    </GlowBox>
  );
}
```

- [ ] **Step 2: Create `components/hud/StatChips.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { HUD_COLORS, HUD_FONT_BOLD, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { bestDaysClean, formatVsPar, todaysCard, vsLastWeek, type HudTone } from '../../lib/hudStats';

export function toneColor(tone: HudTone): string {
  if (tone === 'good') return HUD_COLORS.mint;
  if (tone === 'warn') return HUD_COLORS.amber;
  return HUD_COLORS.mintSoft;
}

function Chip({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 18, color }}>{value}</Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export function StatChips() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(14);
  const { data: relapses = [] } = useRelapses();
  const today = format(new Date(), 'yyyy-MM-dd');

  const card = todaysCard(habits, logs, today);
  const clean = bestDaysClean(habits, relapses);
  const par = formatVsPar(vsLastWeek(logs, today));

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <Chip value={clean !== null ? String(clean) : '—'} label="days clean" color={HUD_COLORS.mint} />
      <Chip value={`${card.done}/${card.total}`} label="today's card" color={HUD_COLORS.mint} />
      <Chip value={par.text} label="vs. last week" color={toneColor(par.tone)} />
    </View>
  );
}
```

- [ ] **Step 3: Create `components/hud/ScorecardList.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { recoveryStatus } from '../../lib/hudStats';
import { toneColor } from './StatChips';

// The five app sections as holes on a scorecard. Recovery shows live status;
// the rest are standby until their sections get real data layers.
export function ScorecardList() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const today = format(new Date(), 'yyyy-MM-dd');
  const recovery = recoveryStatus(habits, logs, relapses, today);

  return (
    <View>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginBottom: 6 }}>
        {'// the course — 5 holes'}
      </Text>
      <View style={{ gap: 6 }}>
        {STOPS.map((stop, i) => {
          const status =
            stop.label === 'Recovery' ? recovery : ({ text: 'standby', tone: 'muted' } as const);
          const active = status.tone !== 'muted';
          return (
            <Pressable
              key={stop.label}
              onPress={() => router.push(stop.route)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${stop.label}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.line,
                borderRadius: HUD_RADIUS,
                backgroundColor: active ? HUD_COLORS.panel : 'transparent',
                paddingVertical: 12,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="flag-outline" size={15} color={active ? HUD_COLORS.mint : HUD_COLORS.mintSoft} />
              <Text style={{ fontFamily: HUD_FONT, fontSize: 13, color: HUD_COLORS.text, flex: 1 }}>
                {`${i + 1} · ${stop.label.toLowerCase()}`}
              </Text>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: toneColor(status.tone) }}>
                {status.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Rewrite `app/(tabs)/index.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar, TOGGLE_BAR_CLEARANCE } from '../../components/ui/ToggleBar';
import { BriefingCard } from '../../components/hud/BriefingCard';
import { StatChips } from '../../components/hud/StatChips';
import { ScorecardList } from '../../components/hud/ScorecardList';
import { ChatSheet } from '../../components/scratch/ChatSheet';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';

export default function ScratchScreen() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);
  const now = new Date();

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + TOGGLE_BAR_CLEARANCE + 24 + 56,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint }}>
            field unit SCR-16
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>
            {format(now, 'EEE MM.dd · HH:mm').toLowerCase()}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginTop: 2, marginBottom: 12 }}>
          <Text
            style={{
              fontFamily: HUD_FONT,
              fontSize: 10,
              color: HUD_COLORS.mintSoft,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.line,
              borderRadius: 2,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            clearance: scratch
          </Text>
        </View>
        <BriefingCard />
        <StatChips />
        <ScorecardList />
      </ScrollView>
      <Pressable
        onPress={() => setChatOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Chat with Scratch"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + TOGGLE_BAR_CLEARANCE + 12,
          backgroundColor: HUD_COLORS.panel,
          borderRadius: HUD_RADIUS,
          borderWidth: 0.75,
          borderColor: HUD_COLORS.lineBright,
          paddingVertical: 12,
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mint }}>
          {'> radio your caddie_'}
        </Text>
      </Pressable>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
      <ToggleBar active="scratch" />
    </View>
  );
}
```

- [ ] **Step 5: Delete the superseded components**

Run: `grep -rn "DailyReadCard\|SectionOverviewGrid" app/ components/ lib/`
Expected: no matches outside the two files themselves. Then:

```bash
git rm components/scratch/DailyReadCard.tsx components/scratch/SectionOverviewGrid.tsx
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Rebuild home screen as Agency HQ HUD (briefing, stat chips, scorecard)"
```

---

### Task 5: Restyle ChatSheet and ToggleBar to HUD

**Files:**
- Modify: `components/scratch/ChatSheet.tsx` (styles + copy only; ALL state/data logic unchanged)
- Modify: `components/ui/ToggleBar.tsx` (colors, font, labels)

**Interfaces:**
- Consumes: `HUD_COLORS`, `HUD_FONT` from `constants/hud.ts`.
- Produces: no API changes — `ChatSheet({ visible, onClose })` and `ToggleBar({ active })` keep their exact props.

- [ ] **Step 1: Restyle ChatSheet**

Do not touch hooks, handlers, message assembly, or error states. Replace theme-token styling with HUD values using this mapping (apply everywhere the old token appears in the file):

| Replace | With |
| --- | --- |
| sheet/background `colors.background` / `colors.surface` | `HUD_COLORS.bg` / `HUD_COLORS.panel` |
| borders `colors.border` | `HUD_COLORS.line` |
| user bubble fill `colors.primary` | `HUD_COLORS.panelDeep` with `borderColor: HUD_COLORS.lineBright` |
| scratch bubble fill | transparent with `borderWidth: 0.75, borderColor: HUD_COLORS.line` |
| primary text `colors.text` | `HUD_COLORS.text` |
| muted text `colors.textMuted` / `colors.textFaint` | `HUD_COLORS.mintSoft` |
| accent `colors.accent` / `colors.primary` (icons, send) | `HUD_COLORS.mint` |
| every `typography.*` text style | add `fontFamily: HUD_FONT` (keep sizes) |
| bubble `borderRadius` | `HUD_RADIUS + 2` |

Copy changes (exact strings, logic untouched):
- typing indicator `'Scratch is reading the green…'` → `'scratch is reading the green…'`
- input placeholder at `ChatSheet.tsx:233`: `"Ask Scratch anything…"` → `"transmit to scratch…"` (and `placeholderTextColor` on the next line → `HUD_COLORS.mintSoft`)

- [ ] **Step 2: Restyle ToggleBar**

In `components/ui/ToggleBar.tsx`:
- `items` labels: `'SCRATCH'` → `'hq'`, `'SECTIONS'` → `'course'` (keys and routes unchanged).
- Bar container: `backgroundColor: HUD_COLORS.panel`, `borderColor: HUD_COLORS.line`; drop the `useTheme` import if no longer referenced.
- Active indicator pill: `backgroundColor: HUD_COLORS.panelDeep`, add `borderWidth: 0.75, borderColor: HUD_COLORS.lineBright`.
- Label `Text`: `fontFamily: HUD_FONT, fontSize: 12`; active color `HUD_COLORS.mint`, inactive `HUD_COLORS.mintSoft`; icon colors the same pair.
- Accessibility labels keep working (`Switch to hq` is fine).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add components/scratch/ChatSheet.tsx components/ui/ToggleBar.tsx
git commit -m "Restyle ChatSheet and ToggleBar to the HUD field kit"
```

---

### Task 6: Phone verification + PR A

**Files:** none (verification and delivery)

- [ ] **Step 1: Full check**

Run: `npx tsc --noEmit && npm test`
Expected: clean type check, all tests pass.

- [ ] **Step 2: Tommy's phone checklist (Expo Go)**

Ask Tommy to reload the app in Expo Go and confirm:
- Home opens dark with `field unit SCR-16` header and clearance chip
- Briefing card shows the mascot and the daily read **types itself out**
- Three stat chips show real numbers (days clean / today's card / vs. last week)
- All 5 scorecard rows navigate to their sections; Recovery row shows live status
- `> radio your caddie_` opens the chat; sending a message works; HUD-styled bubbles
- hq / course toggle bounces both ways; nothing hidden behind the home indicator

- [ ] **Step 3: Push and open PR A**

```bash
git push -u origin hud-lookfeel
gh pr create --title "Agency HQ home: spy-HUD redesign (PR A)" --body "Implements the home half of docs/superpowers/specs/2026-07-09-hud-lookfeel-design.md — field kit, briefing card with typewriter read, stat chips, 5-hole scorecard, HUD chat + toggle. Course page follows in PR B."
```

Tommy merges after his phone pass. PR B (satellite-feed course page) gets its own plan once this lands.
