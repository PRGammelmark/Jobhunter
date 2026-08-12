import type {
  AuthStatus,
  AuthUser,
  PlatformUser,
  DashboardData,
  Statistics,
  Application,
  Company,
  KnowledgeEntry,
  CvTemplate,
  ApplicationTemplate,
  Recommendation,
  Settings,
  DocumentSet,
  InterviewContext,
  InterviewPrep,
  CompanyResearchResult,
  CvKnowledgeExtractionResult,
  KnowledgeEntryDraft,
} from '@career-intelligence/shared';

const BASE = '/api';

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getFileUrl(fileId: string): string {
  return `${BASE}/files/${fileId}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function formRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getAuthStatus: () => request<AuthStatus>('/auth/status'),
  login: (data: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  setup: (data: { email: string; password: string; name: string }) =>
    request<{ user: AuthUser }>('/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: AuthUser }>('/auth/me'),

  getPlatformUsers: () => request<PlatformUser[]>('/platform/users'),
  createPlatformUser: (data: { email: string; password: string; name: string }) =>
    request<PlatformUser>('/platform/users', { method: 'POST', body: JSON.stringify(data) }),
  deletePlatformUser: (id: string) =>
    request<{ success: boolean }>(`/platform/users/${id}`, { method: 'DELETE' }),

  getDashboard: () => request<DashboardData>('/dashboard'),
  getStatistics: () => request<Statistics>('/statistics'),

  getApplications: () => request<Application[]>('/applications'),
  getApplication: (id: string) => request<Application>(`/applications/${id}`),
  createApplication: (data: { url?: string; manualText?: string; companyName?: string; title?: string }) =>
    request<Application>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplicationStatus: (id: string, status: string, note?: string) =>
    request<Application>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  updateApplicationWishlist: (id: string, isWishlisted: boolean) =>
    request<Application>(`/applications/${id}/wishlist`, {
      method: 'PATCH',
      body: JSON.stringify({ isWishlisted }),
    }),
  deleteApplication: (id: string) =>
    request<{ success: boolean }>(`/applications/${id}`, { method: 'DELETE' }),
  analyzeApplication: (id: string) =>
    request<Application>(`/applications/${id}/analyze`, { method: 'POST' }),
  answerQuestions: (
    id: string,
    answers: Array<{ question: string; answer: string; saveToKnowledge?: boolean }>
  ) =>
    request<Application>(`/applications/${id}/answer-questions`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  generateDocuments: (
    id: string,
    options?: {
      cvTemplateId?: string;
      applicationTemplateId?: string;
      applicationTemplateTypeId?: string;
    }
  ) =>
    request<{ application: Application; documentSet: DocumentSet }>(
      `/applications/${id}/generate`,
      { method: 'POST', body: JSON.stringify(options || {}) }
    ),
  reviseDocuments: (id: string, data: { instruction: string; documentSetId?: string }) =>
    request<{ application: Application; documentSet: DocumentSet }>(`/applications/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDocuments: (id: string) => request<DocumentSet[]>(`/applications/${id}/documents`),
  saveDocument: (
    id: string,
    data: {
      coverLetter: { content: string };
      basedOnDocumentSetId?: string;
      label?: string;
    }
  ) =>
    request<{ application: Application; documentSet: DocumentSet }>(`/applications/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string, documentSetId: string) =>
    request<{ success: boolean; application: Application }>(
      `/applications/${id}/documents/${documentSetId}`,
      { method: 'DELETE' }
    ),
  addNote: (id: string, text: string) =>
    request<Application>(`/applications/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  interviewPrep: (id: string, context: InterviewContext) =>
    request<{ interviewPrep: InterviewPrep; application: Application }>(
      `/applications/${id}/interview-prep`,
      { method: 'POST', body: JSON.stringify({ context }) }
    ),
  exportPdf: (id: string, documentSetId?: string) =>
    request<{
      documentSetId: string;
      cvUrl: string;
      coverLetterUrl: string;
      documentSet: DocumentSet;
    }>(`/applications/${id}/export-pdf`, {
      method: 'POST',
      body: JSON.stringify({ documentSetId }),
    }),
  sendEmail: (
    id: string,
    data: {
      to: string;
      subject: string;
      body: string;
      documentSetId?: string;
      recommendationIds?: string[];
    }
  ) =>
    request<{ success: boolean; application: Application }>(`/applications/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCompanies: () => request<Company[]>('/companies'),
  getCompany: (id: string) => request<Company>(`/companies/${id}`),
  createCompany: (data: {
    name: string;
    cvr?: string;
    description?: string;
    website?: string;
    linkedIn?: string;
    industry?: string;
    employeeCount?: string;
    location?: string;
  }) => request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  getCompanyApplications: (id: string) => request<Application[]>(`/companies/${id}/applications`),
  updateCompany: (id: string, data: Partial<Company>) =>
    request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => request<{ success: boolean }>(`/companies/${id}`, { method: 'DELETE' }),
  addCompanyNote: (id: string, text: string) =>
    request<Company>(`/companies/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  deleteCompanyNote: (id: string, noteIndex: number) =>
    request<Company>(`/companies/${id}/notes/${noteIndex}`, { method: 'DELETE' }),
  researchCompany: (id: string, data: { name?: string; cvr?: string }) =>
    request<CompanyResearchResult>(`/companies/${id}/research`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  researchCompanyPreview: (data: { name?: string; cvr?: string }) =>
    request<CompanyResearchResult>('/companies/research', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getKnowledge: () => request<KnowledgeEntry[]>('/knowledge'),
  getKnowledgeEntry: (id: string) => request<KnowledgeEntry>(`/knowledge/${id}`),
  createKnowledge: (data: Partial<KnowledgeEntry>) =>
    request<KnowledgeEntry>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  updateKnowledge: (id: string, data: Partial<KnowledgeEntry>) =>
    request<KnowledgeEntry>(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKnowledge: (id: string) => request<{ success: boolean }>(`/knowledge/${id}`, { method: 'DELETE' }),

  getCvTemplates: () => request<CvTemplate[]>('/cv-templates'),
  createCvTemplate: (formData: FormData) => formRequest<CvTemplate>('/cv-templates', formData),
  createCvTemplateManual: (data: { name: string; rawText: string; tags?: string[] }) =>
    request<CvTemplate>('/cv-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCvTemplate: (id: string) =>
    request<{ success: boolean }>(`/cv-templates/${id}`, { method: 'DELETE' }),
  extractCvKnowledge: () =>
    request<CvKnowledgeExtractionResult>('/cv-templates/extract-knowledge', { method: 'POST' }),
  confirmCvKnowledgeExtraction: (entries: KnowledgeEntryDraft[]) =>
    request<{ success: boolean; ids: string[]; count: number }>(
      '/cv-templates/extract-knowledge/confirm',
      { method: 'POST', body: JSON.stringify({ entries }) }
    ),

  getApplicationTemplates: () => request<ApplicationTemplate[]>('/application-templates'),
  createApplicationTemplate: (formData: FormData) =>
    formRequest<ApplicationTemplate>('/application-templates', formData),
  createApplicationTemplateManual: (data: { name: string; rawText: string; tags?: string[] }) =>
    request<ApplicationTemplate>('/application-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteApplicationTemplate: (id: string) =>
    request<{ success: boolean }>(`/application-templates/${id}`, { method: 'DELETE' }),

  getRecommendations: () => request<Recommendation[]>('/recommendations'),
  createRecommendation: (formData: FormData) =>
    formRequest<Recommendation>('/recommendations', formData),
  updateRecommendation: (id: string, data: { name?: string; from?: string; notes?: string }) =>
    request<Recommendation>(`/recommendations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRecommendation: (id: string) =>
    request<{ success: boolean }>(`/recommendations/${id}`, { method: 'DELETE' }),

  getSettings: () => request<Settings>('/settings'),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getEmailStatus: () =>
    request<{ connected: boolean; provider: string | null; connectedEmail?: string }>(
      '/settings/email/status'
    ),
  disconnectEmail: () => request<{ success: boolean }>('/settings/email/disconnect', { method: 'DELETE' }),
  connectEmail: (provider: 'google' | 'microsoft') => {
    window.location.href = `/api/settings/email/connect/${provider}`;
  },
};
