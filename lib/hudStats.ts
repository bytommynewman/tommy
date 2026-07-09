import { format, parseISO, subDays } from 'date-fns';
import type { Habit, HabitLog, RelapseIncident } from '../types/database.types';
import { buildStreak, daysClean } from './streaks';

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

// Longest current streak across "build" habits (gym, reading, …) — the
// headline number when the user tracks no recovery habits.
export function bestBuildStreak(habits: Habit[], logs: HabitLog[]): number | null {
  const build = habits.filter((h) => h.kind === 'build');
  if (build.length === 0) return null;
  return Math.max(...build.map((h) => buildStreak(h, logs)));
}

// Momentum: habits done in the last 7 days minus the 7 days before that.
// Positive = better week. formatVsPar flips the sign for golf display,
// where under par (negative) is the good direction.
export function vsLastWeek(logs: HabitLog[], today: string): number {
  // parseISO, not new Date(): a bare YYYY-MM-DD through new Date() is read as
  // UTC midnight and shifts the whole window a day in western timezones.
  const dayStrings = (startOffset: number) =>
    new Set(Array.from({ length: 7 }, (_, i) => format(subDays(parseISO(today), startOffset + i), 'yyyy-MM-dd')));
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
