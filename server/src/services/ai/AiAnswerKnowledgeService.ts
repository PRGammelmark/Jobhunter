import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { KnowledgeEntry } from '../../models';
import {
  composeAiPrompt,
  normalizeSkillConfidence,
  type KnowledgeEntryType,
} from '@career-intelligence/shared';

const AI_ANSWER_KNOWLEDGE_INSTRUCTIONS = `Du strukturerer et svar fra en jobansøgnings-sparringspartner til Knowledge Base.

Opret en Knowledge Base-entry baseret på svaret. Brug KUN information fra brugerens svar — opfind ikke nye fakta.

Returnér JSON:
{
  "title": "kort, beskrivende titel (max 80 tegn)",
  "type": "project" | "skill" | "education" | "achievement" | "story" | "employment",
  "description": "opsummering af svaret i 2-4 sætninger, egnet til brug i ansøgninger",
  "keywords": ["relevante", "nøgleord"],
  "confidence": 1-5 (KUN hvis type er "skill" — ellers udelad feltet),
  "whenToUse": "hvornår denne viden er relevant at fremhæve",
  "results": ["konkrete resultater eller pointer fra svaret, hvis nogen"]
}`;

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const VALID_TYPES: KnowledgeEntryType[] = ['project', 'skill', 'education', 'achievement', 'story', 'employment'];

export interface AnswerInput {
  question: string;
  answer: string;
  context?: string;
  companyName?: string;
  jobTitle?: string;
}

export class AiAnswerKnowledgeService {
  async createFromAnswer(input: AnswerInput, tenantId: Types.ObjectId | string): Promise<string> {
    const entryData = openai ? await this.structureWithAi(input) : this.buildFallbackEntry(input);
    const entry = await KnowledgeEntry.create({ ...entryData, tenantId });
    return entry._id.toString();
  }

  private buildFallbackEntry(input: AnswerInput) {
    const title =
      input.question.length > 60 ? `${input.question.slice(0, 57)}...` : input.question;

    return {
      title,
      type: 'story' as KnowledgeEntryType,
      description: input.answer,
      keywords: [],
      whenToUse:
        input.context ||
        `Afklaring fra jobanalyse: ${input.jobTitle || 'stilling'} hos ${input.companyName || 'virksomhed'}`,
      results: [],
      metrics: [],
      cases: [],
      relatedEntryIds: [],
    };
  }

  private async structureWithAi(input: AnswerInput) {
    const promptContext = [
      'KONTEKST:',
      `STILLING: ${input.jobTitle || 'Ukendt'}`,
      `VIRKSOMHED: ${input.companyName || 'Ukendt'}`,
      `AI-SPØRGSMÅL: ${input.question}`,
      `KONTEKST (hvorfor AI spurgte): ${input.context || 'Ingen'}`,
      `BRUGERENS SVAR: ${input.answer}`,
    ].join('\n');

    const prompt = composeAiPrompt(AI_ANSWER_KNOWLEDGE_INSTRUCTIONS, promptContext);

    const completion = await openai!.chat.completions.create({
      model: config.aiModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return this.buildFallbackEntry(input);

    const parsed = JSON.parse(content) as {
      title?: string;
      type?: string;
      description?: string;
      keywords?: string[];
      confidence?: number;
      whenToUse?: string;
      results?: string[];
    };

    const type = VALID_TYPES.includes(parsed.type as KnowledgeEntryType)
      ? (parsed.type as KnowledgeEntryType)
      : 'story';

    return {
      title: parsed.title?.slice(0, 80) || input.question.slice(0, 80),
      type,
      description: parsed.description || input.answer,
      keywords: parsed.keywords || [],
      ...(type === 'skill' ? { confidence: normalizeSkillConfidence(parsed.confidence) } : {}),
      whenToUse: parsed.whenToUse || input.context || '',
      results: parsed.results || [],
      metrics: [],
      cases: [],
      relatedEntryIds: [],
    };
  }
}

export const aiAnswerKnowledgeService = new AiAnswerKnowledgeService();
