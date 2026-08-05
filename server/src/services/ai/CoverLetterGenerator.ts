import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { KnowledgeEntry, Application, DocumentSet, Settings, Company, CvTemplate, ApplicationTemplate } from '../../models';
import { cvSelector } from './CvSelector';
import { renderCoverLetterPrompt } from './promptResolver';
import {
  composeAiPrompt,
  isAiModelId,
  isAppLanguage,
  normalizeSkillConfidence,
  type AppLanguage,
} from '@career-intelligence/shared';

const COVER_LETTER_REVISE_INSTRUCTIONS_DA = `Opdater den følgende ansøgning på dansk ud fra brugerens ønskede ændringer.

VIGTIGT:
- Returnér KUN den opdaterede ansøgningstekst — ingen JSON, ingen forklaringer.
- Anvend brugerens ønskede ændringer. Behold resten af ansøgningen, medmindre ændringerne kræver omskrivning.
- Opfind ALDRIG nye historier, tal, resultater eller erfaringer. Brug kun det, der allerede står i ansøgningen, eller det der fremgår af kontekst nedenfor.
- Start med præcis den overskrift der er angivet under KONTEKST (én linje, uden markdown).
- Ingen meta-information i toppen: ingen dato, adresse, telefon, e-mail, LinkedIn eller afsenderblok.
- Maksimalt 350–400 ord. Hold sproget naturligt, selvsikkert og professionelt.`;

const COVER_LETTER_REVISE_INSTRUCTIONS_EN = `Update the following cover letter in English based on the user's requested changes.

IMPORTANT:
- Return ONLY the updated cover letter text — no JSON, no explanations.
- Apply the user's requested changes. Keep the rest of the letter unless the changes require rewriting.
- NEVER invent new stories, numbers, results or experience. Use only what is already in the letter, or what appears in the context below.
- Start with exactly the heading given under CONTEXT (one line, no markdown).
- No meta information at the top: no date, address, phone, email, LinkedIn or sender block.
- Maximum 350–400 words. Keep the language natural, confident and professional.`;

function coverLetterHeading(language: AppLanguage, title: string, company: string): string {
  return language === 'en'
    ? `Application: ${title} at ${company}`
    : `Ansøgning: ${title} hos ${company}`;
}

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export interface GenerateOptions {
  tenantId: Types.ObjectId | string;
  cvTemplateId?: string;
  applicationTemplateId?: string;
}

export interface ReviseOptions {
  tenantId: Types.ObjectId | string;
  instruction: string;
  documentSetId?: string;
}

/** Strip AI meta/title fluff and enforce the standard heading. */
function normalizeCoverLetter(raw: string, heading: string): string {
  let body = raw.replace(/\r\n/g, '\n').trim();

  // Drop leading markdown/plain title lines about the application
  body = body.replace(/^(?:#{1,6}\s*|\*\*)?(?:Ansøgning|Application)\b[^\n]*(?:\*\*)?\n+/i, '');

  // Drop common meta blocks before the letter body (date, address, contact lines)
  const metaLine =
    /^(?:dato|date|navn|name|adresse|address|telefon|phone|e-?mail|linkedin|mobil|tlf\.?)[:\s].*$/i;
  const contactOnly = /^(?:[\w.+-]+@[\w.-]+\.\w+|https?:\/\/\S+|\+?\d[\d\s()-]{6,})$/i;
  const lines = body.split('\n');
  let start = 0;
  while (start < lines.length) {
    const line = lines[start].trim();
    if (!line) {
      start += 1;
      continue;
    }
    if (metaLine.test(line) || contactOnly.test(line)) {
      start += 1;
      continue;
    }
    break;
  }
  body = lines.slice(start).join('\n').trim();

  // Avoid duplicating the heading if the model already used it
  if (body.toLowerCase().startsWith(heading.toLowerCase())) {
    body = body.slice(heading.length).replace(/^\n+/, '').trim();
  }

  return `${heading}\n\n${body}`;
}

export class CoverLetterGenerator {
  async generate(applicationId: string, options: GenerateOptions): Promise<{ documentSetId: string }> {
    const { tenantId } = options;
    const application = await Application.findOne({ _id: applicationId, tenantId });
    if (!application) throw new Error('Ansøgning ikke fundet');

    const settings = await Settings.findOne({ tenantId }).lean() as {
      profile?: { name?: string };
      aboutMe?: string;
      preferences?: { aiModel?: string; defaultLanguage?: string };
      coverLetterPrompt?: string;
      aiPrompts?: { coverLetterGenerate?: string };
    } | null;
    const aboutMe = settings?.aboutMe?.trim() || '';
    const language: AppLanguage = isAppLanguage(settings?.preferences?.defaultLanguage)
      ? settings!.preferences!.defaultLanguage
      : 'da';
    const preferredModel = settings?.preferences?.aiModel?.trim();
    const aiModel = preferredModel && isAiModelId(preferredModel) ? preferredModel : config.aiModel;
    const entries = await KnowledgeEntry.find({ tenantId });
    const storyIds = (application.aiAnalysis as { suggestedStories?: Array<{ knowledgeEntryId: string }> })?.suggestedStories?.map((s) => s.knowledgeEntryId) || [];
    const usedEntries = storyIds.length
      ? await KnowledgeEntry.find({ tenantId, _id: { $in: storyIds } })
      : entries.slice(0, 3);

    const kbBlock = usedEntries
      .map((e) => {
        const confidenceNote =
          e.type === 'skill' ? ` (confidence: ${normalizeSkillConfidence(e.confidence)}/5)` : '';
        let block = `## ${e.title}${confidenceNote}\n${e.description}`;
        if (e.type === 'employment' && e.employment) {
          const period = e.employment.isCurrent
            ? `${e.employment.startDate || '?'} – nu`
            : [e.employment.startDate, e.employment.endDate].filter(Boolean).join(' – ');
          block += `\nStilling: ${e.employment.role} hos ${e.employment.company}`;
          if (period) block += ` (${period})`;
          if (e.employment.responsibilities?.length) {
            block += `\nAnsvar: ${e.employment.responsibilities.join('; ')}`;
          }
        }
        if (e.results.length) block += `\nResultater: ${e.results.join('; ')}`;
        if (e.metrics.length) {
          block += `\nMetrics: ${e.metrics.map((m) => `${m.label}: ${m.value}`).join(', ')}`;
        }
        return block;
      })
      .join('\n\n');

    let cvTemplateId = options.cvTemplateId;
    if (cvTemplateId) {
      const cvTemplate = await CvTemplate.findOne({ _id: cvTemplateId, tenantId });
      if (!cvTemplate) throw new Error('CV-skabelon ikke fundet');
    } else {
      const cvSelection = await cvSelector.select(tenantId, application.job.keyRequirements, application.aiAnalysis as never);
      cvTemplateId = cvSelection.templateId;
    }

    let applicationTemplateId = options.applicationTemplateId;
    if (!applicationTemplateId) {
      const defaultAppTemplate = await ApplicationTemplate.findOne({ tenantId, isDefault: true });
      if (defaultAppTemplate) applicationTemplateId = defaultAppTemplate._id.toString();
    }

    let cvTemplateText = '';
    let cvTemplateName = '';
    if (cvTemplateId) {
      const cvTemplate = await CvTemplate.findOne({ _id: cvTemplateId, tenantId });
      if (cvTemplate) {
        cvTemplateName = cvTemplate.name;
        if (cvTemplate.parsedContent?.rawText) {
          cvTemplateText = cvTemplate.parsedContent.rawText;
        }
      }
      await CvTemplate.findOneAndUpdate({ _id: cvTemplateId, tenantId }, { $inc: { 'stats.timesUsed': 1 } });
    }

    let applicationTemplateText = '';
    if (applicationTemplateId) {
      const appTemplate = await ApplicationTemplate.findOne({ _id: applicationTemplateId, tenantId });
      if (appTemplate?.parsedContent?.rawText) {
        applicationTemplateText = appTemplate.parsedContent.rawText;
      }
      await ApplicationTemplate.findOneAndUpdate(
        { _id: applicationTemplateId, tenantId },
        { $inc: { 'stats.timesUsed': 1 } }
      );
    }

    let companyInfo = '';
    if (application.companyId) {
      const company = await Company.findOne({ _id: application.companyId, tenantId });
      if (company) {
        const parts = [
          company.description && `Beskrivelse: ${company.description}`,
          company.industry && `Branche: ${company.industry}`,
          company.website && `Hjemmeside: ${company.website}`,
        ].filter(Boolean);
        if (parts.length) companyInfo = parts.join('\n');
      }
    }

    const heading = coverLetterHeading(language, application.job.title, application.job.companyName);
    let coverContent = '';

    if (openai) {
      const candidateLabel = language === 'en' ? 'Candidate' : 'Kandidat';
      const aboutEmpty = language === 'en' ? '(not filled in)' : '(ikke udfyldt)';
      const context = [
        language === 'en' ? 'CONTEXT:' : 'KONTEKST:',
        language === 'en' ? `LANGUAGE: English` : `SPROG: Dansk`,
        language === 'en' ? `HEADING: ${heading}` : `OVERSKRIFT: ${heading}`,
        `PROFIL: ${settings?.profile?.name || candidateLabel}`,
        language === 'en' ? `ROLE: ${application.job.title}` : `STILLING: ${application.job.title}`,
        language === 'en'
          ? `COMPANY: ${application.job.companyName}`
          : `VIRKSOMHED: ${application.job.companyName}`,
        companyInfo
          ? language === 'en'
            ? `COMPANY INFO:\n${companyInfo}`
            : `VIRKSOMHEDSINFO:\n${companyInfo}`
          : '',
        language === 'en'
          ? `JOB SUMMARY: ${application.job.summary || application.job.rawText?.slice(0, 2000) || ''}`
          : `JOB-OPSUMMERING: ${application.job.summary || application.job.rawText?.slice(0, 2000) || ''}`,
        application.job.keyRequirements?.length
          ? `${language === 'en' ? 'KEY REQUIREMENTS' : 'NØGLEKRAV'}:\n${application.job.keyRequirements.map((r) => `- ${r}`).join('\n')}`
          : '',
        application.job.keyResponsibilities?.length
          ? `${language === 'en' ? 'RESPONSIBILITIES' : 'ANSVAR'}:\n${application.job.keyResponsibilities.map((r) => `- ${r}`).join('\n')}`
          : '',
        language === 'en'
          ? 'ABOUT ME (free text — use for tone, motivation and personal angle):'
          : 'OM MIG (fri tekst — brug til tone, motivation og personlig vinkel):',
        aboutMe || aboutEmpty,
        'KNOWLEDGE BASE:',
        kbBlock,
        cvTemplateText || cvTemplateName
          ? language === 'en'
            ? `CV ATTACHED (context only — do not include in the response):\nName: ${cvTemplateName || 'CV'}\n${cvTemplateText}`
            : `CV DER SENDES MED (kun kontekst — medtag ikke i svaret):\nNavn: ${cvTemplateName || 'CV'}\n${cvTemplateText}`
          : '',
        applicationTemplateText
          ? language === 'en'
            ? `APPLICATION TEMPLATE (use as tone, structure and style reference — adapt the content to the role and company):\n${applicationTemplateText}`
            : `ANSØGNINGSSKABELON (brug som tone, struktur og stil-reference — tilpas indholdet til stillingen og virksomheden):\n${applicationTemplateText}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const prompt = renderCoverLetterPrompt(
        settings?.coverLetterPrompt || settings?.aiPrompts?.coverLetterGenerate,
        context,
        language
      );

      const completion = await openai.chat.completions.create({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
      });

      coverContent = (completion.choices[0]?.message?.content || '').trim();
    } else if (language === 'en') {
      coverContent = `Dear ${application.job.companyName},\n\nI am applying for the position as ${application.job.title}...\n\n`;
      coverContent += `Relevant experience:\n${usedEntries.map((e) => `- ${e.title}: ${e.description.slice(0, 150)}`).join('\n')}\n\n`;
      coverContent += `Kind regards,\n${settings?.profile?.name || ''}\n\n`;
      coverContent += `_Add OPENAI_API_KEY for full generation._`;
    } else {
      coverContent = `Kære ${application.job.companyName},\n\nJeg søger stillingen som ${application.job.title}...\n\n`;
      coverContent += `Relevant erfaring:\n${usedEntries.map((e) => `- ${e.title}: ${e.description.slice(0, 150)}`).join('\n')}\n\n`;
      coverContent += `Med venlig hilsen,\n${settings?.profile?.name || ''}\n\n`;
      coverContent += `_Tilføj OPENAI_API_KEY for fuld generering._`;
    }

    coverContent = normalizeCoverLetter(coverContent, heading);

    const lastVersion = await DocumentSet.findOne({ tenantId, applicationId }).sort({ version: -1 });
    const version = (lastVersion?.version || 0) + 1;

    const docSet = await DocumentSet.create({
      tenantId,
      applicationId,
      version,
      label: `Version ${version}`,
      source: openai ? 'ai_generated' : 'manual_edit',
      cv: {
        content: '',
        basedOnTemplateId: cvTemplateId,
        knowledgeEntriesUsed: usedEntries.map((e) => e._id),
      },
      coverLetter: {
        content: coverContent,
        basedOnTemplateId: applicationTemplateId,
      },
    });

    application.activeDocumentSetId = docSet._id;
    application.status = application.status === 'not_started' ? 'in_progress' : application.status;
    await application.save();

    return { documentSetId: docSet._id.toString() };
  }

  /**
   * Opdater en eksisterende ansøgning ud fra brugerens ønskede ændringer.
   * Opretter en ny DocumentSet-version baseret på den valgte (eller aktive) version.
   */
  async revise(applicationId: string, options: ReviseOptions): Promise<{ documentSetId: string }> {
    const { tenantId } = options;
    const instruction = options.instruction?.trim();
    if (!instruction) throw new Error('Angiv ønskede opdateringer');

    const application = await Application.findOne({ _id: applicationId, tenantId });
    if (!application) throw new Error('Ansøgning ikke fundet');

    const sourceDoc = options.documentSetId
      ? await DocumentSet.findOne({ _id: options.documentSetId, tenantId, applicationId })
      : application.activeDocumentSetId
        ? await DocumentSet.findOne({ _id: application.activeDocumentSetId, tenantId })
        : await DocumentSet.findOne({ tenantId, applicationId }).sort({ version: -1 });

    if (!sourceDoc?.coverLetter?.content?.trim()) {
      throw new Error('Ingen ansøgning at opdatere');
    }

    const settings = await Settings.findOne({ tenantId }).lean() as {
      profile?: { name?: string };
      aboutMe?: string;
      preferences?: { aiModel?: string; defaultLanguage?: string };
    } | null;
    const language: AppLanguage = isAppLanguage(settings?.preferences?.defaultLanguage)
      ? settings!.preferences!.defaultLanguage
      : 'da';
    const preferredModel = settings?.preferences?.aiModel?.trim();
    const aiModel = preferredModel && isAiModelId(preferredModel) ? preferredModel : config.aiModel;
    const aboutMe = settings?.aboutMe?.trim() || '';
    const heading = coverLetterHeading(language, application.job.title, application.job.companyName);

    let coverContent = '';

    if (openai) {
      const context = [
        language === 'en' ? 'CONTEXT:' : 'KONTEKST:',
        language === 'en' ? `LANGUAGE: English` : `SPROG: Dansk`,
        language === 'en' ? `HEADING: ${heading}` : `OVERSKRIFT: ${heading}`,
        language === 'en' ? `ROLE: ${application.job.title}` : `STILLING: ${application.job.title}`,
        language === 'en'
          ? `COMPANY: ${application.job.companyName}`
          : `VIRKSOMHED: ${application.job.companyName}`,
        language === 'en'
          ? `JOB SUMMARY: ${application.job.summary || application.job.rawText?.slice(0, 1500) || ''}`
          : `JOB-OPSUMMERING: ${application.job.summary || application.job.rawText?.slice(0, 1500) || ''}`,
        aboutMe ? (language === 'en' ? `ABOUT ME:\n${aboutMe}` : `OM MIG:\n${aboutMe}`) : '',
        language === 'en' ? 'CURRENT COVER LETTER:' : 'NUVÆRENDE ANSØGNING:',
        sourceDoc.coverLetter.content,
        language === 'en' ? 'REQUESTED CHANGES FROM THE USER:' : 'ØNSKEDE ÆNDRINGER FRA BRUGEREN:',
        instruction,
      ]
        .filter(Boolean)
        .join('\n\n');

      const reviseInstructions =
        language === 'en' ? COVER_LETTER_REVISE_INSTRUCTIONS_EN : COVER_LETTER_REVISE_INSTRUCTIONS_DA;
      const prompt = composeAiPrompt(reviseInstructions, context);

      const completion = await openai.chat.completions.create({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
      });

      coverContent = (completion.choices[0]?.message?.content || '').trim();
      if (!coverContent) throw new Error('AI returnerede tom ansøgning');
    } else {
      coverContent = `${sourceDoc.coverLetter.content}\n\n_Ønskede ændringer (tilføj OPENAI_API_KEY for AI-opdatering): ${instruction}_`;
    }

    coverContent = normalizeCoverLetter(coverContent, heading);

    const lastVersion = await DocumentSet.findOne({ tenantId, applicationId }).sort({ version: -1 });
    const version = (lastVersion?.version || 0) + 1;

    const docSet = await DocumentSet.create({
      tenantId,
      applicationId,
      version,
      label: `Version ${version}`,
      source: openai ? 'ai_generated' : 'manual_edit',
      aiPromptSnapshot: instruction,
      cv: {
        content: sourceDoc.cv?.content || '',
        basedOnTemplateId: sourceDoc.cv?.basedOnTemplateId,
        knowledgeEntriesUsed: sourceDoc.cv?.knowledgeEntriesUsed || [],
      },
      coverLetter: {
        content: coverContent,
        basedOnTemplateId: sourceDoc.coverLetter?.basedOnTemplateId,
      },
    });

    application.activeDocumentSetId = docSet._id;
    await application.save();

    return { documentSetId: docSet._id.toString() };
  }
}

export const coverLetterGenerator = new CoverLetterGenerator();
