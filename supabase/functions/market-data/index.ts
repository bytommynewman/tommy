import { createClient } from '@supabase/supabase-js';

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

// The five majors, blended into one overview. Yahoo's chart endpoint is
// keyless; this function proxies it so the app never talks to Yahoo directly.
const TRACKERS = [
  { symbol: '^GSPC', label: 's&p 500' },
  { symbol: '^IXIC', label: 'nasdaq' },
  { symbol: '^DJI', label: 'dow jones' },
  { symbol: '^GSPTSE', label: 'tsx' },
  { symbol: 'BTC-USD', label: 'bitcoin' },
];

type SeriesPoint = { t: number; v: number };
type Tracker = {
  symbol: string;
  label: string;
  currency: string;
  price: number;
  prevClose: number;
  changePct: number;
  series: SeriesPoint[]; // today's intraday closes, unix seconds — scrubbable
};

async function fetchTracker(t: { symbol: string; label: string }): Promise<Tracker> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t.symbol)}?range=1d&interval=5m`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const timestamps: unknown[] = result?.timestamp ?? [];
  const closes: unknown[] = result?.indicators?.quote?.[0]?.close ?? [];
  const series: SeriesPoint[] = [];
  for (let i = 0; i < Math.min(timestamps.length, closes.length); i++) {
    if (typeof timestamps[i] === 'number' && typeof closes[i] === 'number') {
      series.push({ t: timestamps[i] as number, v: closes[i] as number });
    }
  }
  const price = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof price !== 'number' || typeof prev !== 'number' || prev === 0) throw new Error('bad payload');
  return {
    symbol: t.symbol,
    label: t.label,
    currency: typeof meta?.currency === 'string' ? meta.currency : 'USD',
    price,
    prevClose: prev,
    changePct: ((price - prev) / prev) * 100,
    series: series.slice(-120),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  try {
    const settled = await Promise.allSettled(TRACKERS.map(fetchTracker));
    const trackers = settled
      .filter((s): s is PromiseFulfilledResult<Tracker> => s.status === 'fulfilled')
      .map((s) => s.value);
    if (trackers.length === 0) return json({ error: 'market_failed' }, 502);
    return json({ trackers, asOf: new Date().toISOString() });
  } catch (err) {
    console.error('market-data error', err);
    return json({ error: 'market_failed' }, 500);
  }
});
