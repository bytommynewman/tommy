// Pure geometry for the golf-hole path: a Catmull-Rom spline through traced
// waypoints, sampled into a polyline with an arc-length lookup table.
// No React imports (same convention as lib/streaks.ts). Functions carrying a
// 'worklet' directive run on the UI thread inside Reanimated worklets — keep
// them free of closures over JS-thread-only objects.

export type Vec = { x: number; y: number };

export type HolePath = {
  pts: Vec[]; // sampled points along the spline, scene px
  cum: number[]; // cumulative arc length at each point; cum[0] === 0
  total: number; // total path length
};

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (p2.x - p0.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (p2.y - p0.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
  };
}

// Built once on the JS thread; the returned plain object is safely captured
// by worklets (arrays of numbers/objects serialize fine).
export function buildHolePath(waypoints: Vec[], samplesPerSegment = 40): HolePath {
  if (waypoints.length < 2) throw new Error('buildHolePath needs at least 2 waypoints');
  // Duplicate the endpoints so the spline passes through them.
  const w = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const pts: Vec[] = [];
  for (let seg = 0; seg < w.length - 3; seg++) {
    const last = seg === w.length - 4;
    const n = last ? samplesPerSegment + 1 : samplesPerSegment; // include t=1 only on the final segment
    for (let i = 0; i < n; i++) {
      pts.push(catmullRom(w[seg], w[seg + 1], w[seg + 2], w[seg + 3], i / samplesPerSegment));
    }
  }
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, total: cum[cum.length - 1] };
}

export function pointAtDistance(path: HolePath, d: number): Vec {
  'worklet';
  const dd = clamp(d, 0, path.total);
  // Linear scan is fine: ~300 samples at 60fps is trivial.
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < dd) i++;
  const d0 = path.cum[i - 1];
  const d1 = path.cum[i];
  const t = d1 === d0 ? 0 : (dd - d0) / (d1 - d0);
  const a = path.pts[i - 1];
  const b = path.pts[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function nearestStop(stopDists: number[], d: number): { index: number; gap: number } {
  'worklet';
  let index = 0;
  let gap = Math.abs(stopDists[0] - d);
  for (let i = 1; i < stopDists.length; i++) {
    const g = Math.abs(stopDists[i] - d);
    if (g < gap) {
      gap = g;
      index = i;
    }
  }
  return { index, gap };
}
