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

// The big board: ten of the most-watched mega caps, quoted alongside the
// majors in overview mode (no series — the board doesn't chart).
const STOCKS = [
  { symbol: 'NVDA', label: 'nvidia' },
  { symbol: 'AAPL', label: 'apple' },
  { symbol: 'MSFT', label: 'microsoft' },
  { symbol: 'GOOGL', label: 'alphabet' },
  { symbol: 'AMZN', label: 'amazon' },
  { symbol: 'META', label: 'meta' },
  { symbol: 'TSLA', label: 'tesla' },
  { symbol: 'AVGO', label: 'broadcom' },
  { symbol: 'NFLX', label: 'netflix' },
  { symbol: 'JPM', label: 'jp morgan' },
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

async function fetchTracker(t: { symbol: string; label?: string }): Promise<Tracker> {
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
    label: t.label ?? (typeof meta?.shortName === 'string' ? meta.shortName.toLowerCase() : t.symbol.toLowerCase()),
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no/empty body — default to the majors overview
  }

  // Watchlist mode: quote an arbitrary list of Yahoo symbols instead of the
  // majors. Same shape as trackers so the client types stay shared.
  if (body?.mode === 'watchlist') {
    const symbols = Array.isArray(body.symbols)
      ? body.symbols
          .filter((s): s is string => typeof s === 'string' && /^[A-Za-z0-9.^=-]{1,12}$/.test(s))
          .slice(0, 20)
      : [];
    if (symbols.length === 0) return json({ error: 'no_symbols' }, 400);
    try {
      const settled = await Promise.allSettled(symbols.map((symbol) => fetchTracker({ symbol })));
      const quotes = settled
        .filter((s): s is PromiseFulfilledResult<Tracker> => s.status === 'fulfilled')
        .map((s) => s.value);
      if (quotes.length === 0) return json({ error: 'market_failed' }, 502);
      return json({ quotes, asOf: new Date().toISOString() });
    } catch (err) {
      console.error('market-data watchlist error', err);
      return json({ error: 'market_failed' }, 500);
    }
  }

  try {
    const settled = await Promise.allSettled([...TRACKERS, ...STOCKS].map(fetchTracker));
    const fulfilled = settled
      .filter((s): s is PromiseFulfilledResult<Tracker> => s.status === 'fulfilled')
      .map((s) => s.value);
    const bySymbol = new Map(fulfilled.map((t) => [t.symbol, t]));
    const trackers = TRACKERS.map((t) => bySymbol.get(t.symbol)).filter((t): t is Tracker => !!t);
    const stocks = STOCKS.map((s) => bySymbol.get(s.symbol))
      .filter((t): t is Tracker => !!t)
      .map(({ series: _series, ...rest }) => rest);
    if (trackers.length === 0) return json({ error: 'market_failed' }, 502);
    return json({ trackers, stocks, asOf: new Date().toISOString() });
  } catch (err) {
    console.error('market-data error', err);
    return json({ error: 'market_failed' }, 500);
  }
});
