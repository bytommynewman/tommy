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

      const summaries = [];
      const holdings = [];
      let totalValue = 0;
      let currency = 'CAD';
      for (const acct of accounts) {
        const value = acct?.balance?.total?.amount ?? 0;
        currency = acct?.balance?.total?.currency ?? currency;
        totalValue += typeof value === 'number' ? value : 0;
        summaries.push({
          id: acct.id,
          name: acct.name ?? 'account',
          institution: acct.institution_name ?? 'wealthsimple',
          value: typeof value === 'number' ? value : 0,
        });
        try {
          const positions = await stRequest(auth, 'GET', `/api/v1/accounts/${acct.id}/positions`, null);
          for (const p of positions ?? []) {
            const units = p?.units ?? 0;
            const price = p?.price ?? 0;
            holdings.push({
              symbol: p?.symbol?.symbol?.symbol ?? p?.symbol?.symbol?.raw_symbol ?? '—',
              description: p?.symbol?.symbol?.description ?? '',
              units,
              price,
              value: units * price,
              openPnl: p?.open_pnl ?? null,
            });
          }
        } catch (err) {
          console.error('positions failed for account', acct.id, err);
        }
      }
      holdings.sort((a, b) => b.value - a.value);
      return json({ totalValue, currency, accounts: summaries, holdings, asOf: new Date().toISOString() });
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
