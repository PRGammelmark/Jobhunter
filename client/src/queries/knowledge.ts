import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeEntry } from '@career-intelligence/shared';
import { api } from '../services/api';
import { keys } from './keys';

function upsertEntry(queryClient: ReturnType<typeof useQueryClient>, entry: KnowledgeEntry) {
  queryClient.setQueryData<KnowledgeEntry[]>(keys.knowledge.all, (prev) => {
    if (!prev) return prev;
    const idx = prev.findIndex((e) => e._id === entry._id);
    if (idx === -1) return [...prev, entry];
    const next = [...prev];
    next[idx] = entry;
    return next;
  });
  queryClient.setQueryData(keys.knowledge.detail(entry._id), entry);
}

export function useKnowledge() {
  return useQuery({
    queryKey: keys.knowledge.all,
    queryFn: () => api.getKnowledge(),
  });
}

export function useKnowledgeEntry(id: string | undefined) {
  return useQuery({
    queryKey: keys.knowledge.detail(id!),
    queryFn: () => api.getKnowledgeEntry(id!),
    enabled: Boolean(id),
  });
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KnowledgeEntry>) => api.createKnowledge(data),
    onSuccess: (entry) => {
      upsertEntry(queryClient, entry);
      void queryClient.invalidateQueries({ queryKey: keys.knowledge.all });
    },
  });
}

export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeEntry> }) =>
      api.updateKnowledge(id, data),
    onSuccess: (entry) => {
      upsertEntry(queryClient, entry);
    },
  });
}

export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteKnowledge(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<KnowledgeEntry[]>(keys.knowledge.all, (prev) =>
        prev ? prev.filter((e) => e._id !== id) : prev
      );
      queryClient.removeQueries({ queryKey: keys.knowledge.detail(id) });
    },
  });
}
