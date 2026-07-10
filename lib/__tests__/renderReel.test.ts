import { describe, expect, it } from 'vitest';
import { buildShotstackEdit, editLength, type RenderPlan, type RenderStyle } from '../../supabase/functions/render-reel/logic';

const plan: RenderPlan = {
  hook: 'I built an app with AI',
  beats: [
    { start: 0, end: 2.5, description: 'hook shot — phone alarm' },
    { start: 2.5, end: 6, description: 'desk b-roll' },
    { start: 6, end: 9, description: 'cta — follow the come-up' },
  ],
};
const style: RenderStyle = { pace: 'chill', captions: true, zoom: true, filter: 'none' };

type Edit = {
  timeline: { tracks: { clips: Record<string, any>[] }[] };
  output: Record<string, unknown>;
};

describe('buildShotstackEdit', () => {
  it('cuts one video clip per beat, round-robining sources', () => {
    const edit = buildShotstackEdit(plan, ['u1', 'u2'], style) as Edit;
    const videoTrack = edit.timeline.tracks[edit.timeline.tracks.length - 1];
    expect(videoTrack.clips).toHaveLength(3);
    expect(videoTrack.clips.map((c) => c.asset.src)).toEqual(['u1', 'u2', 'u1']);
    // Beats are laid back-to-back from zero.
    expect(videoTrack.clips[0].start).toBe(0);
    expect(videoTrack.clips[1].start).toBeCloseTo(2.5);
  });

  it('puts the hook title first and a caption per beat', () => {
    const edit = buildShotstackEdit(plan, ['u1'], style) as Edit;
    const titles = edit.timeline.tracks[0].clips;
    expect(titles[0].asset.text).toBe('I built an app with AI');
    expect(titles).toHaveLength(4); // hook + 3 captions
  });

  it('omits captions when disabled and applies filters/pace', () => {
    const edit = buildShotstackEdit(plan, ['u1'], { pace: 'fast', captions: false, zoom: false, filter: 'boost' }) as Edit;
    expect(edit.timeline.tracks).toHaveLength(2); // hook title track + video
    const video = edit.timeline.tracks[1].clips[0];
    expect(video.filter).toBe('boost');
    expect(video.effect).toBeUndefined();
    // fast pace shortens each beat by 20%
    expect(video.length).toBeCloseTo(2.0);
  });

  it('outputs a 9:16 reel and throws without clips', () => {
    const edit = buildShotstackEdit(plan, ['u1'], style) as Edit;
    expect(edit.output.aspectRatio).toBe('9:16');
    expect(() => buildShotstackEdit(plan, [], style)).toThrow('no_clips');
  });

  it('gives clip-per-3s slots when the plan has no beats', () => {
    const edit = buildShotstackEdit({ hook: null, beats: [] }, ['u1', 'u2'], style) as Edit;
    const videoTrack = edit.timeline.tracks[edit.timeline.tracks.length - 1];
    expect(videoTrack.clips).toHaveLength(2);
    expect(videoTrack.clips[1].start).toBeCloseTo(3);
  });
});

describe('editLength', () => {
  it('sums beats with the pace factor', () => {
    expect(editLength(plan, style)).toBeCloseTo(9);
    expect(editLength(plan, { ...style, pace: 'fast' })).toBeCloseTo(7.2);
  });
});
