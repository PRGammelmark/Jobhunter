import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { CvTemplate, KnowledgeEntry } from '../../models';
import { storageService } from '../storage/storageService';
import { extractTextFromBuffer } from '../cv/cvTextExtractor';
import {
  composeAiPrompt,
  normalizeSkillConfidence,
  type CvKnowledgeExtractionResult,
  type EmploymentDetails,
  type EmploymentType,
  type KnowledgeEntryDraft,
  type KnowledgeEntryType,
} from '@career-intelligence/shared';

const CV_KNOWLEDGE_EXTRACTION_INSTRUCTIONS = `Du udtrækker strukturerede datapunkter fra CV'er til en Knowledge Base til jobansøgninger.

Opgave:
1. Identificér ansættelser, uddannelser, kompetencer, projekter, resultater og relevante historier.
2. Strukturér hvert datapunkt som en Knowledge Base-entry.
3. UDELAD alt der allerede findes i knowledge base (samme ansættelse/virksomhed+rolle, samme uddannelse, samme kompetence/projekt osv.).
4. Udelad personlige kontaktoplysninger (adresse, telefon, email) som egne entries.
5. Opfind IKKE fakta — brug kun information fra CV'erne.
6. Hvis flere CV'er indeholder samme datapunkt, medtag det kun én gang og angiv alle relevante sourceCvIds.

Returnér JSON:
{
  "entries": [
    {
      "title": "kort titel (max 80 tegn)",
      "type": "employment" | "education" | "skill" | "project" | "achievement" | "story",
      "description": "2-4 sætninger egnet til ansøgninger",
      "keywords": ["nøgleord"],
      "confidence": 1-5,
      "whenToUse": "hvornår denne viden er relevant",
      "results": ["konkrete resultater hvis nævnt"],
      "metrics": [{"label": "...", "value": "..."}],
      "sourceCvIds": ["cv-id"],
      "employment": {
        "company": "virksomhed",
        "role": "rolle/titel",
        "startDate": "YYYY-MM eller YYYY",
        "endDate": "YYYY-MM eller YYYY",
        "isCurrent": false,
        "location": "by/land",
        "employmentType": "full_time" | "part_time" | "contract" | "freelance" | "internship",
        "responsibilities": ["ansvarsområde"]
      }
    }
  ],
  "skippedDuplicateCount": 0
}

Bemærk:
- "employment"-feltet er KUN påkrævet når type er "employment".
- "confidence" (1–5) er KUN påkrævet når type er "skill". Udelad feltet for alle andre typer.`;

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const VALID_TYPES: KnowledgeEntryType[] = [
  'project',
  'skill',
  'education',
  'achievement',
  'story',
  'employment',
];

const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function employmentKey(company?: string, role?: string): string {
  return `${normalize(company || '')}::${normalize(role || '')}`;
}

function entryIdentityKey(entry: {
  type: string;
  title: string;
  description?: string;
  employment?: { company?: string; role?: string };
}): string {
  if (entry.type === 'employment') {
    return `employment::${employmentKey(entry.employment?.company, entry.employment?.role)}`;
  }
  return `${entry.type}::${normalize(entry.title)}`;
}

function summarizeExisting(entries: Array<{
  title: string;
  type: string;
  description?: string;
  employment?: { company?: string; role?: string; startDate?: string; endDate?: string };
}>): string {
  if (entries.length === 0) return '(tom knowledge base)';

  return entries
    .map((e) => {
      if (e.type === 'employment' && e.employment) {
        const period = [e.employment.startDate, e.employment.endDate].filter(Boolean).join('–');
        return `- [employment] ${e.employment.role} hos ${e.employment.company}${period ? ` (${period})` : ''}`;
      }
      const desc = e.description ? `: ${e.description.slice(0, 120)}` : '';
      return `- [${e.type}] ${e.title}${desc}`;
    })
    .join('\n');
}

export class CvKnowledgeExtractionService {
  async extractFromAllCvs(tenantId: Types.ObjectId | string): Promise<CvKnowledgeExtractionResult> {
    const templates = await CvTemplate.find({ tenantId }).sort({ name: 1 });
    if (templates.length === 0) {
      return { candidates: [], skippedDuplicates: 0, cvsProcessed: 0, cvsSkipped: 0 };
    }

    const cvTexts: Array<{ id: string; name: string; text: string }> = [];
    let cvsSkipped = 0;

    for (const template of templates) {
      const text = await this.resolveCvText(template);
      if (!text || text.length < 40) {
        cvsSkipped += 1;
        continue;
      }
      cvTexts.push({ id: template._id.toString(), name: template.name, text });
    }

    if (cvTexts.length === 0) {
      return { candidates: [], skippedDuplicates: 0, cvsProcessed: 0, cvsSkipped };
    }

    const existing = await KnowledgeEntry.find({ tenantId }).lean();
    const existingKeys = new Set(existing.map((e) => entryIdentityKey(e)));

    const extracted = openai
      ? await this.extractWithAi(cvTexts, existing, tenantId)
      : this.extractFallback(cvTexts, existingKeys);

    const candidates: KnowledgeEntryDraft[] = [];
    let skippedDuplicates = 0;

    for (const draft of extracted) {
      const key = entryIdentityKey(draft);
      if (!key.endsWith('::') && existingKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      // Also skip duplicates within the same extraction batch
      if (candidates.some((c) => entryIdentityKey(c) === key)) {
        skippedDuplicates += 1;
        continue;
      }
      candidates.push(draft);
      existingKeys.add(key);
    }

    return {
      candidates,
      skippedDuplicates,
      cvsProcessed: cvTexts.length,
      cvsSkipped,
    };
  }

  async saveCandidates(
    entries: KnowledgeEntryDraft[],
    tenantId: Types.ObjectId | string
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const entry of entries) {
      const created = await KnowledgeEntry.create({
        tenantId,
        title: entry.title,
        type: entry.type,
        description: entry.description || '',
        keywords: entry.keywords || [],
        confidence: entry.type === 'skill' ? normalizeSkillConfidence(entry.confidence) : undefined,
        whenToUse: entry.whenToUse || '',
        results: entry.results || [],
        metrics: entry.metrics || [],
        cases: [],
        relatedEntryIds: [],
        employment: entry.type === 'employment' ? entry.employment : undefined,
      });
      ids.push(created._id.toString());
    }
    return ids;
  }

  private async resolveCvText(template: InstanceType<typeof CvTemplate>): Promise<string> {
    const existing = template.parsedContent?.rawText?.trim();
    if (existing) return existing;

    if (!template.originalFile?.storageKey || !template.tenantId) return '';

    try {
      const buffer = await storageService.downloadByKey(
        template.originalFile.storageKey,
        template.tenantId
      );
      const text = await extractTextFromBuffer(buffer, template.originalFile.mimeType);
      if (!text) return '';

      template.parsedContent = {
        rawText: text,
        sections: template.parsedContent?.sections || { experience: [], education: [], skills: [] },
      };
      await template.save();
      return text;
    } catch {
      return '';
    }
  }

  private async extractWithAi(
    cvTexts: Array<{ id: string; name: string; text: string }>,
    existing: Array<{
      title: string;
      type: string;
      description?: string;
      employment?: { company?: string; role?: string; startDate?: string; endDate?: string };
    }>,
    tenantId: Types.ObjectId | string
  ): Promise<KnowledgeEntryDraft[]> {
    const cvBlock = cvTexts
      .map(
        (cv, i) =>
          `=== CV ${i + 1}: ${cv.name} (id: ${cv.id}) ===\n${cv.text.slice(0, 12000)}`
      )
      .join('\n\n');

    const promptContext = [
      'KONTEKST:',
      'EKSISTERENDE KNOWLEDGE BASE (må IKKE gentages — spring identisk eller næsten identisk indhold over):',
      summarizeExisting(existing),
      'CV-INDHOLD:',
      cvBlock,
    ].join('\n\n');

    const prompt = composeAiPrompt(CV_KNOWLEDGE_EXTRACTION_INSTRUCTIONS, promptContext);

    const completion = await openai!.chat.completions.create({
      model: config.aiModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as {
      entries?: unknown[];
      skippedDuplicateCount?: number;
    };

    if (!Array.isArray(parsed.entries)) return [];

    const validCvIds = new Set(cvTexts.map((c) => c.id));
    return parsed.entries
      .map((raw) => this.normalizeDraft(raw, validCvIds))
      .filter((d): d is KnowledgeEntryDraft => d !== null);
  }

  private extractFallback(
    cvTexts: Array<{ id: string; name: string; text: string }>,
    existingKeys: Set<string>
  ): KnowledgeEntryDraft[] {
    // Without AI: create one story entry per CV if nothing similar exists
    const drafts: KnowledgeEntryDraft[] = [];
    for (const cv of cvTexts) {
      const title = `Indhold fra ${cv.name}`.slice(0, 80);
      const draft: KnowledgeEntryDraft = {
        title,
        type: 'story',
        description: cv.text.slice(0, 800),
        keywords: [],
        whenToUse: 'Når CV-indhold skal genbruges i ansøgninger',
        results: [],
        metrics: [],
        sourceCvIds: [cv.id],
      };
      if (!existingKeys.has(entryIdentityKey(draft))) {
        drafts.push(draft);
      }
    }
    return drafts;
  }

  private normalizeDraft(raw: unknown, validCvIds: Set<string>): KnowledgeEntryDraft | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;

    const type = VALID_TYPES.includes(item.type as KnowledgeEntryType)
      ? (item.type as KnowledgeEntryType)
      : null;
    if (!type) return null;

    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 80) : '';
    if (!title) return null;

    const sourceCvIds = Array.isArray(item.sourceCvIds)
      ? item.sourceCvIds.filter((id): id is string => typeof id === 'string' && validCvIds.has(id))
      : [];

    const draft: KnowledgeEntryDraft = {
      title,
      type,
      description: typeof item.description === 'string' ? item.description : '',
      keywords: Array.isArray(item.keywords)
        ? item.keywords.filter((k): k is string => typeof k === 'string')
        : [],
      whenToUse: typeof item.whenToUse === 'string' ? item.whenToUse : '',
      results: Array.isArray(item.results)
        ? item.results.filter((r): r is string => typeof r === 'string')
        : [],
      metrics: Array.isArray(item.metrics)
        ? item.metrics
            .filter(
              (m): m is { label: string; value: string } =>
                !!m &&
                typeof m === 'object' &&
                typeof (m as { label?: unknown }).label === 'string' &&
                typeof (m as { value?: unknown }).value === 'string'
            )
            .map((m) => ({ label: m.label, value: m.value }))
        : [],
      sourceCvIds,
    };

    if (type === 'skill') {
      draft.confidence = normalizeSkillConfidence(item.confidence);
    }

    if (type === 'employment') {
      const emp = item.employment as Record<string, unknown> | undefined;
      const company = typeof emp?.company === 'string' ? emp.company.trim() : '';
      const role = typeof emp?.role === 'string' ? emp.role.trim() : '';
      if (!company || !role) return null;

      const employmentType = VALID_EMPLOYMENT_TYPES.includes(emp?.employmentType as EmploymentType)
        ? (emp?.employmentType as EmploymentType)
        : undefined;

      const employment: EmploymentDetails = {
        company,
        role,
        startDate: typeof emp?.startDate === 'string' ? emp.startDate : undefined,
        endDate: typeof emp?.endDate === 'string' ? emp.endDate : undefined,
        isCurrent: Boolean(emp?.isCurrent),
        location: typeof emp?.location === 'string' ? emp.location : undefined,
        employmentType,
        responsibilities: Array.isArray(emp?.responsibilities)
          ? emp.responsibilities.filter((r): r is string => typeof r === 'string')
          : [],
      };
      draft.employment = employment;
      if (!draft.title.includes(company)) {
        draft.title = `${role} hos ${company}`.slice(0, 80);
      }
    }

    return draft;
  }
}

export const cvKnowledgeExtractionService = new CvKnowledgeExtractionService();
