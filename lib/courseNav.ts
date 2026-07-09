// Pure helpers for course navigation (swipe stepping, camera framing,
// overview-mode detection). No React imports; 'worklet'-marked functions run
// on the UI thread (same contract as lib/holePath.ts).

export function stepStop(current: number, direction: 1 | -1, stopCount: number): number {
  'worklet';
  const next = current + direction;
  return next < 0 ? 0 : next > stopCount - 1 ? stopCount - 1 : next;
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
