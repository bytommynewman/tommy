import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Cached data must outlive the persister's maxAge below, or restored
      // queries would be garbage-collected right after hydration.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

// Only these domains are written to disk (plain AsyncStorage) so their pages
// render instantly from last-known data on a cold start. Recovery, journal,
// chat and profile stay memory-only on purpose: the session token lives in
// the Keychain, and that content shouldn't outlive it in plaintext.
const PERSISTED_KEYS = new Set([
  'reel_ideas',
  'edit_plans',
  'ig_snapshots',
  'ig_media_stats',
  'market_overview',
  'watchlist_quotes',
  'st_status',
  'st_portfolio',
]);

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'tommy-query-cache-v1' }),
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && PERSISTED_KEYS.has(String(query.queryKey[0])),
  },
};
