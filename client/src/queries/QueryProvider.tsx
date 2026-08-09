import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useAuth } from '../auth/AuthContext';
import {
  CACHE_MAX_AGE,
  createAppQueryClient,
  createIdbPersister,
  removePersistedCache,
} from './queryClient';

export function QueryProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [queryClient] = useState(() => createAppQueryClient());
  const prevTenantRef = useRef<string | null>(null);

  const tenantId = user?.tenantId ?? null;

  const persister = useMemo(
    () => (tenantId ? createIdbPersister(tenantId) : null),
    [tenantId]
  );

  useEffect(() => {
    const prev = prevTenantRef.current;
    if (prev && prev !== tenantId) {
      queryClient.clear();
      void removePersistedCache(prev);
    }
    if (!tenantId && prev) {
      queryClient.clear();
      void removePersistedCache(prev);
    }
    prevTenantRef.current = tenantId;
  }, [tenantId, queryClient]);

  useEffect(() => {
    const onUnauthorized = () => {
      const prev = prevTenantRef.current;
      queryClient.clear();
      if (prev) void removePersistedCache(prev);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [queryClient]);

  // Wait for auth before enabling persist so we never hydrate the wrong tenant.
  if (loading || !persister || !tenantId) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
