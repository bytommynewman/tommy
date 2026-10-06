// Pure helpers for the cannabis quit tracker. Everything takes already-fetched
// rows and returns derived values — no Supabase, no React — so it is unit
// tested in isolation (lib/__tests__/quitLogic.test.ts).

import { differenceInCalendarDays, differenceInMinutes, format, getHours, parseISO } from 'date-fns';
import type { Craving, QuitAttempt, QuitMilestone, WithdrawalCheckin } from '../types/database.types';
import { CWS_ITEMS } from '../constants/quit';

// Day 0 = the calendar day the quit started; day 1 = the first full day.
export function quitDayNumber(attempt: Pick<QuitAttempt, 'started_at'>, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, parseISO(attempt.started_at)));
}

export function hoursSinceQuit(attempt: Pick<QuitAttempt, 'started_at'>, now: Date = new Date()): number {
  return Math.max(0, differenceInMinutes(now, parseISO(attempt.started_at)) / 60);
}

// Money not spent, in cents, prorated by elapsed time against the weekly baseline.
export function moneySavedCents(
  attempt: Pick<QuitAttempt, 'started_at' | 'baseline_cost_cents_per_week'>,
  now: Date = new Date()
): number {
  const weeks = hoursSinceQuit(attempt, now) / (24 * 7);
  return Math.round(weeks * attempt.baseline_cost_cents_per_week);
}

export function formatCad(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function cwsTotal(items: Record<string, number> | null | undefined): number | null {
  if (!items) return null;
  let total = 0;
  let answered = 0;
  for (const item of CWS_ITEMS) {
    const v = items[item.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      total += Math.min(10, Math.max(0, v));
      answered += 1;
    }
  }
  return answered === 0 ? null : total;
}

export type CheckinSummary = {
  daysLogged: number;
  cleanDays: number; // check-ins with used_cannabis = false
  cleanPercent: number | null;
  avg: Partial<Record<'sleep_quality' | 'appetite' | 'mood' | 'anxiety' | 'irritability' | 'energy' | 'craving_peak', number>>;
  // Last-3-days average minus first-3-days average for the "getting better" readout.
  trend: Partial<Record<'sleep_quality' | 'appetite' | 'mood' | 'anxiety' | 'irritability' | 'energy' | 'craving_peak', number>>;
};

const SCALE_KEYS = ['sleep_quality', 'appetite', 'mood', 'anxiety', 'irritability', 'energy', 'craving_peak'] as const;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// "Clean days this attempt" is deliberately shown alongside the streak: a
// slip costs one day in this number instead of zeroing everything, which is
// what keeps a slip from turning into "well, the streak's gone anyway".
export function summarizeCheckins(checkins: WithdrawalCheckin[]): CheckinSummary {
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const cleanDays = sorted.filter((c) => !c.used_cannabis).length;
  const avg: CheckinSummary['avg'] = {};
  const trend: CheckinSummary['trend'] = {};
  for (const key of SCALE_KEYS) {
    const vals = sorted.map((c) => c[key]).filter((v): v is number => typeof v === 'number');
    const m = mean(vals);
    if (m !== null) avg[key] = Math.round(m * 10) / 10;
    if (vals.length >= 4) {
      const head = mean(vals.slice(0, 3));
      const tail = mean(vals.slice(-3));
      if (head !== null && tail !== null) trend[key] = Math.round((tail - head) * 10) / 10;
    }
  }
  return {
    daysLogged: sorted.length,
    cleanDays,
    cleanPercent: sorted.length === 0 ? null : Math.round((cleanDays / sorted.length) * 100),
    avg,
    trend,
  };
}

export type CravingStats = {
  total: number;
  passed: number;
  passedPercent: number | null;
  avgIntensity: number | null;
  avgDurationMinutes: number | null;
  // Average drop from intensity → intensity_after where both were recorded.
  avgDrop: number | null;
  topTriggers: { tag: string; count: number }[];
  // 0–23 → count. Shows the user their own danger window.
  byHour: number[];
  peakHours: number[]; // up to 3 hours with the most cravings
  haltCounts: { hungry: number; angry: number; lonely: number; tired: number };
};

export function summarizeCravings(cravings: Craving[]): CravingStats {
  const total = cravings.length;
  const passed = cravings.filter((c) => c.outcome === 'passed').length;
  const intensities = cravings.map((c) => c.intensity);
  const durations = cravings.map((c) => c.duration_minutes).filter((v): v is number => typeof v === 'number');
  const drops = cravings
    .filter((c) => typeof c.intensity_after === 'number')
    .map((c) => c.intensity - (c.intensity_after as number));
  const tagCounts = new Map<string, number>();
  for (const c of cravings) for (const t of c.trigger_tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTriggers = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 5);
  const byHour = new Array<number>(24).fill(0);
  for (const c of cravings) byHour[getHours(parseISO(c.occurred_at))] += 1;
  const peakHours = byHour
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, 3)
    .map((h) => h.hour);
  const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
  return {
    total,
    passed,
    passedPercent: total === 0 ? null : Math.round((passed / total) * 100),
    avgIntensity: r1(mean(intensities)),
    avgDurationMinutes: r1(mean(durations)),
    avgDrop: r1(mean(drops)),
    topTriggers,
    byHour,
    peakHours,
    haltCounts: {
      hungry: cravings.filter((c) => c.hungry).length,
      angry: cravings.filter((c) => c.angry).length,
      lonely: cravings.filter((c) => c.lonely).length,
      tired: cravings.filter((c) => c.tired).length,
    },
  };
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

// The HALT read: when one of hungry/angry/lonely/tired is on, the craving is
// usually a proxy for that. Returns the one-line suggestion for the top flag.
export function haltSuggestion(flags: { hungry: boolean; angry: boolean; lonely: boolean; tired: boolean }): string | null {
  if (flags.hungry) return 'Hungry reads as craving. Eat first, then re-rate it.';
  if (flags.tired) return 'Tired makes everything louder. Can this be an early night instead of a hit?';
  if (flags.angry) return 'Angry wants a fast exit. Move your body — walk or a hard set — before deciding anything.';
  if (flags.lonely) return 'Lonely is the one weed is worst at fixing. Text someone who knows.';
  return null;
}

export function nextMilestone(milestones: QuitMilestone[], day: number): QuitMilestone | null {
  return (
    [...milestones].filter((m) => m.day_number > day).sort((a, b) => a.day_number - b.day_number)[0] ?? null
  );
}

// Milestones whose day has arrived but which have not been marked reached.
export function milestonesDue(milestones: QuitMilestone[], day: number): QuitMilestone[] {
  return milestones.filter((m) => m.day_number <= day && !m.reached_at).sort((a, b) => a.day_number - b.day_number);
}

export function todayKey(now: Date = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}

export function hasCheckedInToday(checkins: WithdrawalCheckin[], now: Date = new Date()): boolean {
  const today = todayKey(now);
  return checkins.some((c) => c.checkin_date === today);
}

// Evening + weekend nights are the documented high-risk window for this
// user (late-night use, bars Thu–Sat). Used to decide which nudge to show.
export function isRiskWindow(now: Date = new Date()): boolean {
  const hour = getHours(now);
  const dow = now.getDay(); // 0 Sun … 6 Sat
  const lateNight = hour >= 21 || hour < 2;
  const barNight = dow === 4 || dow === 5 || dow === 6;
  return lateNight || (barNight && hour >= 18);
}

// Longest run of consecutive clean check-in days (by calendar date). Shown
// beside the current streak so a slip costs the current run, never the best.
export function longestCleanRun(checkins: WithdrawalCheckin[]): number {
  const clean = new Set(checkins.filter((c) => !c.used_cannabis).map((c) => c.checkin_date));
  const dates = [...clean].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

// Last N calendar days (oldest → newest) mapped to a scale value or null when
// there is no check-in for that date. Feeds the dashboard trend bars.
export function dailySeries(
  checkins: WithdrawalCheckin[],
  key: 'sleep_quality' | 'appetite' | 'mood' | 'anxiety' | 'irritability' | 'energy' | 'craving_peak',
  days: number,
  now: Date = new Date()
): (number | null)[] {
  const byDate = new Map(checkins.map((c) => [c.checkin_date, c]));
  const out: (number | null)[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const row = byDate.get(format(d, 'yyyy-MM-dd'));
    const v = row?.[key];
    out.push(typeof v === 'number' ? v : null);
  }
  return out;
}
