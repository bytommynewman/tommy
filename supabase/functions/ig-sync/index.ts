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

// Instagram exposes several overlapping play-count metrics ("views" replaced
// "plays"; reels also have an aggregated all-plays counter) and they disagree
// — "plays" excludes replays and can badly undercount. Ask for all of them
// and keep the largest, which is what the Instagram app itself displays.
async function fetchViews(mediaId: string, token: string): Promise<number | null> {
  let best: number | null = null;
  for (const metric of ['views', 'ig_reels_aggregated_all_plays_count', 'plays']) {
    try {
      const data = await igGet(`/${mediaId}/insights`, { metric }, token);
      const value = data?.data?.[0]?.values?.[0]?.value ?? data?.data?.[0]?.total_value?.value;
      if (typeof value === 'number' && (best === null || value > best)) best = value;
    } catch {
      // metric not available for this media — try the next one
    }
  }
  return best;
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
    const me = await igGet(
      '/me',
      { fields: 'username,profile_picture_url,followers_count,follows_count,media_count' },
      token
    );
    const snapshot: Record<string, unknown> = {
      followers: me.followers_count ?? 0,
      following: me.follows_count ?? 0,
      media_count: me.media_count ?? 0,
      username: typeof me.username === 'string' ? me.username : null,
      profile_picture_url: typeof me.profile_picture_url === 'string' ? me.profile_picture_url : null,
    };
    let { error: snapError } = await supabase.from('ig_snapshots').insert(snapshot);
    if (snapError && /username|profile_picture_url/.test(snapError.message)) {
      // Migration 0007 not applied yet — snapshot the numbers anyway.
      const { username: _u, profile_picture_url: _p, ...bare } = snapshot;
      ({ error: snapError } = await supabase.from('ig_snapshots').insert(bare));
    }
    if (snapError) return json({ error: 'ig_failed', detail: snapError.message }, 500);

    const media = await igGet(
      '/me/media',
      {
        fields: 'id,caption,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count,media_type',
        limit: '30',
      },
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
        // Videos carry thumbnail_url; images only media_url.
        thumbnail_url:
          typeof m.thumbnail_url === 'string' ? m.thumbnail_url : typeof m.media_url === 'string' ? m.media_url : null,
        posted_at: typeof m.timestamp === 'string' ? m.timestamp : null,
        plays: views[i],
        likes: typeof m.like_count === 'number' ? m.like_count : 0,
        comments: typeof m.comments_count === 'number' ? m.comments_count : 0,
        captured_at: new Date().toISOString(),
      }));
      let { error: mediaError } = await supabase
        .from('ig_media_stats')
        .upsert(rows, { onConflict: 'user_id,media_id' });
      if (mediaError && /thumbnail_url/.test(mediaError.message)) {
        // Migration 0006 not applied yet — sync everything else anyway.
        ({ error: mediaError } = await supabase
          .from('ig_media_stats')
          .upsert(rows.map(({ thumbnail_url: _t, ...rest }) => rest), { onConflict: 'user_id,media_id' }));
      }
      if (mediaError) return json({ error: 'ig_failed', detail: mediaError.message }, 500);
    }

    return json({ ok: true, username: me.username, followers: me.followers_count, media: items.length });
  } catch (err) {
    console.error('ig-sync error', err);
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: 'ig_failed', detail: detail.slice(0, 240) }, 500);
  }
});
