import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type PortfolioTotal = { currency: string; value: number };
export type PortfolioAccount = {
  id: string;
  name: string;
  institution: string;
  value: number;
  currency: string;
};
export type PortfolioHolding = {
  symbol: string;
  description: string;
  units: number;
  price: number;
  value: number;
  openPnl: number | null;
};
export type Portfolio = {
  totals: PortfolioTotal[]; // one entry per currency — never blended
  accounts: PortfolioAccount[];
  holdings: PortfolioHolding[];
  asOf: string;
};

async function invoke(mode: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('snaptrade-portfolio', { body: { mode } });
  if (error) {
    // Non-2xx responses land here with the body unread — pull out the
    // function's `detail` so real failure reasons reach the screen.
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as Record<string, unknown>;
        if (typeof body?.detail === 'string') throw new Error(body.detail);
        if (typeof body?.error === 'string') throw new Error(body.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message !== 'st_failed') throw parsed;
      }
    }
    throw new Error('st_failed');
  }
  return (data ?? {}) as Record<string, unknown>;
}

export async function fetchPortfolioStatus(): Promise<{ connected: boolean }> {
  const data = await invoke('status');
  if (typeof data.error === 'string') throw new Error(data.error);
  return { connected: !!data.connected };
}

export async function startConnect(): Promise<string> {
  const data = await invoke('connect');
  if (typeof data.redirectURI !== 'string') {
    // Prefer the function's `detail` (the actual SnapTrade response) so the
    // failure reason is visible right in the app.
    const detail = typeof data.detail === 'string' ? data.detail : null;
    throw new Error(detail ?? (data.error as string) ?? 'st_failed');
  }
  return data.redirectURI;
}

export async function fetchPortfolio(): Promise<Portfolio> {
  const data = await invoke('portfolio');
  if (typeof data.error === 'string') throw new Error(data.error);
  return data as unknown as Portfolio;
}
