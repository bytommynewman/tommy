// Pure builder: edit plan beats + uploaded clips -> a Shotstack edit JSON.
// No Deno imports so vitest can cover it (same pattern as scratch-agent).

export type RenderBeat = { start: number; end: number; description: string };
export type RenderPlan = { hook: string | null; beats: RenderBeat[] };
export type RenderStyle = {
  pace: 'chill' | 'fast';
  captions: boolean;
  zoom: boolean;
  filter: 'none' | 'boost' | 'muted';
};

const MAX_REEL_SECONDS = 90;
const MIN_BEAT_SECONDS = 0.6;

// deno-lint-ignore-file no-explicit-any
type Clip = Record<string, unknown>;

function captionText(description: string): string {
  const line = description.split('\n')[0].trim();
  return line.length > 64 ? `${line.slice(0, 61)}…` : line;
}

// Beats drive the cut: each beat plays one source clip (round-robin when
// there are fewer clips than beats). Captions ride a second track, the hook
// leads as a big title. Output is a 9:16 30fps reel.
export function buildShotstackEdit(plan: RenderPlan, clipUrls: string[], style: RenderStyle): object {
  if (clipUrls.length === 0) throw new Error('no_clips');
  const beats =
    plan.beats.length > 0
      ? plan.beats
      : // No beats on the plan: give each clip an equal 3s slot.
        clipUrls.map((_, i) => ({ start: i * 3, end: i * 3 + 3, description: '' }));

  const paceFactor = style.pace === 'fast' ? 0.8 : 1;
  const videoClips: Clip[] = [];
  const titleClips: Clip[] = [];
  let cursor = 0;

  beats.forEach((beat, i) => {
    const rawLength = Math.max(beat.end - beat.start, MIN_BEAT_SECONDS) * paceFactor;
    const length = Math.min(rawLength, MAX_REEL_SECONDS - cursor);
    if (length <= 0) return;
    const video: Clip = {
      asset: { type: 'video', src: clipUrls[i % clipUrls.length], volume: 1 },
      start: cursor,
      length,
      fit: 'cover',
      transition: i === 0 ? undefined : { in: style.pace === 'fast' ? 'slideLeftFast' : 'fade' },
    };
    if (style.zoom) video.effect = i % 2 === 0 ? 'zoomInSlow' : 'zoomOutSlow';
    if (style.filter !== 'none') video.filter = style.filter;
    videoClips.push(video);

    const caption = captionText(beat.description);
    if (style.captions && caption) {
      titleClips.push({
        asset: {
          type: 'title',
          text: caption,
          style: 'subtitle',
          size: 'small',
          position: 'bottom',
          background: '#000000',
        },
        start: cursor + 0.15,
        length: Math.max(length - 0.3, 0.3),
      });
    }
    cursor += length;
  });

  if (plan.hook) {
    titleClips.unshift({
      asset: {
        type: 'title',
        text: captionText(plan.hook),
        style: 'blockbuster',
        size: 'medium',
        position: 'center',
      },
      start: 0,
      length: Math.min(2.2, cursor || 2.2),
    });
  }

  const tracks: { clips: Clip[] }[] = [];
  if (titleClips.length > 0) tracks.push({ clips: titleClips });
  tracks.push({ clips: videoClips });

  return {
    timeline: { background: '#000000', tracks },
    output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16', fps: 30 },
  };
}

// Total seconds of the built cut — used for progress hints in the app.
export function editLength(plan: RenderPlan, style: RenderStyle): number {
  const paceFactor = style.pace === 'fast' ? 0.8 : 1;
  const total = plan.beats.reduce((sum, b) => sum + Math.max(b.end - b.start, MIN_BEAT_SECONDS) * paceFactor, 0);
  return Math.min(total, MAX_REEL_SECONDS);
}
