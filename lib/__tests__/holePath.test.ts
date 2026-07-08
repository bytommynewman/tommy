import { describe, it, expect } from 'vitest';
import { buildHolePath, pointAtDistance, projectToPath, nearestStop, clamp } from '../holePath';

// A straight horizontal line from (0,0) to (100,0).
const line = buildHolePath([{ x: 0, y: 0 }, { x: 100, y: 0 }]);

describe('buildHolePath', () => {
  it('measures a straight line accurately', () => {
    expect(line.total).toBeGreaterThan(99);
    expect(line.total).toBeLessThan(101);
    expect(line.cum[0]).toBe(0);
    expect(line.cum[line.cum.length - 1]).toBeCloseTo(line.total, 6);
  });

  it('a bent path is longer than the straight-line distance between its endpoints', () => {
    const bent = buildHolePath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
    const straight = Math.hypot(100, 100);
    expect(bent.total).toBeGreaterThan(straight);
  });
});

describe('pointAtDistance', () => {
  it('returns the midpoint of a straight line at half distance', () => {
    const p = pointAtDistance(line, line.total / 2);
    expect(p.x).toBeCloseTo(50, 0);
    expect(Math.abs(p.y)).toBeLessThan(1);
  });

  it('clamps below zero to the start', () => {
    const p = pointAtDistance(line, -50);
    expect(p.x).toBeCloseTo(0, 6);
  });

  it('clamps beyond the end to the end', () => {
    const p = pointAtDistance(line, line.total + 50);
    expect(p.x).toBeCloseTo(100, 0);
  });
});

describe('projectToPath', () => {
  it('projects a point beside the line onto the nearest spot', () => {
    const d = projectToPath(line, { x: 30, y: 25 });
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(35);
  });

  it('projects a point past the end onto the end', () => {
    const d = projectToPath(line, { x: 500, y: 0 });
    expect(d).toBeCloseTo(line.total, 0);
  });
});

describe('nearestStop', () => {
  const stops = [0, 50, 100];
  it('finds the nearest stop and gap', () => {
    expect(nearestStop(stops, 40)).toEqual({ index: 1, gap: 10 });
    expect(nearestStop(stops, 4)).toEqual({ index: 0, gap: 4 });
    expect(nearestStop(stops, 98)).toEqual({ index: 2, gap: 2 });
  });
});

describe('clamp', () => {
  it('clamps both ends', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
