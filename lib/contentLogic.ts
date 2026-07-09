// Pure logic for the Content section: validating model output and shaping
// stat snapshots for display. No React imports (house convention).

import type { EditPlanBeat, EditPlanShot } from '../types/database.types';

export type ReelIdeaDraft = { title: string; hook: string; outline: string; format: string };
export type EditPlanDraft = {
  shot_list: EditPlanShot[];
  beats: EditPlanBeat[];
  caption: string;
  hashtags: string;
  music: string;
};

const MAX_IDEAS = 8;

function stripFences(raw: string): string {
  return raw.replace(/```(?:json)?/gi, '').trim();
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

// Model output -> validated idea drafts. Null on anything malformed: the
// caller treats null as a failed generation rather than inserting junk.
export function parseIdeas(raw: string): ReelIdeaDraft[] | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const out: ReelIdeaDraft[] = [];
  for (const item of data.slice(0, MAX_IDEAS)) {
    const rec = item as Record<string, unknown>;
    if (!nonEmptyString(rec.title) || !nonEmptyString(rec.hook) || !nonEmptyString(rec.outline) || !nonEmptyString(rec.format)) {
      return null;
    }
    out.push({ title: rec.title, hook: rec.hook, outline: rec.outline, format: rec.format });
  }
  return out;
}

export function parseEditPlan(raw: string): EditPlanDraft | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  const rec = data as Record<string, unknown>;
  if (!rec || typeof rec !== 'object') return null;
  const { shot_list, beats } = rec as { shot_list: unknown; beats: unknown };
  if (!Array.isArray(shot_list) || !Array.isArray(beats)) return null;
  for (const s of shot_list) {
    const shot = s as Record<string, unknown>;
    if (!nonEmptyString(shot.shot) || typeof shot.note !== 'string') return null;
  }
  for (const b of beats) {
    const beat = b as Record<string, unknown>;
    if (typeof beat.start !== 'number' || typeof beat.end !== 'number' || !nonEmptyString(beat.description)) {
      return null;
    }
  }
  if (typeof rec.caption !== 'string' || typeof rec.hashtags !== 'string' || typeof rec.music !== 'string') {
    return null;
  }
  return {
    shot_list: shot_list as EditPlanShot[],
    beats: beats as EditPlanBeat[],
    caption: rec.caption,
    hashtags: rec.hashtags,
    music: rec.music,
  };
}

type SnapshotLike = { followers: number; captured_at: string };

// Points for an svg <Polyline>: snapshots arrive newest-first from the API
// layer? No — this function is order-agnostic by contract: pass OLDEST-FIRST.
// Min-max normalized to the box; constant data draws a mid-height line.
export function snapshotPoints(snaps: SnapshotLike[], width: number, height: number): string {
  if (snaps.length === 0) return '';
  const values = snaps.map((s) => s.followers);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const n = values.length;
  if (n === 1 || span === 0) {
    return `0,${height / 2} ${width},${height / 2}`;
  }
  return values
    .map((v, i) => {
      const x = Math.round((i / (n - 1)) * width);
      const y = Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(' ');
}

// Snapshots NEWEST-FIRST (as queried): newest minus previous.
export function followerDelta(snaps: SnapshotLike[]): number | null {
  if (snaps.length < 2) return null;
  return snaps[0].followers - snaps[1].followers;
}
