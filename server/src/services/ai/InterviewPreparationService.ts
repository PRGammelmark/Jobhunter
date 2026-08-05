import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { Application, Company } from '../../models';
import { composeAiPrompt, type InterviewContext, type InterviewPrep } from '@career-intelligence/shared';

const INTERVIEW_PREP_INSTRUCTIONS = `Forbered kandidat til jobsamtale.

Returnér JSON:
{
  "companyResearch": "string",
  "questionsToAsk": ["string"],
  "likelyQuestions": ["string"],
  "salaryPrep": { "range": "string", "talkingPoints": ["string"] },
  "elevatorPitch": "string",
  "previousInterviewInsights": ["string"]
}`;

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const ROUND_LABELS: Record<string, string> = {
  first: 'første samtale',
  second: 'anden samtale',
  third: 'tredje samtale',
  final: 'finale samtale',
  other: 'samtale',
};

export class InterviewPreparationService {
  async generate(
    applicationId: string,
    context: InterviewContext,
    tenantId: Types.ObjectId | string
  ): Promise<InterviewPrep> {
    const application = await Application.findOne({ _id: applicationId, tenantId });
    if (!application) throw new Error('Ansøgning ikke fundet');

    let companyMemory = '';
    let companyInfo = '';
    if (application.companyId) {
      const company = await Company.findOne({ _id: application.companyId, tenantId });
      if (company) {
        const infoParts = [
          company.description && `Beskrivelse: ${company.description}`,
          company.industry && `Branche: ${company.industry}`,
          company.website && `Hjemmeside: ${company.website}`,
          company.linkedIn && `LinkedIn: ${company.linkedIn}`,
          company.employeeCount && `Ansatte: ${company.employeeCount}`,
          company.location && `Lokation: ${company.location}`,
        ].filter(Boolean);
        if (infoParts.length) companyInfo = infoParts.join('\n');

        companyMemory = `
Tidligere spørgsmål: ${company.memory.interviewQuestions.join('; ')}
Løn-noter: ${company.memory.salaryNotes.map((s) => s.range).join('; ')}
Kontakter: ${company.memory.contacts.map((c) => c.name).join(', ')}
Noter: ${company.memory.generalNotes.join('; ')}`;
      }
    }

    const roundLabel = ROUND_LABELS[context.round] || 'samtale';
    const typeLabel = context.type;
    const formatLabel = context.format;

    let prep: InterviewPrep;

    if (openai) {
      const promptContext = [
        'KONTEKST:',
        `STILLING: ${application.job.title}`,
        `VIRKSOMHED: ${application.job.companyName}`,
        `SAMTALE: ${roundLabel}, type: ${typeLabel}, format: ${formatLabel}`,
        context.notes ? `NOTER: ${context.notes}` : '',
        `JOB: ${application.job.summary || application.job.rawText?.slice(0, 3000) || ''}`,
        companyInfo ? `VIRKSOMHEDSINFO:\n${companyInfo}` : '',
        companyMemory ? `COMPANY MEMORY:${companyMemory}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const prompt = composeAiPrompt(INTERVIEW_PREP_INSTRUCTIONS, promptContext);

      const completion = await openai.chat.completions.create({
        model: config.aiModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      prep = {
        context,
        companyResearch: parsed.companyResearch || '',
        questionsToAsk: parsed.questionsToAsk || [],
        likelyQuestions: parsed.likelyQuestions || [],
        salaryPrep: parsed.salaryPrep || { talkingPoints: [] },
        elevatorPitch: parsed.elevatorPitch || '',
        previousInterviewInsights: parsed.previousInterviewInsights,
        generatedAt: new Date().toISOString(),
      };
    } else {
      prep = {
        context,
        companyResearch: `Research ${application.job.companyName} — tilføj OPENAI_API_KEY for auto-research.`,
        questionsToAsk: [
          'Hvad er teamets største prioriteter de næste 6 måneder?',
          'Hvordan måler I succes i rollen?',
        ],
        likelyQuestions: [
          `Fortæl om din erfaring relevant for ${application.job.title}`,
          'Hvorfor vil du arbejde hos os?',
        ],
        salaryPrep: { talkingPoints: ['Research markedsløn for rollen'] },
        elevatorPitch: `Jeg er ${application.job.title}-kandidat med erfaring der matcher jeres behov.`,
        generatedAt: new Date().toISOString(),
      };
    }

    application.interviewPrep = prep as never;
    application.interviewAt = new Date();
    await application.save();

    if (application.companyId) {
      await Company.findOneAndUpdate(
        { _id: application.companyId, tenantId },
        {
          $addToSet: { interviewIds: application._id },
          $push: {
            'memory.interviewQuestions': { $each: prep.likelyQuestions.slice(0, 3) },
          },
          lastActivityAt: new Date(),
        }
      );
    }

    return prep;
  }
}

export const interviewPreparationService = new InterviewPreparationService();
