import { describe, it, expect } from 'vitest';
import { stepStop, cameraOffset, isOverviewZoom } from '../courseNav';

describe('stepStop', () => {
  it('steps forward and back', () => {
    expect(stepStop(1, 1, 5)).toBe(2);
    expect(stepStop(1, -1, 5)).toBe(0);
  });
  it('clamps at both ends', () => {
    expect(stepStop(4, 1, 5)).toBe(4);
    expect(stepStop(0, -1, 5)).toBe(0);
  });
});

describe('cameraOffset', () => {
  it('clamps a too-high desired offset to 0 when content is larger', () => {
    expect(cameraOffset(800, 2000, 100)).toBe(0);
  });
  it('clamps a too-low desired offset to screen minus content', () => {
    expect(cameraOffset(800, 2000, -5000)).toBe(800 - 2000);
  });
  it('passes through an in-range offset', () => {
    expect(cameraOffset(800, 2000, -600)).toBe(-600);
  });
  it('centers content smaller than the screen, ignoring desired', () => {
    expect(cameraOffset(800, 600, -500)).toBe(100);
  });
});

describe('isOverviewZoom', () => {
  it('is false at travel scale and true at fit scale', () => {
    expect(isOverviewZoom(0.65, 0.65, 0.37)).toBe(false);
    expect(isOverviewZoom(0.37, 0.65, 0.37)).toBe(true);
  });
  it('flips at the midpoint', () => {
    expect(isOverviewZoom(0.52, 0.65, 0.37)).toBe(false); // above mid (0.51)
    expect(isOverviewZoom(0.5, 0.65, 0.37)).toBe(true); // below mid
  });
});
