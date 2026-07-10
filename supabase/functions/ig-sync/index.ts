import { createClient } from '@supabase/supabase-js';

// Pulls Tommy's Instagram profile + recent media through the official
// "Instagram API with Instagram Login" (graph.instagram.com) and stores a
// follower snapshot plus per-reel stats. Setup (one-time) lives in
// CONNECT-INSTAGRAM.md; the long-lived token is the IG_ACCESS_TOKEN secret.

const IG_BASE = 'https://graph.instagram.com';

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

// deno-lint-ignore no-explicit-any
async function igGet(path: string, params: Record<string, string>, token: string): Promise<any> {
  const query = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${IG_BASE}${path}?${query}`);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? `instagram ${res.status}`;
    throw new Error(String(msg).slice(0, 200));
  }
  return data;
}

// "views" replaced "plays" as the reel metric; older accounts may still only
// answer to plays. Try both, and treat a refusal as "no number" not an error.
async function fetchViews(mediaId: string, token: string): Promise<number | null> {
  for (const metric of ['views', 'plays']) {
    try {
      const data = await igGet(`/${mediaId}/insights`, { metric }, token);
      const value = data?.data?.[0]?.values?.[0]?.value;
      if (typeof value === 'number') return value;
    } catch {
      // fall through to the next metric
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = Deno.env.get('IG_ACCESS_TOKEN');
  if (!token) return json({ error: 'not_configured' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  try {
    const me = await igGet('/me', { fields: 'username,followers_count,follows_count,media_count' }, token);
    const { error: snapError } = await supabase.from('ig_snapshots').insert({
      followers: me.followers_count ?? 0,
      following: me.follows_count ?? 0,
      media_count: me.media_count ?? 0,
    });
    if (snapError) return json({ error: 'ig_failed', detail: snapError.message }, 500);

    const media = await igGet(
      '/me/media',
      { fields: 'id,caption,permalink,timestamp,like_count,comments_count,media_type', limit: '30' },
      token
    );
    const items = Array.isArray(media?.data) ? media.data : [];
    const views = await Promise.all(
      // deno-lint-ignore no-explicit-any
      items.map((m: any) => fetchViews(String(m.id), token))
    );
    if (items.length > 0) {
      const rows = items.map((m: Record<string, unknown>, i: number) => ({
        user_id: userData.user.id,
        media_id: String(m.id),
        caption: typeof m.caption === 'string' ? m.caption.slice(0, 500) : null,
        permalink: typeof m.permalink === 'string' ? m.permalink : null,
        posted_at: typeof m.timestamp === 'string' ? m.timestamp : null,
        plays: views[i],
        likes: typeof m.like_count === 'number' ? m.like_count : 0,
        comments: typeof m.comments_count === 'number' ? m.comments_count : 0,
        captured_at: new Date().toISOString(),
      }));
      const { error: mediaError } = await supabase
        .from('ig_media_stats')
        .upsert(rows, { onConflict: 'user_id,media_id' });
      if (mediaError) return json({ error: 'ig_failed', detail: mediaError.message }, 500);
    }

    return json({ ok: true, username: me.username, followers: me.followers_count, media: items.length });
  } catch (err) {
    console.error('ig-sync error', err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: 'ig_failed', detail: detail.slice(0, 240) }, 500);
  }
});
