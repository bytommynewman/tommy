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

type MediaInsights = {
  views: number | null;
  reach: number | null;
  saves: number | null;
  shares: number | null;
};

// One combined insights call per media (views/reach/saved/shares), then the
// overlapping play-count metrics singly — "plays" excludes replays and can
// badly undercount, so the largest play-count wins, matching what the
// Instagram app shows. Any refused metric is just a null, never an error.
async function fetchInsights(mediaId: string, token: string): Promise<MediaInsights> {
  const out: MediaInsights = { views: null, reach: null, saves: null, shares: null };
  try {
    const data = await igGet(`/${mediaId}/insights`, { metric: 'views,reach,saved,shares' }, token);
    for (const m of data?.data ?? []) {
      const value = m?.values?.[0]?.value ?? m?.total_value?.value;
      if (typeof value !== 'number') continue;
      if (m.name === 'views') out.views = value;
      else if (m.name === 'reach') out.reach = value;
      else if (m.name === 'saved') out.saves = value;
      else if (m.name === 'shares') out.shares = value;
    }
  } catch {
    // combined call refused for this media type — the loop below still runs
  }
  for (const metric of ['views', 'ig_reels_aggregated_all_plays_count', 'plays']) {
    if (metric === 'views' && out.views !== null) continue;
    try {
      const data = await igGet(`/${mediaId}/insights`, { metric }, token);
      const value = data?.data?.[0]?.values?.[0]?.value ?? data?.data?.[0]?.total_value?.value;
      if (typeof value === 'number' && (out.views === null || value > out.views)) out.views = value;
    } catch {
      // metric not available for this media — try the next one
    }
  }
  return out;
}

type AccountInsights = { views: number | null; reach: number | null; engaged: number | null };

// Account-level 28-day totals — this is the number the Instagram app's own
// "Professional dashboard" shows, and it counts views the per-media insights
// can't see (boosts, Facebook crossposting). Periods vary by metric, so try
// days_28 first and fall back to day.
async function fetchAccountInsights(token: string): Promise<AccountInsights> {
  const out: AccountInsights = { views: null, reach: null, engaged: null };
  const metrics: [string, keyof AccountInsights][] = [
    ['views', 'views'],
    ['reach', 'reach'],
    ['accounts_engaged', 'engaged'],
  ];
  for (const [metric, key] of metrics) {
    for (const period of ['days_28', 'day']) {
      try {
        const data = await igGet('/me/insights', { metric, period, metric_type: 'total_value' }, token);
        const value = data?.data?.[0]?.total_value?.value ?? data?.data?.[0]?.values?.[0]?.value;
        if (typeof value === 'number') {
          out[key] = value;
          break;
        }
      } catch {
        // metric/period combo not supported — try the next
      }
    }
  }
  return out;
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
    const account = await fetchAccountInsights(token);
    const snapshot: Record<string, unknown> = {
      followers: me.followers_count ?? 0,
      following: me.follows_count ?? 0,
      media_count: me.media_count ?? 0,
      username: typeof me.username === 'string' ? me.username : null,
      profile_picture_url: typeof me.profile_picture_url === 'string' ? me.profile_picture_url : null,
      views_28d: account.views,
      reach_28d: account.reach,
      engaged_28d: account.engaged,
    };
    let { error: snapError } = await supabase.from('ig_snapshots').insert(snapshot);
    if (snapError && /views_28d|reach_28d|engaged_28d/.test(snapError.message)) {
      // Migration 0009 not applied yet — snapshot without the 28d totals.
      const { views_28d: _v, reach_28d: _r, engaged_28d: _e, ...withoutInsights } = snapshot;
      ({ error: snapError } = await supabase.from('ig_snapshots').insert(withoutInsights));
    }
    if (snapError && /username|profile_picture_url/.test(snapError.message)) {
      // Migration 0007 not applied yet either — snapshot the numbers anyway.
      const {
        username: _u,
        profile_picture_url: _p,
        views_28d: _v2,
        reach_28d: _r2,
        engaged_28d: _e2,
        ...bare
      } = snapshot;
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
    const insights = await Promise.all(
      // deno-lint-ignore no-explicit-any
      items.map((m: any) => fetchInsights(String(m.id), token))
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
        plays: insights[i].views,
        reach: insights[i].reach,
        saves: insights[i].saves,
        shares: insights[i].shares,
        likes: typeof m.like_count === 'number' ? m.like_count : 0,
        comments: typeof m.comments_count === 'number' ? m.comments_count : 0,
        captured_at: new Date().toISOString(),
      }));
      let { error: mediaError } = await supabase
        .from('ig_media_stats')
        .upsert(rows, { onConflict: 'user_id,media_id' });
      if (mediaError && /reach|saves|shares/.test(mediaError.message)) {
        // Migration 0008 not applied yet — sync everything else anyway.
        ({ error: mediaError } = await supabase
          .from('ig_media_stats')
          .upsert(rows.map(({ reach: _r, saves: _sv, shares: _sh, ...rest }) => rest), {
            onConflict: 'user_id,media_id',
          }));
      }
      if (mediaError && /thumbnail_url/.test(mediaError.message)) {
        // Migration 0006 not applied yet either.
        ({ error: mediaError } = await supabase
          .from('ig_media_stats')
          .upsert(
            rows.map(({ thumbnail_url: _t, reach: _r, saves: _sv, shares: _sh, ...rest }) => rest),
            { onConflict: 'user_id,media_id' }
          ));
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
