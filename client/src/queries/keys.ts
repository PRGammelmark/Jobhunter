export const keys = {
  dashboard: ['dashboard'] as const,
  statistics: ['statistics'] as const,
  applications: {
    all: ['applications'] as const,
    detail: (id: string) => ['applications', id] as const,
    documents: (id: string) => ['applications', id, 'documents'] as const,
  },
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
    applications: (id: string) => ['companies', id, 'applications'] as const,
  },
  knowledge: {
    all: ['knowledge'] as const,
    detail: (id: string) => ['knowledge', id] as const,
  },
  settings: ['settings'] as const,
  emailStatus: ['email-status'] as const,
  cvTemplates: ['cv-templates'] as const,
  appTemplates: ['app-templates'] as const,
  recommendations: ['recommendations'] as const,
};

export function cachePersistKey(tenantId: string): string {
  return `jh-cache-v1:${tenantId}`;
}
