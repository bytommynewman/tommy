import { FunctionsHttpError } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { File } from 'expo-file-system';
import { supabase } from '../supabase';
import type { EditPlan, IgMediaStat, IgSnapshot, ReelIdea, ReelIdeaStatus } from '../../types/database.types';

export type ContentFailure = { error: string; detail?: string };

export async function fetchIdeas(): Promise<ReelIdea[]> {
  const { data, error } = await supabase
    .from('reel_ideas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function generateIdeas(): Promise<{ ideas: ReelIdea[] } | ContentFailure> {
  const { data, error } = await supabase.functions.invoke('content-agent', {
    body: { mode: 'ideas', today: format(new Date(), 'yyyy-MM-dd') },
  });
  if (error) return { error: 'agent_failed' };
  const record = data as Record<string, unknown>;
  if (!record || (!Array.isArray(record.ideas) && typeof record.error !== 'string')) {
    return { error: 'agent_failed' };
  }
  return data as { ideas: ReelIdea[] } | ContentFailure;
}

export async function setIdeaStatus(id: string, status: ReelIdeaStatus): Promise<void> {
  const { error } = await supabase.from('reel_ideas').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('reel_ideas').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchEditPlans(): Promise<EditPlan[]> {
  const { data, error } = await supabase
    .from('edit_plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function buildEditPlan(ideaId: string): Promise<{ plan: EditPlan } | ContentFailure> {
  const { data, error } = await supabase.functions.invoke('content-agent', {
    body: { mode: 'edit_plan', idea_id: ideaId },
  });
  if (error) return { error: 'agent_failed' };
  const record = data as Record<string, unknown>;
  if (!record || (typeof record.plan !== 'object' && typeof record.error !== 'string')) {
    return { error: 'agent_failed' };
  }
  return data as { plan: EditPlan } | ContentFailure;
}

export type DirectorResult = { reply: string; plan: EditPlan | null };

export async function directPlan(planId: string, message: string): Promise<DirectorResult | ContentFailure> {
  const { data, error } = await supabase.functions.invoke('content-agent', {
    body: { mode: 'director', plan_id: planId, message },
  });
  if (error) return { error: 'agent_failed' };
  const record = data as Record<string, unknown>;
  if (!record || typeof record.reply !== 'string') {
    return { error: typeof record?.error === 'string' ? (record.error as string) : 'agent_failed' };
  }
  return data as DirectorResult;
}

export async function updateEditPlanShots(id: string, shotList: EditPlan['shot_list']): Promise<void> {
  const { error } = await supabase.from('edit_plans').update({ shot_list: shotList }).eq('id', id);
  if (error) throw error;
}

// ---- auto-cut cloud rendering ----

export type RenderStyleInput = {
  pace: 'chill' | 'fast';
  captions: boolean;
  zoom: boolean;
  filter: 'none' | 'boost' | 'muted';
};

export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('no_session');
  return data.user.id;
}

export async function uploadClip(path: string, localUri: string): Promise<void> {
  const bytes = await new File(localUri).arrayBuffer();
  const { error } = await supabase.storage
    .from('clips')
    .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(error.message);
}

async function invokeRender(body: Record<string, unknown>): Promise<Record<string, unknown> | ContentFailure> {
  const { data, error } = await supabase.functions.invoke('render-reel', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = (await error.context.json()) as Record<string, unknown>;
        return {
          error: typeof parsed?.error === 'string' ? parsed.error : 'render_failed',
          detail: typeof parsed?.detail === 'string' ? parsed.detail : undefined,
        };
      } catch {
        // fall through
      }
    }
    return { error: 'render_failed' };
  }
  return (data ?? {}) as Record<string, unknown>;
}

export async function startRender(
  planId: string,
  clipPaths: string[],
  style: RenderStyleInput
): Promise<{ renderId: string } | ContentFailure> {
  const data = await invokeRender({ mode: 'start', plan_id: planId, clip_paths: clipPaths, style });
  if (typeof (data as Record<string, unknown>).renderId === 'string') return data as { renderId: string };
  return data as ContentFailure;
}

export async function fetchRenderStatus(
  renderId: string
): Promise<{ status: string; url: string | null; detail?: string | null } | ContentFailure> {
  const data = await invokeRender({ mode: 'status', render_id: renderId });
  if (typeof (data as Record<string, unknown>).status === 'string') {
    return data as { status: string; url: string | null; detail?: string | null };
  }
  return data as ContentFailure;
}

export async function fetchSnapshots(): Promise<IgSnapshot[]> {
  const { data, error } = await supabase
    .from('ig_snapshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMediaStats(): Promise<IgMediaStat[]> {
  const { data, error } = await supabase
    .from('ig_media_stats')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function syncInstagram(): Promise<{ ok: true } | ContentFailure> {
  const { data, error } = await supabase.functions.invoke('ig-sync', { body: {} });
  if (error) {
    // Non-2xx lands here with the body unread — pull out the function's
    // `detail` (the actual Instagram error) so it reaches the screen.
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as Record<string, unknown>;
        return {
          error: typeof body?.error === 'string' ? body.error : 'ig_failed',
          detail: typeof body?.detail === 'string' ? body.detail : undefined,
        };
      } catch {
        // fall through to the generic failure
      }
    }
    return { error: 'ig_failed' };
  }
  const record = data as Record<string, unknown>;
  if (record && typeof record.error === 'string') return record as ContentFailure;
  return { ok: true };
}
