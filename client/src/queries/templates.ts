import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApplicationTemplate, CvTemplate, Recommendation } from '@career-intelligence/shared';
import { api } from '../services/api';
import { keys } from './keys';

export function useCvTemplates() {
  return useQuery({
    queryKey: keys.cvTemplates,
    queryFn: () => api.getCvTemplates(),
  });
}

export function useApplicationTemplates() {
  return useQuery({
    queryKey: keys.appTemplates,
    queryFn: () => api.getApplicationTemplates(),
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: keys.recommendations,
    queryFn: () => api.getRecommendations(),
  });
}

export function useCreateCvTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.createCvTemplate(formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.cvTemplates });
    },
  });
}

export function useCreateCvTemplateManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; rawText: string; tags?: string[] }) =>
      api.createCvTemplateManual(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.cvTemplates });
    },
  });
}

export function useDeleteCvTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCvTemplate(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<CvTemplate[]>(keys.cvTemplates, (prev) =>
        prev ? prev.filter((t) => t._id !== id) : prev
      );
    },
  });
}

export function useCreateApplicationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.createApplicationTemplate(formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.appTemplates });
    },
  });
}

export function useCreateApplicationTemplateManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; rawText: string; tags?: string[] }) =>
      api.createApplicationTemplateManual(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.appTemplates });
    },
  });
}

export function useDeleteApplicationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteApplicationTemplate(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<ApplicationTemplate[]>(keys.appTemplates, (prev) =>
        prev ? prev.filter((t) => t._id !== id) : prev
      );
    },
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.createRecommendation(formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.recommendations });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRecommendation(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<Recommendation[]>(keys.recommendations, (prev) =>
        prev ? prev.filter((r) => r._id !== id) : prev
      );
    },
  });
}

export function useConfirmCvKnowledgeExtraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.confirmCvKnowledgeExtraction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.knowledge.all });
    },
  });
}
