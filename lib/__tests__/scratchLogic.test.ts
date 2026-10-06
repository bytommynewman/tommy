import { describe, it, expect } from 'vitest';
import { daysCleanFrom, buildContextBlock, SCRATCH_SYSTEM } from '../../supabase/functions/scratch-agent/logic';

describe('daysCleanFrom', () => {
  const now = new Date('2026-07-08T15:00:00Z');
  it('counts days since creation when there are no relapses', () => {
    expect(daysCleanFrom('2026-07-01T10:00:00Z', [], 0, now)).toBe(7);
  });
  it('counts from the most recent relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-05T23:00:00Z', '2026-06-20T08:00:00Z'], 0, now)).toBe(3);
  });
  it('returns 0 for a same-day relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-08T09:00:00Z'], 0, now)).toBe(0);
  });
  it('matches the device local-day boundary, not the UTC boundary', () => {
    // Created 23:00Z July 8, asked 01:00Z July 9. In New York (offset 300 min
    // behind UTC in winter terms) both instants are still July 8 locally → 0.
    const lateNow = new Date('2026-07-09T01:00:00Z');
    expect(daysCleanFrom('2026-07-08T23:00:00Z', [], 300, lateNow)).toBe(0);
    // At UTC (offset 0) the boundary WAS crossed → 1.
    expect(daysCleanFrom('2026-07-08T23:00:00Z', [], 0, lateNow)).toBe(1);
  });
});

describe('buildContextBlock', () => {
  const ctx = {
    firstName: 'Tommy',
    today: '2026-07-08',
    habits: [
      { id: 'h1', name: 'Gym', kind: 'build', daysClean: null },
      { id: 'h2', name: 'No vaping', kind: 'recovery', daysClean: 12 },
    ],
    doneToday: ['Gym'],
    remainingToday: ['No vaping'],
  };
  it('includes name, date, every habit with its id, and today status', () => {
    const block = buildContextBlock(ctx);
    expect(block).toContain('Tommy');
    expect(block).toContain('2026-07-08');
    expect(block).toContain('Gym');
    expect(block).toContain('h2');
    expect(block).toContain('12 days clean');
    expect(block).toContain('Done today: Gym');
    expect(block).toContain('Still open: No vaping');
  });
  it('handles the empty state', () => {
    const block = buildContextBlock({ firstName: 'Tommy', today: '2026-07-08', habits: [], doneToday: [], remainingToday: [] });
    expect(block).toContain('no habits set up yet');
  });
});

describe('SCRATCH_SYSTEM', () => {
  it('sets the caddie persona and safety boundary', () => {
    expect(SCRATCH_SYSTEM).toContain('Scratch');
    expect(SCRATCH_SYSTEM).toContain('caddie');
    expect(SCRATCH_SYSTEM.toLowerCase()).toContain('not a therapist');
  });
});

import { quitPhaseLabel } from '../../supabase/functions/scratch-agent/logic';

describe('quit context', () => {
  const base = { firstName: 'Tommy', today: '2026-10-09', habits: [], doneToday: [], remainingToday: [] };
  it('adds a QUITTING WEED block with day, phase, check-in status and reasons', () => {
    const block = buildContextBlock({
      ...base,
      quit: {
        attemptId: 'a1',
        habitId: 'h9',
        day: 3,
        phase: quitPhaseLabel(3),
        checkedInToday: false,
        cravingsToday: 2,
        cravingsPassedTotal: 5,
        cravingsTotal: 6,
        reasons: ['appetite back', 'actually sleep'],
      },
    });
    expect(block).toContain('QUITTING WEED');
    expect(block).toContain('attempt id a1');
    expect(block).toContain('habit id h9');
    expect(block).toContain('Day 3');
    expect(block).toContain('Onset');
    expect(block).toContain('NOT done yet');
    expect(block).toContain('5 of 6');
    expect(block).toContain('appetite back; actually sleep');
  });
  it('omits the block when there is no active quit', () => {
    expect(buildContextBlock({ ...base, quit: null })).not.toContain('QUITTING WEED');
  });
  it('labels phases by day', () => {
    expect(quitPhaseLabel(0)).toContain('Quit day');
    expect(quitPhaseLabel(5)).toContain('Peak');
    expect(quitPhaseLabel(12)).toContain('Clearing');
    expect(quitPhaseLabel(200)).toContain('Clear');
  });
  it('tells Scratch about the craving and check-in tools', () => {
    expect(SCRATCH_SYSTEM).toContain('log_craving');
    expect(SCRATCH_SYSTEM).toContain('quick_checkin');
  });
});
