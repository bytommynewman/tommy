import { describe, it, expect } from 'vitest';
import { daysCleanFrom, buildContextBlock, SCRATCH_SYSTEM } from '../../supabase/functions/scratch-agent/logic';

describe('daysCleanFrom', () => {
  const now = new Date('2026-07-08T15:00:00Z');
  it('counts days since creation when there are no relapses', () => {
    expect(daysCleanFrom('2026-07-01T10:00:00Z', [], now)).toBe(7);
  });
  it('counts from the most recent relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-05T23:00:00Z', '2026-06-20T08:00:00Z'], now)).toBe(3);
  });
  it('returns 0 for a same-day relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-08T09:00:00Z'], now)).toBe(0);
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
