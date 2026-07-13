import { describe, expect, it } from 'vitest';
import { format, subDays } from 'date-fns';
import { bestBuildStreak, bestDaysClean, formatVsPar, recoveryStatus, todaysCard, vsLastWeek } from '../hudStats';
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

describe('bestBuildStreak', () => {
  it('returns the longest current streak across build habits', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b' }), habit({ id: 'r', kind: 'recovery' })];
    const logs = [
      log({ id: '1', habit_id: 'a', log_date: day(0) }),
      log({ id: '2', habit_id: 'a', log_date: day(1) }),
      log({ id: '3', habit_id: 'a', log_date: day(2) }),
      log({ id: '4', habit_id: 'b', log_date: day(0) }),
    ];
    expect(bestBuildStreak(habits, logs)).toBe(3);
  });
  it('returns null when there are no build habits', () => {
    expect(bestBuildStreak([habit({ kind: 'recovery' })], [])).toBeNull();
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
  it('is open with no habits', () => {
    expect(recoveryStatus([], [], [], TODAY)).toEqual({ text: 'open', tone: 'muted' });
  });
  it('flags open habits today', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b' })];
    const logs = [log({ habit_id: 'a', log_date: TODAY, status: 'done' })];
    expect(recoveryStatus(habits, logs, [], TODAY)).toEqual({ text: '1 open today', tone: 'warn' });
  });
  it('shows the clean-day count when the card is clean', () => {
    const habits = [habit({ id: 'a', kind: 'recovery' })];
    const logs = [log({ habit_id: 'a', log_date: TODAY, status: 'done' })];
    expect(recoveryStatus(habits, logs, [], TODAY)).toEqual({ text: 'clean · day 30', tone: 'good' });
  });
});
