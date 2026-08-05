const BASE = '/api';

export function getFileUrl(storageKey: string): string {
  return `${BASE}/files/${encodeURIComponent(storageKey)}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getDashboard: () => request<import('@career-intelligence/shared').DashboardData>('/dashboard'),
  getStatistics: () => request<import('@career-intelligence/shared').Statistics>('/statistics'),

  getApplications: () => request<import('@career-intelligence/shared').Application[]>('/applications'),
  getApplication: (id: string) => request<import('@career-intelligence/shared').Application>(`/applications/${id}`),
  createApplication: (data: { url?: string; manualText?: string; companyName?: string; title?: string }) =>
    request<import('@career-intelligence/shared').Application>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplicationStatus: (id: string, status: string, note?: string) =>
    request<import('@career-intelligence/shared').Application>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  updateApplicationWishlist: (id: string, isWishlisted: boolean) =>
    request<import('@career-intelligence/shared').Application>(`/applications/${id}/wishlist`, {
      method: 'PATCH',
      body: JSON.stringify({ isWishlisted }),
    }),
  deleteApplication: (id: string) =>
    request<{ success: boolean }>(`/applications/${id}`, { method: 'DELETE' }),
  analyzeApplication: (id: string) =>
    request<import('@career-intelligence/shared').Application>(`/applications/${id}/analyze`, { method: 'POST' }),
  answerQuestions: (
    id: string,
    answers: Array<{ question: string; answer: string; saveToKnowledge?: boolean }>
  ) =>
    request<import('@career-intelligence/shared').Application>(`/applications/${id}/answer-questions`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  generateDocuments: (
    id: string,
    options?: { cvTemplateId?: string; applicationTemplateId?: string }
  ) =>
    request<{ application: import('@career-intelligence/shared').Application; documentSet: import('@career-intelligence/shared').DocumentSet }>(
      `/applications/${id}/generate`,
      { method: 'POST', body: JSON.stringify(options || {}) }
    ),
  reviseDocuments: (
    id: string,
    data: { instruction: string; documentSetId?: string }
  ) =>
    request<{ application: import('@career-intelligence/shared').Application; documentSet: import('@career-intelligence/shared').DocumentSet }>(
      `/applications/${id}/revise`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  getDocuments: (id: string) =>
    request<import('@career-intelligence/shared').DocumentSet[]>(`/applications/${id}/documents`),
  saveDocument: (
    id: string,
    data: {
      coverLetter: { content: string };
      basedOnDocumentSetId?: string;
      label?: string;
    }
  ) =>
    request<{ application: import('@career-intelligence/shared').Application; documentSet: import('@career-intelligence/shared').DocumentSet }>(
      `/applications/${id}/documents`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  deleteDocument: (id: string, documentSetId: string) =>
    request<{ success: boolean; application: import('@career-intelligence/shared').Application }>(
      `/applications/${id}/documents/${documentSetId}`,
      { method: 'DELETE' }
    ),
  addNote: (id: string, text: string) =>
    request<import('@career-intelligence/shared').Application>(`/applications/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  interviewPrep: (id: string, context: import('@career-intelligence/shared').InterviewContext) =>
    request<{ interviewPrep: import('@career-intelligence/shared').InterviewPrep; application: import('@career-intelligence/shared').Application }>(
      `/applications/${id}/interview-prep`,
      { method: 'POST', body: JSON.stringify({ context }) }
    ),
  exportPdf: (id: string, documentSetId?: string) =>
    request<{ documentSetId: string; cvUrl: string; coverLetterUrl: string; documentSet: import('@career-intelligence/shared').DocumentSet }>(
      `/applications/${id}/export-pdf`,
      { method: 'POST', body: JSON.stringify({ documentSetId }) }
    ),
  sendEmail: (id: string, data: { to: string; subject: string; body: string; documentSetId?: string }) =>
    request<{ success: boolean; application: import('@career-intelligence/shared').Application }>(
      `/applications/${id}/send-email`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getCompanies: () => request<import('@career-intelligence/shared').Company[]>('/companies'),
  getCompany: (id: string) => request<import('@career-intelligence/shared').Company>(`/companies/${id}`),
  createCompany: (data: {
    name: string;
    cvr?: string;
    description?: string;
    website?: string;
    linkedIn?: string;
    industry?: string;
    employeeCount?: string;
    location?: string;
  }) =>
    request<import('@career-intelligence/shared').Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  getCompanyApplications: (id: string) =>
    request<import('@career-intelligence/shared').Application[]>(`/companies/${id}/applications`),
  updateCompany: (id: string, data: Partial<import('@career-intelligence/shared').Company>) =>
    request<import('@career-intelligence/shared').Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) =>
    request<{ success: boolean }>(`/companies/${id}`, { method: 'DELETE' }),
  addCompanyNote: (id: string, text: string) =>
    request<import('@career-intelligence/shared').Company>(`/companies/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  deleteCompanyNote: (id: string, noteIndex: number) =>
    request<import('@career-intelligence/shared').Company>(`/companies/${id}/notes/${noteIndex}`, {
      method: 'DELETE',
    }),
  researchCompany: (id: string, data: { name?: string; cvr?: string }) =>
    request<import('@career-intelligence/shared').CompanyResearchResult>(`/companies/${id}/research`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  researchCompanyPreview: (data: { name?: string; cvr?: string }) =>
    request<import('@career-intelligence/shared').CompanyResearchResult>('/companies/research', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getKnowledge: () => request<import('@career-intelligence/shared').KnowledgeEntry[]>('/knowledge'),
  getKnowledgeEntry: (id: string) => request<import('@career-intelligence/shared').KnowledgeEntry>(`/knowledge/${id}`),
  createKnowledge: (data: Partial<import('@career-intelligence/shared').KnowledgeEntry>) =>
    request<import('@career-intelligence/shared').KnowledgeEntry>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  updateKnowledge: (id: string, data: Partial<import('@career-intelligence/shared').KnowledgeEntry>) =>
    request<import('@career-intelligence/shared').KnowledgeEntry>(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKnowledge: (id: string) => request<{ success: boolean }>(`/knowledge/${id}`, { method: 'DELETE' }),

  getCvTemplates: () => request<import('@career-intelligence/shared').CvTemplate[]>('/cv-templates'),
  createCvTemplate: (formData: FormData) =>
    fetch(`${BASE}/cv-templates`, { method: 'POST', body: formData }).then((r) => r.json()),
  createCvTemplateManual: (data: { name: string; rawText: string; tags?: string[] }) =>
    request<import('@career-intelligence/shared').CvTemplate>('/cv-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCvTemplate: (id: string) =>
    request<{ success: boolean }>(`/cv-templates/${id}`, { method: 'DELETE' }),
  extractCvKnowledge: () =>
    request<import('@career-intelligence/shared').CvKnowledgeExtractionResult>(
      '/cv-templates/extract-knowledge',
      { method: 'POST' }
    ),
  confirmCvKnowledgeExtraction: (entries: import('@career-intelligence/shared').KnowledgeEntryDraft[]) =>
    request<{ success: boolean; ids: string[]; count: number }>(
      '/cv-templates/extract-knowledge/confirm',
      { method: 'POST', body: JSON.stringify({ entries }) }
    ),

  getApplicationTemplates: () =>
    request<import('@career-intelligence/shared').ApplicationTemplate[]>('/application-templates'),
  createApplicationTemplate: (formData: FormData) =>
    fetch(`${BASE}/application-templates`, { method: 'POST', body: formData }).then((r) => r.json()),
  createApplicationTemplateManual: (data: { name: string; rawText: string; tags?: string[] }) =>
    request<import('@career-intelligence/shared').ApplicationTemplate>('/application-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteApplicationTemplate: (id: string) =>
    request<{ success: boolean }>(`/application-templates/${id}`, { method: 'DELETE' }),

  getSettings: () => request<import('@career-intelligence/shared').Settings>('/settings'),
  updateSettings: (data: Partial<import('@career-intelligence/shared').Settings>) =>
    request<import('@career-intelligence/shared').Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getEmailStatus: () =>
    request<{ connected: boolean; provider: string | null; connectedEmail?: string }>('/settings/email/status'),
  disconnectEmail: () => request<{ success: boolean }>('/settings/email/disconnect', { method: 'DELETE' }),
  connectEmail: (provider: 'google' | 'microsoft') => {
    window.location.href = `/api/settings/email/connect/${provider}`;
  },
};
