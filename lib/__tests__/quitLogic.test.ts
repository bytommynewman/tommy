import { describe, expect, it } from 'vitest';
import { addDays, addHours, subDays } from 'date-fns';
import {
  cwsTotal,
  formatCad,
  formatHour,
  haltSuggestion,
  hasCheckedInToday,
  isRiskWindow,
  milestonesDue,
  moneySavedCents,
  nextMilestone,
  quitDayNumber,
  summarizeCheckins,
  summarizeCravings,
} from '../quitLogic';
import { cwsBand, phaseForDay, QUIT_PHASES } from '../../constants/quit';
import type { Craving, QuitMilestone, WithdrawalCheckin } from '../../types/database.types';

const START = new Date(2026, 9, 6, 15, 0, 0); // local Tue Oct 6 2026, 3pm

function checkin(over: Partial<WithdrawalCheckin>): WithdrawalCheckin {
  return {
    id: 'c', user_id: 'u', attempt_id: 'a', checkin_date: '2026-10-07',
    sleep_hours: null, sleep_quality: null, appetite: null, mood: null, anxiety: null,
    irritability: null, energy: null, craving_peak: null,
    vivid_dreams: false, night_sweats: false, headache: false, nausea: false,
    meals_count: null, ate_breakfast: false, worked_out: false, got_outside: false,
    used_cannabis: false, nicotine_level: null, drinks_count: null,
    cws_items: null, cws_total: null, cws_interference: null, win: null, notes: null,
    created_at: '', updated_at: '', ...over,
  };
}
function craving(over: Partial<Craving>): Craving {
  return {
    id: 'x', user_id: 'u', attempt_id: 'a', occurred_at: new Date(2026, 9, 7, 22, 30).toISOString(),
    intensity: 7, hungry: false, angry: false, lonely: false, tired: false, trigger_tags: [],
    context: null, coping_action: null, coping_tool_id: null, duration_minutes: null,
    outcome: null, intensity_after: null, notes: null, created_at: '', updated_at: '', ...over,
  };
}
function milestone(day: number, reached = false): QuitMilestone {
  return {
    id: `m${day}`, user_id: 'u', attempt_id: 'a', day_number: day, title: `day ${day}`,
    what_to_expect: null, reward: null, reached_at: reached ? START.toISOString() : null,
    reward_claimed: false, created_at: '', updated_at: '',
  };
}

describe('quitDayNumber', () => {
  const attempt = { started_at: START.toISOString() };
  it('is day 0 on the quit day regardless of hour', () => {
    expect(quitDayNumber(attempt, addHours(START, 6))).toBe(0);
  });
  it('is day 1 the next calendar morning even if under 24h', () => {
    expect(quitDayNumber(attempt, new Date(2026, 9, 7, 8, 0))).toBe(1);
  });
  it('never goes negative', () => {
    expect(quitDayNumber(attempt, subDays(START, 2))).toBe(0);
  });
});

describe('moneySavedCents', () => {
  it('prorates the weekly baseline by elapsed time', () => {
    const attempt = { started_at: START.toISOString(), baseline_cost_cents_per_week: 7000 };
    expect(moneySavedCents(attempt, addDays(START, 7))).toBe(7000);
    expect(moneySavedCents(attempt, addHours(START, 84))).toBe(3500);
  });
  it('formats dollars without noise', () => {
    expect(formatCad(7000)).toBe('$70');
    expect(formatCad(7050)).toBe('$70.50');
  });
});

describe('cwsTotal', () => {
  it('sums known items, clamps to 0..10, ignores unknown keys', () => {
    expect(cwsTotal({ headache: 4, nervous: 12, bogus: 9 })).toBe(14);
  });
  it('returns null when nothing answered', () => {
    expect(cwsTotal(null)).toBeNull();
    expect(cwsTotal({})).toBeNull();
  });
  it('bands totals readably', () => {
    expect(cwsBand(10)).toBe('mild');
    expect(cwsBand(150)).toBe('severe');
  });
});

describe('summarizeCheckins', () => {
  it('counts clean days as a percentage and averages scales', () => {
    const s = summarizeCheckins([
      checkin({ checkin_date: '2026-10-07', mood: 3, used_cannabis: false }),
      checkin({ checkin_date: '2026-10-08', mood: 5, used_cannabis: true }),
    ]);
    expect(s.daysLogged).toBe(2);
    expect(s.cleanDays).toBe(1);
    expect(s.cleanPercent).toBe(50);
    expect(s.avg.mood).toBe(4);
    expect(s.trend.mood).toBeUndefined(); // needs 4+ points
  });
  it('computes a last-3 minus first-3 trend once there are 4+ points', () => {
    const rows = [2, 3, 2, 5, 6, 7].map((mood, i) =>
      checkin({ checkin_date: `2026-10-${String(7 + i).padStart(2, '0')}`, mood })
    );
    const s = summarizeCheckins(rows);
    expect(s.trend.mood).toBe(3.7); // (5+6+7)/3 - (2+3+2)/3
  });
  it('handles no check-ins', () => {
    expect(summarizeCheckins([]).cleanPercent).toBeNull();
  });
});

describe('summarizeCravings', () => {
  it('reports pass rate, durations, drop, triggers and peak hours', () => {
    const s = summarizeCravings([
      craving({ outcome: 'passed', duration_minutes: 12, intensity: 8, intensity_after: 3, trigger_tags: ['bored', 'late night alone'] }),
      craving({ outcome: 'passed', duration_minutes: 20, intensity: 6, intensity_after: 2, trigger_tags: ['bored'] }),
      craving({ outcome: 'used', intensity: 9, trigger_tags: ['drunk'], occurred_at: new Date(2026, 9, 10, 1, 0).toISOString() }),
    ]);
    expect(s.total).toBe(3);
    expect(s.passedPercent).toBe(67);
    expect(s.avgDurationMinutes).toBe(16);
    expect(s.avgDrop).toBe(4.5);
    expect(s.topTriggers[0]).toEqual({ tag: 'bored', count: 2 });
    expect(s.peakHours[0]).toBe(22);
    expect(s.byHour[1]).toBe(1);
  });
  it('is safe on empty input', () => {
    const s = summarizeCravings([]);
    expect(s.passedPercent).toBeNull();
    expect(s.avgIntensity).toBeNull();
    expect(s.peakHours).toEqual([]);
  });
  it('formats hours', () => {
    expect(formatHour(0)).toBe('12am');
    expect(formatHour(13)).toBe('1pm');
    expect(formatHour(22)).toBe('10pm');
  });
});

describe('haltSuggestion', () => {
  it('prioritises hungry, then tired', () => {
    expect(haltSuggestion({ hungry: true, angry: true, lonely: false, tired: true })).toMatch(/Eat first/);
    expect(haltSuggestion({ hungry: false, angry: true, lonely: false, tired: true })).toMatch(/early night/);
    expect(haltSuggestion({ hungry: false, angry: false, lonely: false, tired: false })).toBeNull();
  });
});

describe('milestones', () => {
  const ms = [milestone(1, true), milestone(3), milestone(7), milestone(14)];
  it('finds the next one strictly after today', () => {
    expect(nextMilestone(ms, 3)?.day_number).toBe(7);
    expect(nextMilestone(ms, 20)).toBeNull();
  });
  it('lists due-but-unmarked milestones in order', () => {
    expect(milestonesDue(ms, 8).map((m) => m.day_number)).toEqual([3, 7]);
  });
});

describe('phases', () => {
  it('covers every day from 0 upward with no gaps', () => {
    for (let d = 0; d <= 200; d++) expect(phaseForDay(d)).toBeDefined();
    expect(phaseForDay(0).key).toBe('day0');
    expect(phaseForDay(2).key).toBe('days1_3');
    expect(phaseForDay(5).key).toBe('days4_7');
    expect(phaseForDay(10).key).toBe('week2');
    expect(phaseForDay(500).key).toBe('beyond');
    const sorted = [...QUIT_PHASES].sort((a, b) => a.fromDay - b.fromDay);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].fromDay).toBe(sorted[i - 1].toDay + 1);
  });
});

describe('today helpers', () => {
  it('knows whether today has a check-in', () => {
    const now = new Date(2026, 9, 7, 20, 0);
    expect(hasCheckedInToday([checkin({ checkin_date: '2026-10-07' })], now)).toBe(true);
    expect(hasCheckedInToday([checkin({ checkin_date: '2026-10-06' })], now)).toBe(false);
  });
  it('flags late nights and bar-night evenings as risk windows', () => {
    expect(isRiskWindow(new Date(2026, 9, 6, 23, 0))).toBe(true); // Tue 11pm
    expect(isRiskWindow(new Date(2026, 9, 6, 14, 0))).toBe(false); // Tue 2pm
    expect(isRiskWindow(new Date(2026, 9, 9, 19, 0))).toBe(true); // Fri 7pm
    expect(isRiskWindow(new Date(2026, 9, 11, 19, 0))).toBe(false); // Sun 7pm
  });
});

import { dailySeries, longestCleanRun } from '../quitLogic';

describe('longestCleanRun', () => {
  it('counts the longest consecutive clean stretch, ignoring used days', () => {
    const rows = [
      checkin({ checkin_date: '2026-10-07' }),
      checkin({ checkin_date: '2026-10-08' }),
      checkin({ checkin_date: '2026-10-09', used_cannabis: true }),
      checkin({ checkin_date: '2026-10-10' }),
      checkin({ checkin_date: '2026-10-11' }),
      checkin({ checkin_date: '2026-10-12' }),
    ];
    expect(longestCleanRun(rows)).toBe(3);
    expect(longestCleanRun([])).toBe(0);
  });
});

describe('dailySeries', () => {
  it('returns oldest→newest with nulls for missing days', () => {
    const now = new Date(2026, 9, 9, 20, 0);
    const rows = [checkin({ checkin_date: '2026-10-07', mood: 4 }), checkin({ checkin_date: '2026-10-09', mood: 6 })];
    expect(dailySeries(rows, 'mood', 3, now)).toEqual([4, null, 6]);
  });
});
