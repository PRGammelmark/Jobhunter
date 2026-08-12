import type { ApplicationTemplateTypeId } from './applicationTemplateTypes';

export type ApplicationStatus =
  | 'not_started'
  | 'in_progress'
  | 'ready_for_review'
  | 'ready_to_send'
  | 'sent'
  | 'interview'
  | 'rejected'
  | 'offer'
  | 'hired';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'not_started',
  'in_progress',
  'ready_for_review',
  'ready_to_send',
  'sent',
  'interview',
  'rejected',
  'offer',
  'hired',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_started: 'Ikke startet',
  in_progress: 'Under arbejde',
  ready_for_review: 'Klar til review',
  ready_to_send: 'Klar til send',
  sent: 'Sendt',
  interview: 'Samtale',
  rejected: 'Afslag',
  offer: 'Tilbud',
  hired: 'Ansat',
};

export type KnowledgeEntryType =
  | 'project'
  | 'skill'
  | 'education'
  | 'achievement'
  | 'story'
  | 'employment';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'freelance'
  | 'internship';

export interface EmploymentDetails {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  location?: string;
  employmentType?: EmploymentType;
  responsibilities?: string[];
}

export type InterviewRound = 'first' | 'second' | 'third' | 'final' | 'other';
export type InterviewType =
  | 'general'
  | 'technical'
  | 'case'
  | 'hr'
  | 'culture'
  | 'presentation';
export type InterviewFormat = 'online' | 'physical' | 'hybrid';

export interface FileRef {
  /** Database id for authenticated download via /api/files/:fileId */
  fileId?: string;
  storageKey: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

/** Global unique email is intentional for MVP (1 user = 1 tenant). Multi-workspace needs Membership later. */
export type PlatformRole = 'admin' | 'user';

export type AccountStatus = 'active' | 'disabled' | 'deleted';

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  tenantId: string;
  status: AccountStatus;
}

export interface AuthStatus {
  setupRequired: boolean;
}

export interface PlatformUser {
  _id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  tenantId: string;
  status: AccountStatus;
  createdAt: string;
}

export interface StarCase {
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
}

/** Skill confidence on a 1–5 scale. Only meaningful for type === 'skill'. */
export type SkillConfidence = 1 | 2 | 3 | 4 | 5;

/** Normalize a confidence value to 1–5. Converts legacy 0–100 values when needed. */
export function normalizeSkillConfidence(value: unknown, fallback: SkillConfidence = 3): SkillConfidence {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  const scaled = value > 5 ? Math.round(value / 20) : Math.round(value);
  return Math.max(1, Math.min(5, scaled)) as SkillConfidence;
}

export interface KnowledgeEntry {
  _id: string;
  title: string;
  type: KnowledgeEntryType;
  description: string;
  keywords: string[];
  /** 1–5, only for type === 'skill' */
  confidence?: number;
  confidenceLabel?: string;
  relatedEntryIds: string[];
  metrics: Array<{ label: string; value: string }>;
  results: string[];
  cases: StarCase[];
  whenToUse: string;
  employment?: EmploymentDetails;
  createdAt: string;
  updatedAt: string;
}

/** Draft knowledge entry extracted from CVs, before user confirms save */
export interface KnowledgeEntryDraft {
  title: string;
  type: KnowledgeEntryType;
  description: string;
  keywords: string[];
  /** 1–5, only for type === 'skill' */
  confidence?: number;
  whenToUse: string;
  results: string[];
  metrics: Array<{ label: string; value: string }>;
  employment?: EmploymentDetails;
  sourceCvIds: string[];
}

export interface CvKnowledgeExtractionResult {
  candidates: KnowledgeEntryDraft[];
  skippedDuplicates: number;
  cvsProcessed: number;
  cvsSkipped: number;
}

export interface CompanyContact {
  name: string;
  role?: string;
  linkedIn?: string;
  email?: string;
  notes?: string;
}

export interface CompanyMemory {
  salaryNotes: Array<{ range?: string; source: string; date: string }>;
  contacts: CompanyContact[];
  interviewQuestions: string[];
  generalNotes: string[];
}

export interface Company {
  _id: string;
  name: string;
  normalizedName: string;
  cvr?: string;
  description?: string;
  website?: string;
  linkedIn?: string;
  industry?: string;
  employeeCount?: string;
  location?: string;
  memory: CompanyMemory;
  applicationIds: string[];
  interviewIds: string[];
  firstSeenAt: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyResearchResult {
  name?: string;
  cvr?: string;
  description?: string;
  website?: string;
  linkedIn?: string;
  industry?: string;
  employeeCount?: string;
  location?: string;
  sources?: string[];
}

export interface SuggestedStory {
  knowledgeEntryId: string;
  title: string;
  reason: string;
}

export interface AiQuestion {
  question: string;
  context: string;
  answered?: boolean;
  answer?: string;
  knowledgeEntryId?: string;
}

export interface AiAnalysis {
  strengths: string[];
  risks: string[];
  interviewRisks: string[];
  suggestedStories: SuggestedStory[];
  aiQuestions: AiQuestion[];
  selectedCvTemplateId?: string;
  recommendation?: 'use_existing' | 'minor_tweaks' | 'generate_new';
  suggestedTweaks: string[];
  /** Qualitative ~100-word assessment of how well the job matches the candidate */
  matchAssessment?: string;
  analyzedAt?: string;
}

export interface InterviewContext {
  round: InterviewRound;
  type: InterviewType;
  format: InterviewFormat;
  notes?: string;
}

export interface InterviewPrep {
  context: InterviewContext;
  companyResearch: string;
  questionsToAsk: string[];
  likelyQuestions: string[];
  salaryPrep: { range?: string; talkingPoints: string[] };
  elevatorPitch: string;
  previousInterviewInsights?: string[];
  generatedAt: string;
}

export interface ApplicationNote {
  _id: string;
  text: string;
  createdAt: string;
}

export interface JobInfo {
  url: string;
  source: string;
  scrapedAt?: string;
  archivedHtml?: { storageKey: string; capturedAt: string };
  title: string;
  companyName: string;
  location?: string;
  deadline?: string;
  employmentType?: string;
  summary: string;
  keyRequirements: string[];
  keyResponsibilities: string[];
  salary?: string;
  contactEmail?: string;
  language: string;
  rawText?: string;
}

export interface Application {
  _id: string;
  companyId?: string;
  status: ApplicationStatus;
  isWishlisted: boolean;
  statusHistory: Array<{ status: ApplicationStatus; changedAt: string; note?: string }>;
  job: JobInfo;
  aiAnalysis?: AiAnalysis;
  interviewPrep?: InterviewPrep;
  activeDocumentSetId?: string;
  notes: ApplicationNote[];
  emailDraft?: {
    to: string;
    subject: string;
    body: string;
    lastSentAt?: string;
    sentMessageId?: string;
  };
  /**
   * When true, hide the "Generér ansøgning" button (set after auto-generating
   * the first draft). Cleared when the user manually deletes all drafts.
   */
  hideGenerateCoverLetter?: boolean;
  sentAt?: string;
  responseReceivedAt?: string;
  interviewAt?: string;
  outcomeAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CvTemplate {
  _id: string;
  name: string;
  tags: string[];
  originalFile?: FileRef;
  parsedContent?: {
    rawText: string;
    sections: {
      summary?: string;
      experience: Array<{
        title: string;
        company: string;
        period: string;
        bullets: string[];
      }>;
      education: Array<{ degree: string; institution: string; period: string }>;
      skills: string[];
    };
  };
  isDefault: boolean;
  stats: {
    timesUsed: number;
    interviewsGenerated: number;
    offersGenerated: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationTemplate {
  _id: string;
  name: string;
  tags: string[];
  originalFile?: FileRef;
  parsedContent?: {
    rawText: string;
  };
  isDefault: boolean;
  stats: {
    timesUsed: number;
    interviewsGenerated: number;
    offersGenerated: number;
  };
  createdAt: string;
  updatedAt: string;
}

/** Uploaded recommendation letter that can be attached when sending an application */
export interface Recommendation {
  _id: string;
  name: string;
  /** Who wrote the recommendation, e.g. "Tidligere chef, Acme" */
  from?: string;
  notes?: string;
  originalFile: FileRef;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPdfFile {
  storageKey: string;
  fileName: string;
  fileId?: string;
}

export interface DocumentSet {
  _id: string;
  applicationId: string;
  version: number;
  label?: string;
  source: 'ai_generated' | 'manual_edit' | 'template_copy';
  cv: {
    content: string;
    pdfFile?: DocumentPdfFile;
    basedOnTemplateId?: string;
    knowledgeEntriesUsed: string[];
  };
  coverLetter: {
    content: string;
    pdfFile?: DocumentPdfFile;
    basedOnTemplateId?: string;
    /** Built-in application style type id (mutually exclusive with basedOnTemplateId) */
    basedOnTemplateType?: ApplicationTemplateTypeId;
  };
  potentialImprovements?: string[];
  aiPromptSnapshot?: string;
  createdAt: string;
}

/** Max words for the free-text "Om mig" knowledge source */
export const ABOUT_ME_MAX_WORDS = 1000;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Models available for AI generation (OpenAI chat completions). */
export const AI_MODELS = [
  { id: 'gpt-5.6', label: 'GPT-5.6', description: 'Flagship (alias for Sol) — bedste kvalitet', group: 'GPT-5.6' },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', description: 'Frontier-model til komplekst arbejde', group: 'GPT-5.6' },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', description: 'Balancerer kvalitet og pris', group: 'GPT-5.6' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', description: 'Hurtig og billig, høj volumen', group: 'GPT-5.6' },
  { id: 'gpt-5.5', label: 'GPT-5.5', description: 'Stærk til professionelt arbejde', group: 'GPT-5' },
  { id: 'gpt-5.4', label: 'GPT-5.4', description: 'God kvalitet til en lavere pris', group: 'GPT-5' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', description: 'Stærk mini-model, lav latency', group: 'GPT-5' },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano', description: 'Billigste GPT-5.4-variant', group: 'GPT-5' },
  { id: 'gpt-5.2', label: 'GPT-5.2', description: 'Tidligere frontier med stærk reasoning', group: 'GPT-5' },
  { id: 'gpt-5.1', label: 'GPT-5.1', description: 'God til agentiske og komplekse opgaver', group: 'GPT-5' },
  { id: 'gpt-5', label: 'GPT-5', description: 'GPT-5 basis', group: 'GPT-5' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', description: 'Hurtig GPT-5 til lavere pris', group: 'GPT-5' },
  { id: 'gpt-5-nano', label: 'GPT-5 nano', description: 'Hurtigste og billigste GPT-5', group: 'GPT-5' },
  { id: 'gpt-4.1', label: 'GPT-4.1', description: 'Høj kvalitet, tidligere generation', group: 'GPT-4' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', description: 'Hurtig GPT-4.1', group: 'GPT-4' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano', description: 'Billigste GPT-4.1', group: 'GPT-4' },
  { id: 'gpt-4o', label: 'GPT-4o', description: 'Solid allround-model', group: 'GPT-4' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Hurtig og billig — god default', group: 'GPT-4' },
  { id: 'o3', label: 'o3', description: 'Reasoning-model til komplekse opgaver', group: 'Reasoning' },
  { id: 'o4-mini', label: 'o4-mini', description: 'Hurtig reasoning-model', group: 'Reasoning' },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];

export const AI_MODEL_IDS: AiModelId[] = AI_MODELS.map((m) => m.id);

export const DEFAULT_AI_MODEL: AiModelId = 'gpt-4o-mini';

export function isAiModelId(value: string): value is AiModelId {
  return (AI_MODEL_IDS as string[]).includes(value);
}

export interface Settings {
  _id: string;
  tenantId: string;
  profile: {
    name: string;
    email: string;
    phone?: string;
    linkedIn?: string;
  };
  /** Free-text knowledge source: who you are, motivations, strengths, etc. */
  aboutMe?: string;
  emailIntegration: {
    provider: 'gmail' | 'outlook' | null;
    connectedEmail?: string;
  };
  preferences: {
    defaultLanguage: 'da' | 'en';
    aiModel: string;
  };
  /**
   * Optional override of the cover-letter generation instructions.
   * When unset, DEFAULT_COVER_LETTER_PROMPT is used.
   */
  coverLetterPrompt?: string;
}

export {
  DEFAULT_COVER_LETTER_PROMPT,
  DEFAULT_COVER_LETTER_PROMPT_DA,
  DEFAULT_COVER_LETTER_PROMPT_EN,
  composeAiPrompt,
  getDefaultCoverLetterPrompt,
  isAppLanguage,
  normalizeCoverLetterPrompt,
  resolveCoverLetterPrompt,
  sanitizeCoverLetterPrompt,
  type AppLanguage,
} from './aiPrompts';

export {
  APPLICATION_TEMPLATE_TYPE_IDS,
  APPLICATION_TEMPLATE_TYPES,
  formatApplicationTemplateTypeForPrompt,
  getApplicationTemplateType,
  isApplicationTemplateTypeId,
  type ApplicationTemplateTypeContent,
  type ApplicationTemplateTypeId,
} from './applicationTemplateTypes';

export type DashboardAttentionReason =
  | 'ai_question'
  | 'send_application'
  | 'follow_up'
  | 'review';

export interface DashboardApplicationSummary {
  _id: string;
  title: string;
  companyName: string;
  status: ApplicationStatus;
  updatedAt: string;
}

export interface DashboardAttentionItem extends DashboardApplicationSummary {
  reason: DashboardAttentionReason;
  unansweredQuestions?: number;
}

export interface DashboardUpcomingItem {
  _id: string;
  title: string;
  companyName: string;
  type: 'interview' | 'deadline';
  at: string;
}

export interface DashboardData {
  pipeline: {
    active: number;
    inProgress: number;
    readyForReview: number;
    readyToSend: number;
    sent: number;
    interviews: number;
    offers: number;
  };
  /** Applications that need a concrete next step from the user */
  needsAttention: DashboardAttentionItem[];
  /** Upcoming interviews and approaching deadlines */
  upcoming: DashboardUpcomingItem[];
  /** Recently updated applications for quick resume */
  recentApplications: DashboardApplicationSummary[];
}

export interface Statistics {
  sent: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  rejectionRate: number;
  avgResponseDays: number;
  cvPerformance: Array<{
    cvTemplateId: string;
    name: string;
    timesUsed: number;
    interviews: number;
  }>;
}
