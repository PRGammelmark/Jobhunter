import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { cachePersistKey } from './keys';

export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: CACHE_MAX_AGE,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}

export function createIdbPersister(tenantId: string) {
  return createAsyncStoragePersister({
    storage: {
      getItem: async (key) => (await get<string>(key)) ?? null,
      setItem: async (key, value) => {
        await set(key, value);
      },
      removeItem: async (key) => {
        await del(key);
      },
    },
    key: cachePersistKey(tenantId),
  });
}

export async function removePersistedCache(tenantId: string): Promise<void> {
  await del(cachePersistKey(tenantId));
}
