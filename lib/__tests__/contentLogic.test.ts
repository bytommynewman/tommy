import { describe, expect, it } from 'vitest';
import { followerDelta, parseEditPlan, parseIdeas, snapshotPoints } from '../contentLogic';

describe('parseIdeas', () => {
  it('parses a clean JSON array', () => {
    const raw = JSON.stringify([
      { title: 'Day 14', hook: 'I built an app with AI', outline: 'a\nb\nc', format: 'talking head' },
    ]);
    const out = parseIdeas(raw);
    expect(out).toHaveLength(1);
    expect(out?.[0].title).toBe('Day 14');
  });
  it('accepts fenced JSON and trims to 8 max', () => {
    const idea = { title: 't', hook: 'h', outline: 'o', format: 'f' };
    const raw = '```json\n' + JSON.stringify(Array(12).fill(idea)) + '\n```';
    expect(parseIdeas(raw)).toHaveLength(8);
  });
  it('rejects missing fields, empty strings, and non-arrays', () => {
    expect(parseIdeas(JSON.stringify([{ title: 'x', hook: '', outline: 'o', format: 'f' }]))).toBeNull();
    expect(parseIdeas(JSON.stringify([{ title: 'x', outline: 'o', format: 'f' }]))).toBeNull();
    expect(parseIdeas(JSON.stringify({ title: 'x' }))).toBeNull();
    expect(parseIdeas('not json')).toBeNull();
    expect(parseIdeas(JSON.stringify([]))).toBeNull();
  });
});

describe('parseEditPlan', () => {
  const good = {
    shot_list: [{ shot: 'cold open', note: 'phone screen' }],
    beats: [{ start: 0, end: 1.2, description: 'hook' }],
    caption: 'cap',
    hashtags: '#a #b',
    music: 'lofi',
  };
  it('parses a valid plan', () => {
    expect(parseEditPlan(JSON.stringify(good))?.music).toBe('lofi');
  });
  it('rejects bad beats and missing lists', () => {
    expect(parseEditPlan(JSON.stringify({ ...good, beats: [{ start: 'x', end: 1, description: 'd' }] }))).toBeNull();
    expect(parseEditPlan(JSON.stringify({ ...good, shot_list: undefined }))).toBeNull();
    expect(parseEditPlan('nope')).toBeNull();
  });
});

describe('snapshotPoints', () => {
  it('maps snapshots oldest->newest across the width, min-max normalized', () => {
    const snaps = [
      { followers: 100, captured_at: '2026-07-01' },
      { followers: 200, captured_at: '2026-07-02' },
      { followers: 150, captured_at: '2026-07-03' },
    ];
    expect(snapshotPoints(snaps, 100, 40)).toBe('0,40 50,0 100,20');
  });
  it('draws a flat mid-line when constant or single', () => {
    expect(snapshotPoints([{ followers: 5, captured_at: 'x' }], 100, 40)).toBe('0,20 100,20');
    expect(
      snapshotPoints(
        [
          { followers: 5, captured_at: 'a' },
          { followers: 5, captured_at: 'b' },
        ],
        100,
        40
      )
    ).toBe('0,20 100,20');
  });
  it('returns empty string with no snapshots', () => {
    expect(snapshotPoints([], 100, 40)).toBe('');
  });
});

describe('followerDelta', () => {
  it('is newest minus previous', () => {
    const snaps = [
      { followers: 120, captured_at: 'new' },
      { followers: 100, captured_at: 'old' },
    ];
    expect(followerDelta(snaps)).toBe(20);
  });
  it('is null with fewer than two snapshots', () => {
    expect(followerDelta([{ followers: 5, captured_at: 'x' }])).toBeNull();
    expect(followerDelta([])).toBeNull();
  });
});
