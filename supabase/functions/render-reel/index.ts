import { createClient } from '@supabase/supabase-js';
import { buildShotstackEdit, type RenderStyle } from './logic.ts';

// Cloud auto-cut: signs the caller's uploaded clips, builds a Shotstack edit
// from the plan's beats, and starts/polls the render. The SHOTSTACK_API_KEY
// secret comes from a free shotstack.io account; SHOTSTACK_ENV defaults to
// the free 'stage' environment (renders carry a small watermark).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validStyle(raw: unknown): RenderStyle {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    pace: r.pace === 'fast' ? 'fast' : 'chill',
    captions: r.captions !== false,
    zoom: r.zoom !== false,
    filter: r.filter === 'boost' || r.filter === 'muted' ? r.filter : 'none',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('SHOTSTACK_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' });
  const env = Deno.env.get('SHOTSTACK_ENV') ?? 'stage';
  const base = `https://api.shotstack.io/edit/${env}`;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  try {
    const body = await req.json();

    if (body.mode === 'start') {
      const clipPaths: string[] = Array.isArray(body.clip_paths)
        ? body.clip_paths.filter((p: unknown): p is string => typeof p === 'string').slice(0, 8)
        : [];
      if (clipPaths.length === 0) return json({ error: 'no_clips' }, 400);
      // Only the caller's own folder — RLS guards reads, but check anyway.
      if (!clipPaths.every((p) => p.startsWith(`${userData.user.id}/`))) {
        return json({ error: 'bad_request' }, 403);
      }

      let hook: string | null = null;
      let beats: { start: number; end: number; description: string }[] = [];
      if (typeof body.plan_id === 'string') {
        const { data: plan } = await supabase.from('edit_plans').select('*').eq('id', body.plan_id).maybeSingle();
        if (plan) {
          beats = Array.isArray(plan.beats) ? plan.beats : [];
          const { data: idea } = await supabase
            .from('reel_ideas')
            .select('hook')
            .eq('id', plan.idea_id)
            .maybeSingle();
          hook = idea?.hook ?? null;
        }
      }

      const signed = await Promise.all(
        clipPaths.map((p) => supabase.storage.from('clips').createSignedUrl(p, 3600))
      );
      const urls = signed.map((s) => s.data?.signedUrl).filter((u): u is string => typeof u === 'string');
      if (urls.length !== clipPaths.length) return json({ error: 'clips_unreadable' }, 400);

      const edit = buildShotstackEdit({ hook, beats }, urls, validStyle(body.style));
      const res = await fetch(`${base}/render`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      });
      const data = await res.json();
      if (!res.ok || !data?.response?.id) {
        const detail = data?.response?.error ?? data?.message ?? `shotstack ${res.status}`;
        return json({ error: 'render_failed', detail: String(detail).slice(0, 240) }, 502);
      }
      return json({ renderId: data.response.id });
    }

    if (body.mode === 'status' && typeof body.render_id === 'string') {
      const res = await fetch(`${base}/render/${body.render_id}`, {
        headers: { 'x-api-key': apiKey },
      });
      const data = await res.json();
      if (!res.ok) return json({ error: 'render_failed', detail: `shotstack ${res.status}` }, 502);
      const r = data?.response ?? {};
      return json({
        status: typeof r.status === 'string' ? r.status : 'unknown',
        url: typeof r.url === 'string' ? r.url : null,
        detail: typeof r.error === 'string' ? r.error.slice(0, 240) : null,
      });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (err) {
    console.error('render-reel error', err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: 'render_failed', detail: detail.slice(0, 240) }, 500);
  }
});
