import { supabase } from '../supabase';

export type MarketTracker = {
  symbol: string;
  label: string;
  price: number;
  prevClose: number;
  changePct: number;
  spark: number[];
};

export type MarketOverview = { trackers: MarketTracker[]; asOf: string };

export async function fetchMarketOverview(): Promise<MarketOverview> {
  const { data, error } = await supabase.functions.invoke('market-data', { body: {} });
  if (error) throw new Error('market_failed');
  const record = data as Record<string, unknown>;
  if (!record || !Array.isArray(record.trackers)) throw new Error((record?.error as string) ?? 'market_failed');
  return data as MarketOverview;
}
