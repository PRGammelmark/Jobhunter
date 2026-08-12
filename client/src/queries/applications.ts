import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Application, InterviewContext } from '@career-intelligence/shared';
import { api } from '../services/api';
import { keys } from './keys';
import {
  invalidateApplicationDerived,
  invalidateCompanies,
  removeApplicationCache,
  upsertApplicationCache,
} from './cacheHelpers';

export function useApplications() {
  return useQuery({
    queryKey: keys.applications.all,
    queryFn: () => api.getApplications(),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: keys.applications.detail(id!),
    queryFn: () => api.getApplication(id!),
    enabled: Boolean(id),
  });
}

export function useDocuments(id: string | undefined) {
  return useQuery({
    queryKey: keys.applications.documents(id!),
    queryFn: () => api.getDocuments(id!),
    enabled: Boolean(id),
  });
}

export function usePrefetchApplication() {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.prefetchQuery({
      queryKey: keys.applications.detail(id),
      queryFn: () => api.getApplication(id),
    });
    void queryClient.prefetchQuery({
      queryKey: keys.applications.documents(id),
      queryFn: () => api.getDocuments(id),
    });
  };
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      url?: string;
      manualText?: string;
      companyName?: string;
      title?: string;
    }) => api.createApplication(data),
    onSuccess: (app) => {
      upsertApplicationCache(queryClient, app);
      invalidateApplicationDerived(queryClient);
      invalidateCompanies(queryClient);
    },
  });
}

export function useUpdateApplicationWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isWishlisted }: { id: string; isWishlisted: boolean }) =>
      api.updateApplicationWishlist(id, isWishlisted),
    onMutate: async ({ id, isWishlisted }) => {
      await queryClient.cancelQueries({ queryKey: keys.applications.all });
      const previous = queryClient.getQueryData<Application[]>(keys.applications.all);
      queryClient.setQueryData<Application[]>(keys.applications.all, (prev) =>
        prev?.map((a) => (a._id === id ? { ...a, isWishlisted } : a))
      );
      const prevDetail = queryClient.getQueryData<Application>(keys.applications.detail(id));
      if (prevDetail) {
        queryClient.setQueryData(keys.applications.detail(id), {
          ...prevDetail,
          isWishlisted,
        });
      }
      return { previous, prevDetail };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(keys.applications.all, ctx.previous);
      if (ctx?.prevDetail) queryClient.setQueryData(keys.applications.detail(id), ctx.prevDetail);
    },
    onSuccess: (app) => {
      upsertApplicationCache(queryClient, app);
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteApplication(id),
    onSuccess: (_res, id) => {
      removeApplicationCache(queryClient, id);
      invalidateApplicationDerived(queryClient);
      invalidateCompanies(queryClient);
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.updateApplicationStatus(id, status, note),
    onSuccess: (app) => {
      upsertApplicationCache(queryClient, app);
      invalidateApplicationDerived(queryClient);
    },
  });
}

export function useAnalyzeApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.analyzeApplication(id),
    onSuccess: (app) => {
      upsertApplicationCache(queryClient, app);
    },
  });
}

export function useAnswerQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      answers,
    }: {
      id: string;
      answers: Array<{ question: string; answer: string; saveToKnowledge?: boolean }>;
    }) => api.answerQuestions(id, answers),
    onSuccess: (app, { answers }) => {
      upsertApplicationCache(queryClient, app);
      if (answers.some((a) => a.saveToKnowledge)) {
        void queryClient.invalidateQueries({ queryKey: keys.knowledge.all });
      }
    },
  });
}

export function useGenerateDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      options,
    }: {
      id: string;
      options?: {
        cvTemplateId?: string;
        applicationTemplateId?: string;
        applicationTemplateTypeId?: string;
      };
    }) => api.generateDocuments(id, options),
    onSuccess: ({ application }, { id }) => {
      upsertApplicationCache(queryClient, application);
      void queryClient.invalidateQueries({ queryKey: keys.applications.documents(id) });
    },
  });
}

export function useReviseDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { instruction: string; documentSetId?: string };
    }) => api.reviseDocuments(id, data),
    onSuccess: ({ application }, { id }) => {
      upsertApplicationCache(queryClient, application);
      void queryClient.invalidateQueries({ queryKey: keys.applications.documents(id) });
    },
  });
}

export function useSaveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        coverLetter: { content: string };
        basedOnDocumentSetId?: string;
        label?: string;
      };
    }) => api.saveDocument(id, data),
    onSuccess: ({ application }, { id }) => {
      upsertApplicationCache(queryClient, application);
      void queryClient.invalidateQueries({ queryKey: keys.applications.documents(id) });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, documentSetId }: { id: string; documentSetId: string }) =>
      api.deleteDocument(id, documentSetId),
    onSuccess: ({ application }, { id }) => {
      upsertApplicationCache(queryClient, application);
      void queryClient.invalidateQueries({ queryKey: keys.applications.documents(id) });
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.addNote(id, text),
    onSuccess: (app) => {
      upsertApplicationCache(queryClient, app);
    },
  });
}

export function useInterviewPrep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, context }: { id: string; context: InterviewContext }) =>
      api.interviewPrep(id, context),
    onSuccess: ({ application }) => {
      upsertApplicationCache(queryClient, application);
    },
  });
}

export function useExportPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, documentSetId }: { id: string; documentSetId?: string }) =>
      api.exportPdf(id, documentSetId),
    onSuccess: (_res, { id }) => {
      void queryClient.invalidateQueries({ queryKey: keys.applications.documents(id) });
      void queryClient.invalidateQueries({ queryKey: keys.applications.detail(id) });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        to: string;
        subject: string;
        body: string;
        documentSetId?: string;
        recommendationIds?: string[];
      };
    }) => api.sendEmail(id, data),
    onSuccess: ({ application }) => {
      upsertApplicationCache(queryClient, application);
      invalidateApplicationDerived(queryClient);
    },
  });
}
