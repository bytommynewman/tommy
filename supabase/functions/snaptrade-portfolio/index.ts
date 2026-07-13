import { createClient } from '@supabase/supabase-js';

const ST_BASE = 'https://api.snaptrade.com';

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

// Canonical JSON per SnapTrade's signing spec: keys sorted alphabetically at
// every level, compact (no whitespace).
// deno-lint-ignore no-explicit-any
function canonical(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

async function hmacBase64(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

type StAuth = { clientId: string; consumerKey: string };

type Quote = { price: number; prevClose: number; currency: string };

// Keyless Yahoo quote (same endpoint market-data proxies). SnapTrade balances
// are snapshots from its last brokerage sync, so they drift from what
// Wealthsimple shows live — values get rebuilt from these quotes instead.
async function yahooQuote(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof price !== 'number' || typeof prev !== 'number' || prev <= 0) return null;
    return { price, prevClose: prev, currency: typeof meta?.currency === 'string' ? meta.currency : 'USD' };
  } catch {
    return null;
  }
}

// Signed SnapTrade request. `path` includes /api/v1; user creds ride in the
// query string per the docs; the Signature header covers content+path+query.
async function stRequest(
  auth: StAuth,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  // deno-lint-ignore no-explicit-any
  body: any,
  extraQuery: Record<string, string> = {}
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const params = new URLSearchParams({
    clientId: auth.clientId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...extraQuery,
  });
  const query = params.toString();
  const sigPayload = `{"content":${body === null ? 'null' : canonical(body)},"path":${JSON.stringify(path)},"query":${JSON.stringify(query)}}`;
  const signature = await hmacBase64(auth.consumerKey, sigPayload);
  const res = await fetch(`${ST_BASE}${path}?${query}`, {
    method,
    headers: { Signature: signature, 'Content-Type': 'application/json' },
    body: body === null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`snaptrade ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('SNAPTRADE_CLIENT_ID');
  const consumerKey = Deno.env.get('SNAPTRADE_CONSUMER_KEY');
  if (!clientId || !consumerKey) return json({ error: 'not_configured' });
  const auth: StAuth = { clientId, consumerKey };

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: userData, error: userError } = await anonClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  // Personal SnapTrade key: the key IS the user (Tommy's own account), so
  // there's no registerUser and no userId/userSecret anywhere — SnapTrade
  // resolves the account owner from the signed key (their error 1012 says
  // registerUser is not available for personal keys).
  try {
    const body = await req.json();

    if (body.mode === 'status') {
      try {
        const accounts = await stRequest(auth, 'GET', '/api/v1/accounts', null);
        return json({ connected: Array.isArray(accounts) && accounts.length > 0 });
      } catch {
        return json({ connected: false });
      }
    }

    if (body.mode === 'connect') {
      // Personal accounts connect brokerages on SnapTrade's own site; try the
      // portal endpoint first in case it's supported, else open the dashboard.
      try {
        const login = await stRequest(auth, 'POST', '/api/v1/snapTrade/login', {});
        if (login?.redirectURI) return json({ redirectURI: login.redirectURI });
      } catch (err) {
        console.error('portal login unavailable for personal key', err);
      }
      return json({ redirectURI: 'https://dashboard.snaptrade.com/connections' });
    }

    if (body.mode === 'portfolio') {
      const accounts = await stRequest(auth, 'GET', '/api/v1/accounts', null);
      if (!Array.isArray(accounts) || accounts.length === 0) return json({ error: 'not_connected' });

      type RawPosition = {
        symbol: string;
        description: string;
        units: number;
        stPrice: number;
        openPnl: number | null;
      };
      type RawAccount = {
        id: string;
        name: string;
        institution: string;
        snapValue: number;
        currency: string;
        positions: RawPosition[];
        cash: Record<string, number>;
      };

      const raw: RawAccount[] = [];
      for (const acct of accounts) {
        const positions: RawPosition[] = [];
        try {
          for (const p of (await stRequest(auth, 'GET', `/api/v1/accounts/${acct.id}/positions`, null)) ?? []) {
            positions.push({
              symbol: p?.symbol?.symbol?.symbol ?? p?.symbol?.symbol?.raw_symbol ?? '—',
              description: p?.symbol?.symbol?.description ?? '',
              units: typeof p?.units === 'number' ? p.units : 0,
              stPrice: typeof p?.price === 'number' ? p.price : 0,
              openPnl: typeof p?.open_pnl === 'number' ? p.open_pnl : null,
            });
          }
        } catch (err) {
          console.error('positions failed for account', acct.id, err);
        }
        const cash: Record<string, number> = {};
        try {
          for (const b of (await stRequest(auth, 'GET', `/api/v1/accounts/${acct.id}/balances`, null)) ?? []) {
            const code = b?.currency?.code;
            if (typeof code === 'string' && typeof b?.cash === 'number') cash[code] = (cash[code] ?? 0) + b.cash;
          }
        } catch (err) {
          console.error('balances failed for account', acct.id, err);
        }
        raw.push({
          id: acct.id,
          name: acct.name ?? 'account',
          institution: acct.institution_name ?? 'wealthsimple',
          snapValue: typeof acct?.balance?.total?.amount === 'number' ? acct.balance.total.amount : 0,
          currency: acct?.balance?.total?.currency ?? 'CAD',
          positions,
          cash,
        });
      }

      // Live quotes for every held symbol, plus the FX pairs needed to fold
      // foreign-currency holdings/cash into each account's own currency.
      const symbols = [...new Set(raw.flatMap((a) => a.positions.map((p) => p.symbol)).filter((s) => s !== '—'))];
      const quotes = new Map<string, Quote>();
      await Promise.all(
        symbols.map(async (s) => {
          const q = await yahooQuote(s);
          if (q) quotes.set(s, q);
        })
      );
      const fxPairs = new Set<string>();
      for (const a of raw) {
        for (const p of a.positions) {
          const ccy = quotes.get(p.symbol)?.currency ?? a.currency;
          if (ccy !== a.currency) fxPairs.add(`${ccy}${a.currency}`);
        }
        for (const ccy of Object.keys(a.cash)) if (ccy !== a.currency) fxPairs.add(`${ccy}${a.currency}`);
      }
      const fx = new Map<string, number>();
      await Promise.all(
        [...fxPairs].map(async (pair) => {
          const q = await yahooQuote(`${pair}=X`);
          if (q) fx.set(pair, q.price);
        })
      );
      const rate = (from: string, to: string): number | null => (from === to ? 1 : fx.get(`${from}${to}`) ?? null);

      const summaries = [];
      const holdings = [];
      const cashByCurrency: Record<string, number> = {};
      // Never blend currencies into one number — a USD account added raw to a
      // CAD total reads "close but wrong" next to Wealthsimple's own display.
      // (USD *holdings* inside a CAD account do get FX-folded into the account
      // value, which is exactly what Wealthsimple itself displays.)
      const totalsByCurrency: Record<string, { value: number; dayChange: number; live: boolean }> = {};
      for (const a of raw) {
        // Rebuild the account value from live quotes (cash + positions); fall
        // back to SnapTrade's synced total when any piece can't be priced.
        let liveValue = 0;
        let dayChange = 0;
        let live = a.positions.length > 0 || Object.keys(a.cash).length > 0;
        for (const [ccy, amount] of Object.entries(a.cash)) {
          cashByCurrency[ccy] = (cashByCurrency[ccy] ?? 0) + amount;
          const r = rate(ccy, a.currency);
          if (r === null) live = false;
          else liveValue += amount * r;
        }
        for (const p of a.positions) {
          const q = quotes.get(p.symbol) ?? null;
          const ccy = q?.currency ?? a.currency;
          const price = q?.price ?? p.stPrice;
          const value = p.units * price;
          holdings.push({
            symbol: p.symbol,
            description: p.description,
            units: p.units,
            price,
            value,
            currency: ccy,
            dayChange: q ? p.units * (q.price - q.prevClose) : null,
            dayChangePct: q ? ((q.price - q.prevClose) / q.prevClose) * 100 : null,
            openPnl: p.openPnl,
          });
          const r = rate(ccy, a.currency);
          if (q && r !== null) {
            liveValue += value * r;
            dayChange += p.units * (q.price - q.prevClose) * r;
          } else {
            live = false;
          }
        }
        const value = live ? liveValue : a.snapValue;
        const dc = live ? dayChange : null;
        summaries.push({
          id: a.id,
          name: a.name,
          institution: a.institution,
          value,
          currency: a.currency,
          dayChange: dc,
          dayChangePct: dc !== null && value - dc !== 0 ? (dc / (value - dc)) * 100 : null,
        });
        const t = totalsByCurrency[a.currency] ?? { value: 0, dayChange: 0, live: true };
        t.value += value;
        if (dc === null) t.live = false;
        else t.dayChange += dc;
        totalsByCurrency[a.currency] = t;
      }

      holdings.sort((a, b) => b.value - a.value);
      const totals = Object.entries(totalsByCurrency)
        .map(([currency, t]) => ({
          currency,
          value: t.value,
          dayChange: t.live ? t.dayChange : null,
          dayChangePct: t.live && t.value - t.dayChange !== 0 ? (t.dayChange / (t.value - t.dayChange)) * 100 : null,
        }))
        .sort((a, b) => b.value - a.value);
      const cash = Object.entries(cashByCurrency)
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => b.amount - a.amount);
      return json({
        totals,
        // Kept for one release so an un-reloaded app doesn't break:
        totalValue: totals[0]?.value ?? 0,
        currency: totals[0]?.currency ?? 'CAD',
        accounts: summaries,
        holdings,
        cash,
        asOf: new Date().toISOString(),
      });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (err) {
    console.error('snaptrade-portfolio error', err);
    // Surface the real reason (SnapTrade's status + message) so failures are
    // debuggable from the phone instead of requiring dashboard log access.
    const detail = err instanceof Error ? err.message : String(err);
    return json({ error: 'st_failed', detail: detail.slice(0, 240) }, 500);
  }
});
