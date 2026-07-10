import { supabase } from '../supabase';

export type PortfolioAccount = { id: string; name: string; institution: string; value: number };
export type PortfolioHolding = {
  symbol: string;
  description: string;
  units: number;
  price: number;
  value: number;
  openPnl: number | null;
};
export type Portfolio = {
  totalValue: number;
  currency: string;
  accounts: PortfolioAccount[];
  holdings: PortfolioHolding[];
  asOf: string;
};

async function invoke(mode: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('snaptrade-portfolio', { body: { mode } });
  if (error) throw new Error('st_failed');
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
