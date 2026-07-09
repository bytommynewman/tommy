import { describe, it, expect } from 'vitest';
import { cameraOffset, centerOffset, coverScale, dragDelta, isOverviewZoom, pathBounds } from '../courseNav';
import { buildHolePath } from '../holePath';

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

describe('pathBounds', () => {
  it('bounds the path points with margin, clamped to the scene', () => {
    const path = buildHolePath([{ x: 100, y: 50 }, { x: 300, y: 950 }]);
    const b = pathBounds(path, 60, 1200, 1000);
    expect(b.x).toBe(40); // 100 - 60
    expect(b.y).toBe(0); // 50 - 60 clamps to 0
    expect(b.x + b.w).toBe(360); // 300 + 60
    expect(b.y + b.h).toBe(1000); // 950 + 60 clamps to scene height
  });
});

describe('coverScale', () => {
  it('fills the screen on both axes (crops the long one)', () => {
    expect(coverScale(200, 400, { w: 100, h: 100 })).toBe(4); // height dominates
    expect(coverScale(400, 200, { w: 100, h: 100 })).toBe(4); // width dominates
  });
});

describe('centerOffset', () => {
  it('centers the bounds region on screen', () => {
    // bounds 100..300 at scale 2 → center 400 → screen 400 wide → offset -200
    expect(centerOffset(400, 100, 200, 2)).toBe(-200);
  });
});

describe('dragDelta', () => {
  it('maps finger movement 1:1 into path distance against the zoom', () => {
    expect(dragDelta(-30, 2)).toBe(15); // drag up 30 screen px at 2x → +15 scene px
    expect(dragDelta(30, 2)).toBe(-15);
  });
});
