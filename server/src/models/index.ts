import mongoose, { Schema, Document, Types } from 'mongoose';
import type {
  ApplicationStatus,
  KnowledgeEntryType,
  PlatformRole,
  AccountStatus,
} from '@career-intelligence/shared';

const fileRefSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, ref: 'StoredFile' },
    storageKey: String,
    mimeType: String,
    fileName: String,
    sizeBytes: Number,
    uploadedAt: Date,
  },
  { _id: false }
);

/** Global unique email is intentional for MVP (1 user = 1 tenant). */
const tenantSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['active', 'disabled', 'deleted'] satisfies AccountStatus[],
      default: 'active',
    },
  },
  { timestamps: true }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    platformRole: {
      type: String,
      enum: ['admin', 'user'] satisfies PlatformRole[],
      required: true,
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'disabled', 'deleted'] satisfies AccountStatus[],
      default: 'active',
    },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);
userSchema.index({ email: 1 }, { unique: true });

const platformConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    setupCompleted: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const migrationSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    completedAt: { type: Date, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
  },
  { timestamps: false }
);

const oauthNonceSchema = new Schema(
  {
    nonce: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    provider: { type: String, enum: ['google', 'microsoft'], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);
oauthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const storedFileSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
storedFileSchema.index({ tenantId: 1, createdAt: -1 });

const settingsSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true },
  profile: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: String,
    linkedIn: String,
  },
  aboutMe: { type: String, default: '' },
  emailIntegration: {
    provider: { type: String, enum: ['gmail', 'outlook', null], default: null },
    accessToken: String,
    refreshToken: String,
    tokenExpiresAt: Date,
    connectedEmail: String,
  },
  preferences: {
    defaultLanguage: { type: String, default: 'da' },
    aiModel: { type: String, default: 'gpt-4o-mini' },
  },
  /** Optional override of cover-letter generation instructions. */
  coverLetterPrompt: { type: String, default: '' },
});
settingsSchema.index({ tenantId: 1 }, { unique: true });

export interface ICompany extends Document {
  tenantId: Types.ObjectId;
  name: string;
  normalizedName: string;
  cvr?: string;
  description?: string;
  website?: string;
  linkedIn?: string;
  industry?: string;
  employeeCount?: string;
  location?: string;
  memory: {
    salaryNotes: Array<{ range?: string; source: string; date: Date }>;
    contacts: Array<{
      name: string;
      role?: string;
      linkedIn?: string;
      email?: string;
      notes?: string;
    }>;
    interviewQuestions: string[];
    generalNotes: string[];
  };
  applicationIds: Types.ObjectId[];
  interviewIds: Types.ObjectId[];
  firstSeenAt: Date;
  lastActivityAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    normalizedName: { type: String, required: true },
    cvr: String,
    description: String,
    website: String,
    linkedIn: String,
    industry: String,
    employeeCount: String,
    location: String,
    memory: {
      salaryNotes: { type: [{ range: String, source: String, date: Date }], default: [] },
      contacts: {
        type: [
          {
            name: String,
            role: String,
            linkedIn: String,
            email: String,
            notes: String,
          },
        ],
        default: [],
      },
      interviewQuestions: { type: [String], default: [] },
      generalNotes: { type: [String], default: [] },
    },
    applicationIds: { type: [Schema.Types.ObjectId], default: [] },
    interviewIds: { type: [Schema.Types.ObjectId], default: [] },
    firstSeenAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
companySchema.index({ tenantId: 1, normalizedName: 1 }, { unique: true });
companySchema.index({ tenantId: 1, lastActivityAt: -1 });

export interface IKnowledgeEntry extends Document {
  tenantId: Types.ObjectId;
  title: string;
  type: KnowledgeEntryType;
  description: string;
  keywords: string[];
  confidence?: number;
  confidenceLabel?: string;
  relatedEntryIds: Types.ObjectId[];
  metrics: Array<{ label: string; value: string }>;
  results: string[];
  cases: Array<{
    situation: string;
    task: string;
    action: string;
    result: string;
    tags: string[];
  }>;
  whenToUse: string;
  employment?: {
    company: string;
    role: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    location?: string;
    employmentType?: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
    responsibilities?: string[];
  };
}

const knowledgeEntrySchema = new Schema<IKnowledgeEntry>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['project', 'skill', 'education', 'achievement', 'story', 'employment'],
      required: true,
    },
    description: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    confidence: { type: Number, min: 1, max: 5 },
    confidenceLabel: String,
    relatedEntryIds: { type: [Schema.Types.ObjectId], ref: 'KnowledgeEntry', default: [] },
    metrics: { type: [{ label: String, value: String }], default: [] },
    results: { type: [String], default: [] },
    cases: {
      type: [
        {
          situation: String,
          task: String,
          action: String,
          result: String,
          tags: [String],
        },
      ],
      default: [],
    },
    whenToUse: { type: String, default: '' },
    employment: {
      company: String,
      role: String,
      startDate: String,
      endDate: String,
      isCurrent: Boolean,
      location: String,
      employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
      },
      responsibilities: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);
knowledgeEntrySchema.index({ tenantId: 1, title: 1 });

export interface ICvTemplate extends Document {
  tenantId: Types.ObjectId;
  name: string;
  tags: string[];
  originalFile?: {
    fileId?: Types.ObjectId;
    storageKey: string;
    mimeType: string;
    fileName: string;
    sizeBytes?: number;
    uploadedAt?: Date;
  };
  parsedContent?: {
    rawText: string;
    sections: {
      summary?: string;
      experience: Array<{ title: string; company: string; period: string; bullets: string[] }>;
      education: Array<{ degree: string; institution: string; period: string }>;
      skills: string[];
    };
  };
  isDefault: boolean;
  stats: { timesUsed: number; interviewsGenerated: number; offersGenerated: number };
}

const cvTemplateSchema = new Schema<ICvTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    tags: { type: [String], default: [] },
    originalFile: fileRefSchema,
    parsedContent: Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
    stats: {
      timesUsed: { type: Number, default: 0 },
      interviewsGenerated: { type: Number, default: 0 },
      offersGenerated: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
cvTemplateSchema.index({ tenantId: 1, createdAt: -1 });

export interface IApplicationTemplate extends Document {
  tenantId: Types.ObjectId;
  name: string;
  tags: string[];
  originalFile?: {
    fileId?: Types.ObjectId;
    storageKey: string;
    mimeType: string;
    fileName: string;
    sizeBytes?: number;
    uploadedAt?: Date;
  };
  parsedContent?: { rawText: string };
  isDefault: boolean;
  stats: { timesUsed: number; interviewsGenerated: number; offersGenerated: number };
}

const applicationTemplateSchema = new Schema<IApplicationTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    tags: { type: [String], default: [] },
    originalFile: fileRefSchema,
    parsedContent: Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
    stats: {
      timesUsed: { type: Number, default: 0 },
      interviewsGenerated: { type: Number, default: 0 },
      offersGenerated: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
applicationTemplateSchema.index({ tenantId: 1, createdAt: -1 });

export interface IRecommendation extends Document {
  tenantId: Types.ObjectId;
  name: string;
  from?: string;
  notes?: string;
  originalFile: {
    fileId?: Types.ObjectId;
    storageKey: string;
    mimeType: string;
    fileName: string;
    sizeBytes?: number;
    uploadedAt?: Date;
  };
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    from: String,
    notes: String,
    originalFile: { type: fileRefSchema, required: true },
  },
  { timestamps: true }
);
recommendationSchema.index({ tenantId: 1, createdAt: -1 });

export interface IApplication extends Document {
  tenantId: Types.ObjectId;
  companyId?: Types.ObjectId;
  status: ApplicationStatus;
  isWishlisted: boolean;
  statusHistory: Array<{ status: ApplicationStatus; changedAt: Date; note?: string }>;
  job: {
    url: string;
    source: string;
    scrapedAt?: Date;
    archivedHtml?: { storageKey: string; fileId?: Types.ObjectId; capturedAt: Date };
    title: string;
    companyName: string;
    location?: string;
    deadline?: Date;
    employmentType?: string;
    summary: string;
    keyRequirements: string[];
    keyResponsibilities: string[];
    salary?: string;
    contactEmail?: string;
    language: string;
    rawText?: string;
  };
  aiAnalysis?: Record<string, unknown>;
  interviewPrep?: Record<string, unknown>;
  activeDocumentSetId?: Types.ObjectId;
  notes: Array<{ _id: Types.ObjectId; text: string; createdAt: Date }>;
  emailDraft?: Record<string, unknown>;
  hideGenerateCoverLetter?: boolean;
  sentAt?: Date;
  responseReceivedAt?: Date;
  interviewAt?: Date;
  outcomeAt?: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'ready_for_review',
        'ready_to_send',
        'sent',
        'interview',
        'rejected',
        'offer',
        'hired',
      ],
      default: 'not_started',
    },
    isWishlisted: { type: Boolean, default: false },
    statusHistory: {
      type: [{ status: String, changedAt: Date, note: String }],
      default: [],
    },
    job: {
      url: { type: String, default: '' },
      source: { type: String, default: 'unknown' },
      scrapedAt: Date,
      archivedHtml: { storageKey: String, fileId: Schema.Types.ObjectId, capturedAt: Date },
      title: { type: String, default: 'Nyt stillingsopslag' },
      companyName: { type: String, default: '' },
      location: String,
      deadline: Date,
      employmentType: String,
      summary: { type: String, default: '' },
      keyRequirements: { type: [String], default: [] },
      keyResponsibilities: { type: [String], default: [] },
      salary: String,
      contactEmail: String,
      language: { type: String, default: 'da' },
      rawText: String,
    },
    aiAnalysis: Schema.Types.Mixed,
    interviewPrep: Schema.Types.Mixed,
    activeDocumentSetId: { type: Schema.Types.ObjectId, ref: 'DocumentSet' },
    notes: {
      type: [
        {
          _id: { type: Schema.Types.ObjectId, auto: true },
          text: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    emailDraft: Schema.Types.Mixed,
    hideGenerateCoverLetter: { type: Boolean, default: false },
    sentAt: Date,
    responseReceivedAt: Date,
    interviewAt: Date,
    outcomeAt: Date,
  },
  { timestamps: true }
);
applicationSchema.index({ tenantId: 1, createdAt: -1 });
applicationSchema.index({ tenantId: 1, status: 1 });

export interface IDocumentSet extends Document {
  tenantId: Types.ObjectId;
  applicationId: Types.ObjectId;
  version: number;
  label?: string;
  source: 'ai_generated' | 'manual_edit' | 'template_copy';
  cv: {
    content: string;
    pdfFile?: { storageKey: string; fileName: string; fileId?: Types.ObjectId };
    basedOnTemplateId?: Types.ObjectId;
    knowledgeEntriesUsed: Types.ObjectId[];
  };
  coverLetter: {
    content: string;
    pdfFile?: { storageKey: string; fileName: string; fileId?: Types.ObjectId };
    basedOnTemplateId?: Types.ObjectId;
  };
  potentialImprovements?: string[];
  aiPromptSnapshot?: string;
}

const documentSetSchema = new Schema<IDocumentSet>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    version: { type: Number, required: true },
    label: String,
    source: {
      type: String,
      enum: ['ai_generated', 'manual_edit', 'template_copy'],
      default: 'ai_generated',
    },
    cv: {
      content: { type: String, default: '' },
      pdfFile: { storageKey: String, fileName: String, fileId: Schema.Types.ObjectId },
      basedOnTemplateId: { type: Schema.Types.ObjectId, ref: 'CvTemplate' },
      knowledgeEntriesUsed: { type: [Schema.Types.ObjectId], default: [] },
    },
    coverLetter: {
      content: { type: String, default: '' },
      pdfFile: { storageKey: String, fileName: String, fileId: Schema.Types.ObjectId },
      basedOnTemplateId: { type: Schema.Types.ObjectId, ref: 'ApplicationTemplate' },
    },
    potentialImprovements: [String],
    aiPromptSnapshot: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
documentSetSchema.index({ tenantId: 1, applicationId: 1, version: 1 }, { unique: true });

export const Tenant = mongoose.model('Tenant', tenantSchema);
export const User = mongoose.model('User', userSchema);
export const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);
export const Migration = mongoose.model('Migration', migrationSchema);
export const OAuthNonce = mongoose.model('OAuthNonce', oauthNonceSchema);
export const StoredFile = mongoose.model('StoredFile', storedFileSchema);
export const Settings = mongoose.model('Settings', settingsSchema);
export const Company = mongoose.model<ICompany>('Company', companySchema);
export const KnowledgeEntry = mongoose.model<IKnowledgeEntry>('KnowledgeEntry', knowledgeEntrySchema);
export const CvTemplate = mongoose.model<ICvTemplate>('CvTemplate', cvTemplateSchema);
export const ApplicationTemplate = mongoose.model<IApplicationTemplate>(
  'ApplicationTemplate',
  applicationTemplateSchema
);
export const Recommendation = mongoose.model<IRecommendation>('Recommendation', recommendationSchema);
export const Application = mongoose.model<IApplication>('Application', applicationSchema);
export const DocumentSet = mongoose.model<IDocumentSet>('DocumentSet', documentSetSchema);
