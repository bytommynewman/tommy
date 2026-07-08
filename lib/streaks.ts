import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import type { Habit, HabitLog, RelapseIncident } from '../types/database.types';

// Streak for a "build" habit: consecutive days ending today (or yesterday,
// so an unlogged today doesn't zero the streak) with a 'done' log.
export function buildStreak(habit: Habit, logs: HabitLog[]): number {
  const doneDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.status === 'done').map((l) => l.log_date)
  );
  let streak = 0;
  let cursor = new Date();
  if (!doneDates.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subDays(cursor, 1);
  }
  while (doneDates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

// "Days since last relapse" for a recovery habit. If never relapsed, counts
// from the habit's creation date so the number always means something real.
export function daysClean(habit: Habit, relapses: RelapseIncident[]): number {
  const lastRelapse = relapses
    .filter((r) => r.habit_id === habit.id)
    .map((r) => parseISO(r.occurred_at))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const from = lastRelapse ?? parseISO(habit.created_at);
  return Math.max(0, differenceInCalendarDays(new Date(), from));
}
