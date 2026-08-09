import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { KnowledgeEntry, CvTemplate, Settings } from '../../models';
import { knowledgeMatcher } from './KnowledgeMatcher';
import {
  composeAiPrompt,
  isAiModelId,
  normalizeSkillConfidence,
  type AiAnalysis,
} from '@career-intelligence/shared';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const JOB_ANALYSIS_INSTRUCTIONS = `Du er karrieresparringspartner. Analysér dette jobopslag mod brugerens Knowledge Base.

Returnér JSON med denne struktur:
{
  "strengths": ["string"],
  "risks": ["string — inkl. lav confidence skills"],
  "interviewRisks": ["string"],
  "aiQuestions": [{ "question": "string", "context": "string" }],
  "suggestedTweaks": ["string"],
  "recommendation": "use_existing" | "minor_tweaks" | "generate_new",
  "matchAssessment": "string — max 50 ord"
}

matchAssessment: Ultra-kort kvalitativ vurdering på dansk (max 40–50 ord, gerne 2–3 sætninger) af, hvor godt stillingen matcher mine ønsker, kompetencer og profil. Skriv i førsteperson ("jeg"/"mig") — aldrig i tredjeperson om "kandidaten", "brugeren" eller lignende. Vær ærlig og konkret: nævn både match og evt. mangler/misforhold. Brug Om mig og Knowledge Base aktivt. Skriv i prosa — ikke bullet points. Ingen uddybning eller gentagelser.

Respektér confidence (1–5, kun på skills): fremhæv IKKE skills med confidence 1–2 uden at spørge brugeren.
Stil spørgsmål i stedet for at gætte.`;

function buildFallbackAnalysis(companyName: string): AiAnalysis {
  return {
    strengths: [],
    risks: ['Tilføj OPENAI_API_KEY for fuld analyse'],
    interviewRisks: [],
    suggestedStories: [],
    aiQuestions: [
      {
        question: `Vil du fremhæve specifik erfaring relevant for ${companyName}?`,
        context: 'AI-analyse kræver OpenAI API-nøgle',
        answered: false,
      },
    ],
    suggestedTweaks: [],
    matchAssessment:
      'Kvalitativ match-vurdering kræver en OpenAI API-nøgle. Tilføj OPENAI_API_KEY for at få en vurdering af, hvor godt stillingen matcher dine ønsker, kompetencer og profil.',
    analyzedAt: new Date().toISOString(),
  };
}

export class JobAnalysisService {
  async analyze(
    applicationId: string,
    jobText: string,
    companyName: string,
    tenantId: Types.ObjectId | string
  ): Promise<AiAnalysis> {
    const entries = await KnowledgeEntry.find({ tenantId });
    const cvs = await CvTemplate.find({ tenantId });
    const settings = await Settings.findOne({ tenantId }).lean() as {
      aboutMe?: string;
      preferences?: { aiModel?: string };
    } | null;
    const aboutMe = settings?.aboutMe?.trim() || '';
    const preferredModel = settings?.preferences?.aiModel?.trim();
    const aiModel = preferredModel && isAiModelId(preferredModel) ? preferredModel : config.aiModel;
    const matches = knowledgeMatcher.match(jobText, entries);

    const suggestedStories = matches.slice(0, 5).map((m) => ({
      knowledgeEntryId: m.entry._id.toString(),
      title: m.entry.title,
      reason: m.reason,
    }));

    if (!openai) {
      const fallback = buildFallbackAnalysis(companyName);
      fallback.suggestedStories = suggestedStories;
      fallback.strengths = matches
        .filter((m) => m.entry.type === 'skill' && normalizeSkillConfidence(m.entry.confidence) >= 4)
        .slice(0, 5)
        .map((m) => `${m.entry.title} (conf. ${normalizeSkillConfidence(m.entry.confidence)}/5)`);
      fallback.risks = entries
        .filter(
          (e) =>
            e.type === 'skill' &&
            normalizeSkillConfidence(e.confidence) <= 2 &&
            jobText.toLowerCase().includes(e.title.toLowerCase())
        )
        .map(
          (e) =>
            `${e.title} (conf. ${normalizeSkillConfidence(e.confidence)}/5${e.confidenceLabel ? ` — ${e.confidenceLabel}` : ''})`
        );
      return fallback;
    }

    const kbContext = entries
      .map((e) => {
        const confidenceNote =
          e.type === 'skill' ? `, confidence: ${normalizeSkillConfidence(e.confidence)}/5` : '';
        let line = `- ${e.title} (${e.type}${confidenceNote}): ${e.description}`;
        if (e.type === 'employment' && e.employment) {
          const period = e.employment.isCurrent
            ? `${e.employment.startDate || '?'} – nu`
            : [e.employment.startDate, e.employment.endDate].filter(Boolean).join(' – ');
          line += `. ${e.employment.role} hos ${e.employment.company}`;
          if (period) line += ` (${period})`;
          if (e.employment.responsibilities?.length) {
            line += `. Ansvar: ${e.employment.responsibilities.join('; ')}`;
          }
        }
        if (e.keywords.length) line += `. Keywords: ${e.keywords.join(', ')}`;
        return line;
      })
      .join('\n');

    const cvContext = cvs.map((c) => `- ${c.name}: ${c.tags.join(', ')}`).join('\n');

    const context = [
      'KONTEKST:',
      `VIRKSOMHED: ${companyName}`,
      'JOBTEKST (kun det primære opslag — ignorér eventuelle øvrige listings/navigation hvis de sniger sig ind):',
      jobText.slice(0, 6000),
      'OM MIG (fri tekst om mig — brug som kontekst for personlighed, motivation og styrker):',
      aboutMe || '(ikke udfyldt)',
      'KNOWLEDGE BASE:',
      kbContext,
      'CV-TEMPLATES:',
      cvContext || "Ingen CV'er endnu",
    ].join('\n\n');

    const prompt = composeAiPrompt(JOB_ANALYSIS_INSTRUCTIONS, context);

    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Tom AI-respons');

    const parsed = JSON.parse(content) as Partial<AiAnalysis>;

    return {
      strengths: parsed.strengths || [],
      risks: parsed.risks || [],
      interviewRisks: parsed.interviewRisks || [],
      suggestedStories: suggestedStories.length ? suggestedStories : [],
      aiQuestions: (parsed.aiQuestions || []).map((q) => ({ ...q, answered: false })),
      suggestedTweaks: parsed.suggestedTweaks || [],
      recommendation: parsed.recommendation,
      matchAssessment: typeof parsed.matchAssessment === 'string' ? parsed.matchAssessment.trim() : undefined,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const jobAnalysisService = new JobAnalysisService();
