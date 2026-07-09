import { useQuery } from '@tanstack/react-query';
import { fetchMarketOverview } from '../api/market';

// "Live" = refetch every minute while the screen is mounted; Yahoo data is
// delayed a few minutes for indexes anyway, so 60s is honest granularity.
export function useMarketOverview() {
  return useQuery({
    queryKey: ['market_overview'],
    queryFn: fetchMarketOverview,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}
