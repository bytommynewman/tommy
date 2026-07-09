// Pure helpers for course navigation (camera framing, drag mapping,
// overview-mode detection). No React imports; 'worklet'-marked functions run
// on the UI thread (same contract as lib/holePath.ts).

import { clamp, type HolePath } from './holePath';

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

// Walking-view tilt: full tilt zoomed in (travel), flattening continuously to
// 0 as the pinch approaches the overview fit, so the overview stays a map.
export function tiltFor(scale: number, travelScale: number, fitScale: number, maxTilt: number): number {
  'worklet';
  const span = travelScale - fitScale;
  if (Math.abs(span) < 1e-9) return maxTilt;
  return clamp((scale - fitScale) / span, 0, 1) * maxTilt;
}

// How many FLAT screen px above the pivot are visible once the plane is
// tilted — i.e. which flat point projects exactly onto the screen top.
// Used to clamp the camera so the tilted view can never look past the top
// edge of the photo (which would show background instead of imagery).
// At tilt 0 this is simply the pivot height. If the horizon would enter the
// screen (denominator <= 0), visibility is effectively infinite.
export function visibleAboveFlat(pivotY: number, tilt: number, perspective: number): number {
  'worklet';
  const denom = Math.cos(tilt) - (pivotY * Math.sin(tilt)) / perspective;
  if (denom <= 0.05) return 1e9;
  return pivotY / denom;
}

// Perspective projection used by BOTH the Skia scene transform and the RN
// marker overlays, so they stay pinned together. Input is a point relative to
// the pivot (the camera standpoint on screen); rotateX(tilt) then perspective
// divide, matching React Native's [{perspective}, {rotateX}] transform.
// k is the depth scale factor (<1 = far/above pivot, >1 = near/below).
export function projectPerspective(
  dx: number,
  dy: number,
  tilt: number,
  perspective: number
): { x: number; y: number; k: number } {
  'worklet';
  const w = 1 - (dy * Math.sin(tilt)) / perspective;
  const k = 1 / w;
  return { x: dx * k, y: dy * Math.cos(tilt) * k, k };
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
