// Pure helpers for course navigation (camera framing, drag mapping,
// overview-mode detection). No React imports; 'worklet'-marked functions run
// on the UI thread (same contract as lib/holePath.ts).

import { clamp, type HolePath } from './holePath';

// stepStop survives only until useCourseNav.ts is deleted (PR B Task 5).
export function stepStop(current: number, direction: 1 | -1, stopCount: number): number {
  'worklet';
  const next = current + direction;
  return next < 0 ? 0 : next > stopCount - 1 ? stopCount - 1 : next;
}

export function pathBounds(
  path: HolePath,
  margin: number,
  sceneW: number,
  sceneH: number
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of path.pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const x = clamp(minX - margin, 0, sceneW);
  const y = clamp(minY - margin, 0, sceneH);
  return { x, y, w: clamp(maxX + margin, 0, sceneW) - x, h: clamp(maxY + margin, 0, sceneH) - y };
}

// Cover framing: fills the screen edge-to-edge, cropping the long axis, so
// the overview has zero dead space.
export function coverScale(screenW: number, screenH: number, bounds: { w: number; h: number }): number {
  'worklet';
  return Math.max(screenW / bounds.w, screenH / bounds.h);
}

export function centerOffset(screenLen: number, boundStart: number, boundLen: number, scale: number): number {
  'worklet';
  return screenLen / 2 - (boundStart + boundLen / 2) * scale;
}

// Finger-to-path-distance mapping for the 1:1 drag: drag up (negative changeY)
// advances toward the green at the top of the photo.
export function dragDelta(changeY: number, scale: number): number {
  'worklet';
  return -changeY / scale;
}

// Camera translate for one axis. Content larger than screen: clamp the
// desired offset so no gap shows. Content smaller (zoomed-out overview):
// center it regardless of desired.
export function cameraOffset(screenLen: number, contentLen: number, desired: number): number {
  'worklet';
  if (contentLen <= screenLen) return (screenLen - contentLen) / 2;
  const lo = screenLen - contentLen;
  return desired < lo ? lo : desired > 0 ? 0 : desired;
}

export function isOverviewZoom(scale: number, travelScale: number, fitScale: number): boolean {
  'worklet';
  return scale < (travelScale + fitScale) / 2;
}
