import type { QueryClient } from '@tanstack/react-query';
import type { Application } from '@career-intelligence/shared';
import { keys } from './keys';

/** Patch application in list + detail caches. */
export function upsertApplicationCache(queryClient: QueryClient, app: Application): void {
  queryClient.setQueryData<Application[]>(keys.applications.all, (prev) => {
    if (!prev) return prev;
    const idx = prev.findIndex((a) => a._id === app._id);
    if (idx === -1) return [app, ...prev];
    const next = [...prev];
    next[idx] = app;
    return next;
  });
  queryClient.setQueryData(keys.applications.detail(app._id), app);
}

export function removeApplicationCache(queryClient: QueryClient, id: string): void {
  queryClient.setQueryData<Application[]>(keys.applications.all, (prev) =>
    prev ? prev.filter((a) => a._id !== id) : prev
  );
  queryClient.removeQueries({ queryKey: keys.applications.detail(id) });
  queryClient.removeQueries({ queryKey: keys.applications.documents(id) });
}

export function invalidateApplicationDerived(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: keys.dashboard });
  void queryClient.invalidateQueries({ queryKey: keys.statistics });
}

export function invalidateCompanies(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: keys.companies.all });
}
