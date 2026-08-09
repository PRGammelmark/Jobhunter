import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Company } from '@career-intelligence/shared';
import { api } from '../services/api';
import { keys } from './keys';

function upsertCompany(queryClient: ReturnType<typeof useQueryClient>, company: Company) {
  queryClient.setQueryData<Company[]>(keys.companies.all, (prev) => {
    if (!prev) return prev;
    const idx = prev.findIndex((c) => c._id === company._id);
    if (idx === -1) return [company, ...prev];
    const next = [...prev];
    next[idx] = company;
    return next;
  });
  queryClient.setQueryData(keys.companies.detail(company._id), company);
}

export function useCompanies() {
  return useQuery({
    queryKey: keys.companies.all,
    queryFn: () => api.getCompanies(),
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: keys.companies.detail(id!),
    queryFn: () => api.getCompany(id!),
    enabled: Boolean(id),
  });
}

export function useCompanyApplications(id: string | undefined) {
  return useQuery({
    queryKey: keys.companies.applications(id!),
    queryFn: () => api.getCompanyApplications(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createCompany>[0]) => api.createCompany(data),
    onSuccess: (company) => {
      upsertCompany(queryClient, company);
      void queryClient.invalidateQueries({ queryKey: keys.companies.all });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      api.updateCompany(id, data),
    onSuccess: (company, { data }) => {
      upsertCompany(queryClient, company);
      if (data.name !== undefined) {
        void queryClient.invalidateQueries({ queryKey: keys.applications.all });
      }
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<Company[]>(keys.companies.all, (prev) =>
        prev ? prev.filter((c) => c._id !== id) : prev
      );
      queryClient.removeQueries({ queryKey: keys.companies.detail(id) });
      queryClient.removeQueries({ queryKey: keys.companies.applications(id) });
    },
  });
}

export function useAddCompanyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.addCompanyNote(id, text),
    onSuccess: (company) => {
      upsertCompany(queryClient, company);
    },
  });
}

export function useDeleteCompanyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, noteIndex }: { id: string; noteIndex: number }) =>
      api.deleteCompanyNote(id, noteIndex),
    onSuccess: (company) => {
      upsertCompany(queryClient, company);
    },
  });
}

export function useResearchCompany() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; cvr?: string } }) =>
      api.researchCompany(id, data),
  });
}
