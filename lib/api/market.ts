import { supabase } from '../supabase';

export type MarketSeriesPoint = { t: number; v: number };

export type MarketTracker = {
  symbol: string;
  label: string;
  currency: string;
  price: number;
  prevClose: number;
  changePct: number;
  series: MarketSeriesPoint[];
};

// Big-board quote — same shape as a tracker minus the intraday series.
export type MarketStock = Omit<MarketTracker, 'series'>;

// `stocks` is optional so the app keeps working against an older deployed
// function that only returns the majors.
export type MarketOverview = { trackers: MarketTracker[]; stocks?: MarketStock[]; asOf: string };

export async function fetchMarketOverview(): Promise<MarketOverview> {
  const { data, error } = await supabase.functions.invoke('market-data', { body: {} });
  if (error) throw new Error('market_failed');
  const record = data as Record<string, unknown>;
  if (!record || !Array.isArray(record.trackers)) throw new Error((record?.error as string) ?? 'market_failed');
  return data as MarketOverview;
}

// Watchlist quotes share the tracker shape (label = company name from Yahoo).
export type WatchlistQuotes = { quotes: MarketTracker[]; asOf: string };

export async function fetchWatchlistQuotes(symbols: string[]): Promise<WatchlistQuotes> {
  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { mode: 'watchlist', symbols },
  });
  if (error) throw new Error('market_failed');
  const record = data as Record<string, unknown>;
  if (!record || !Array.isArray(record.quotes)) throw new Error((record?.error as string) ?? 'market_failed');
  return data as WatchlistQuotes;
}
