import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchMarketOverview } from '../api/market';
import { fetchPortfolioStatus } from '../api/portfolio';

// Fire-and-forget prefetch of the section data behind the course flags, run
// once the session is known, so pages open warm instead of spinning on first
// visit. Failures are fine — the screens fetch for themselves on entry.
export function useWarmCache(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    queryClient.prefetchQuery({ queryKey: ['market_overview'], queryFn: fetchMarketOverview });
    queryClient.prefetchQuery({ queryKey: ['st_status'], queryFn: fetchPortfolioStatus });
  }, [enabled, queryClient]);
}
