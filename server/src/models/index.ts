import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ApplicationStatus, KnowledgeEntryType } from '@career-intelligence/shared';

const fileRefSchema = new Schema(
  {
    storageKey: String,
    mimeType: String,
    fileName: String,
    sizeBytes: Number,
    uploadedAt: Date,
  },
  { _id: false }
);

const settingsSchema = new Schema({
  _id: { type: String, default: 'app' } as never,
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
});

export interface ICompany extends Document {
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
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, index: true },
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

export interface IKnowledgeEntry extends Document {
  title: string;
  type: KnowledgeEntryType;
  description: string;
  keywords: string[];
  /** 1–5, only for type === 'skill' */
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

export interface ICvTemplate extends Document {
  name: string;
  tags: string[];
  originalFile?: { storageKey: string; mimeType: string; fileName: string; sizeBytes?: number; uploadedAt?: Date };
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

export interface IApplicationTemplate extends Document {
  name: string;
  tags: string[];
  originalFile?: { storageKey: string; mimeType: string; fileName: string; sizeBytes?: number; uploadedAt?: Date };
  parsedContent?: { rawText: string };
  isDefault: boolean;
  stats: { timesUsed: number; interviewsGenerated: number; offersGenerated: number };
}

const applicationTemplateSchema = new Schema<IApplicationTemplate>(
  {
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

export interface IApplication extends Document {
  companyId?: Types.ObjectId;
  status: ApplicationStatus;
  isWishlisted: boolean;
  statusHistory: Array<{ status: ApplicationStatus; changedAt: Date; note?: string }>;
  job: {
    url: string;
    source: string;
    scrapedAt?: Date;
    archivedHtml?: { storageKey: string; capturedAt: Date };
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
      archivedHtml: { storageKey: String, capturedAt: Date },
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
      type: [{ _id: { type: Schema.Types.ObjectId, auto: true }, text: String, createdAt: { type: Date, default: Date.now } }],
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

export interface IDocumentSet extends Document {
  applicationId: Types.ObjectId;
  version: number;
  label?: string;
  source: 'ai_generated' | 'manual_edit' | 'template_copy';
  cv: {
    content: string;
    pdfFile?: { storageKey: string; fileName: string };
    basedOnTemplateId?: Types.ObjectId;
    knowledgeEntriesUsed: Types.ObjectId[];
  };
  coverLetter: { content: string; pdfFile?: { storageKey: string; fileName: string }; basedOnTemplateId?: Types.ObjectId };
  potentialImprovements?: string[];
  aiPromptSnapshot?: string;
}

const documentSetSchema = new Schema<IDocumentSet>(
  {
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
      pdfFile: { storageKey: String, fileName: String },
      basedOnTemplateId: { type: Schema.Types.ObjectId, ref: 'CvTemplate' },
      knowledgeEntriesUsed: { type: [Schema.Types.ObjectId], default: [] },
    },
    coverLetter: {
      content: { type: String, default: '' },
      pdfFile: { storageKey: String, fileName: String },
      basedOnTemplateId: { type: Schema.Types.ObjectId, ref: 'ApplicationTemplate' },
    },
    potentialImprovements: [String],
    aiPromptSnapshot: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

documentSetSchema.index({ applicationId: 1, version: 1 }, { unique: true });

export const Settings = mongoose.model('Settings', settingsSchema);
export const Company = mongoose.model<ICompany>('Company', companySchema);
export const KnowledgeEntry = mongoose.model<IKnowledgeEntry>('KnowledgeEntry', knowledgeEntrySchema);
export const CvTemplate = mongoose.model<ICvTemplate>('CvTemplate', cvTemplateSchema);
export const ApplicationTemplate = mongoose.model<IApplicationTemplate>('ApplicationTemplate', applicationTemplateSchema);
export const Application = mongoose.model<IApplication>('Application', applicationSchema);
export const DocumentSet = mongoose.model<IDocumentSet>('DocumentSet', documentSetSchema);
