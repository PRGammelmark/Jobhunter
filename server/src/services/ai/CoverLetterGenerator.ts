import OpenAI from 'openai';
import { config } from '../../config';
import { KnowledgeEntry, Application, DocumentSet, Settings, Company, CvTemplate, ApplicationTemplate } from '../../models';
import { cvSelector } from './CvSelector';
import { isAiModelId, normalizeSkillConfidence } from '@career-intelligence/shared';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export interface GenerateOptions {
  cvTemplateId?: string;
  applicationTemplateId?: string;
}

export interface ReviseOptions {
  instruction: string;
  documentSetId?: string;
}

/** Strip AI meta/title fluff and enforce the standard heading. */
function normalizeCoverLetter(raw: string, heading: string): string {
  let body = raw.replace(/\r\n/g, '\n').trim();

  // Drop leading markdown/plain title lines about the application
  body = body.replace(/^(?:#{1,6}\s*|\*\*)?Ansøgning\b[^\n]*(?:\*\*)?\n+/i, '');

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
  async generate(applicationId: string, options: GenerateOptions = {}): Promise<{ documentSetId: string }> {
    const application = await Application.findById(applicationId);
    if (!application) throw new Error('Ansøgning ikke fundet');

    const settings = await Settings.findById('app') as {
      profile?: { name?: string };
      aboutMe?: string;
      preferences?: { aiModel?: string };
    } | null;
    const aboutMe = settings?.aboutMe?.trim() || '';
    const preferredModel = settings?.preferences?.aiModel?.trim();
    const aiModel = preferredModel && isAiModelId(preferredModel) ? preferredModel : config.aiModel;
    const entries = await KnowledgeEntry.find();
    const storyIds = (application.aiAnalysis as { suggestedStories?: Array<{ knowledgeEntryId: string }> })?.suggestedStories?.map((s) => s.knowledgeEntryId) || [];
    const usedEntries = storyIds.length
      ? await KnowledgeEntry.find({ _id: { $in: storyIds } })
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
      const cvTemplate = await CvTemplate.findById(cvTemplateId);
      if (!cvTemplate) throw new Error('CV-skabelon ikke fundet');
    } else {
      const cvSelection = await cvSelector.select(application.job.keyRequirements, application.aiAnalysis as never);
      cvTemplateId = cvSelection.templateId;
    }

    let applicationTemplateId = options.applicationTemplateId;
    if (!applicationTemplateId) {
      const defaultAppTemplate = await ApplicationTemplate.findOne({ isDefault: true });
      if (defaultAppTemplate) applicationTemplateId = defaultAppTemplate._id.toString();
    }

    let cvTemplateText = '';
    let cvTemplateName = '';
    if (cvTemplateId) {
      const cvTemplate = await CvTemplate.findById(cvTemplateId);
      if (cvTemplate) {
        cvTemplateName = cvTemplate.name;
        if (cvTemplate.parsedContent?.rawText) {
          cvTemplateText = cvTemplate.parsedContent.rawText;
        }
      }
      await CvTemplate.findByIdAndUpdate(cvTemplateId, { $inc: { 'stats.timesUsed': 1 } });
    }

    let applicationTemplateText = '';
    if (applicationTemplateId) {
      const appTemplate = await ApplicationTemplate.findById(applicationTemplateId);
      if (appTemplate?.parsedContent?.rawText) {
        applicationTemplateText = appTemplate.parsedContent.rawText;
      }
      await ApplicationTemplate.findByIdAndUpdate(applicationTemplateId, { $inc: { 'stats.timesUsed': 1 } });
    }

    let companyInfo = '';
    if (application.companyId) {
      const company = await Company.findById(application.companyId);
      if (company) {
        const parts = [
          company.description && `Beskrivelse: ${company.description}`,
          company.industry && `Branche: ${company.industry}`,
          company.website && `Hjemmeside: ${company.website}`,
        ].filter(Boolean);
        if (parts.length) companyInfo = parts.join('\n');
      }
    }

    const heading = `Ansøgning: ${application.job.title} hos ${application.job.companyName}`;
    let coverContent = '';

    if (openai) {
      const prompt = `Skriv en målrettet ansøgning på dansk.

VIGTIGT: Brug KUN information fra Knowledge Base, Om mig, jobopslag og virksomhedsinfo. Opfind ALDRIG historier, tal eller resultater.
Returnér KUN selve ansøgningsteksten — ingen JSON, ingen forklaringer, ingen CV.
CV'et nedenfor er KUN kontekst: brug det til at vinkle ansøgningen skarpere og til at vide hvilket CV der sendes med. Kopiér ikke CV-indhold ind i ansøgningen. Genfortæl ikke CV'et — antag, at modtageren allerede har læst det.

FORMAT:
- Start med præcis denne overskrift (én linje, uden markdown): ${heading}
- Ingen meta-information i toppen: ingen dato, adresse, telefon, e-mail, LinkedIn, afsenderblok eller lignende.
- Gå direkte fra overskriften til selve brevet (fx "Kære ...").
- Maksimalt 350–400 ord. Undgå lange lister og opremsninger.

VINKEL OG INDHOLD:
- Skriv med udgangspunkt i virksomheden og dens udfordringer – ikke kandidaten.
- Besvar implicit to spørgsmål: Hvorfor denne virksomhed? og Hvorfor er jeg den rette til netop denne stilling?
- Træk aktivt på kandidatens konkrete erfaringer, projekter og resultater, og vis hvordan de kan anvendes hos virksomheden.
- Skriv kandidaten "ind i virksomheden": beskriv, hvordan vedkommende forventes at skabe værdi i netop denne rolle.
- Vis, hvordan kandidaten kan bidrage – ikke blot hvad kandidaten har lavet tidligere.
- Prioritér konkrete eksempler frem for generelle påstande. Vis hellere end fortæl.
- Brug virksomhedens produkter, branche, kunder, teknologi og strategi aktivt i argumentationen, når det er relevant.
- Lav tydelige koblinger mellem virksomhedens behov og kandidatens erfaring.
- Vis forståelse for virksomhedens udfordringer og mål, hvis de kan udledes af stillingsopslaget eller virksomhedsprofilen.
- Inddrag kun erfaringer, der er relevante for den konkrete stilling.
- Fremhæv resultater, effekter og ansvar frem for blot teknologier og værktøjer.
- Nævn kun teknologier, når de understøtter en konkret pointe eller et konkret resultat.
- Hvis kandidaten mangler erfaring inden for et område, så fokuser på tilsvarende erfaring frem for at undskylde manglen.
- Undgå generiske formuleringer, der kunne sendes til enhver virksomhed. Hold indholdet specifikt for både virksomheden og kandidatens erfaring.
- Skriv altid, så ansøgningen føles skrevet specifikt til denne ene stilling.

SPROG OG TONE:
- Undgå standardformuleringer som "Jeg søger hermed...", "Jeg brænder for..." og "Jeg er passioneret omkring...".
- Gør introduktionen fængende og nysgerrighedsskabende. Den første sætning skal give lyst til at læse videre.
- Hold sproget naturligt, selvsikkert og professionelt – aldrig overdrevet eller pralende.
- Undgå at skrive i et autoritativt eller bedrevidende toneleje. Antag aldrig, at virksomheden skal lære noget. Beskriv i stedet, hvordan ansøgerens erfaringer, observationer og arbejdsmetode passer til virksomheden.
- Undgå buzzwords og floskler, medmindre de er centrale for stillingsopslaget.
- Skriv i et aktivt sprog med korte, præcise sætninger.
- Variér sætningslængde og ordvalg for at skabe et naturligt flow.
- Tilpas tonen til virksomheden (startup, enterprise, offentlig sektor, bureau osv.).
- Hvert afsnit skal have et tydeligt formål. Fjern alt, der ikke skaber værdi.
- Skab en rød tråd fra introduktion til afslutning.
- Afslut med en fremadskuende invitation til dialog frem for en passiv standardafslutning.

PROFIL: ${settings?.profile?.name || 'Kandidat'}
STILLING: ${application.job.title}
VIRKSOMHED: ${application.job.companyName}
${companyInfo ? `VIRKSOMHEDSINFO:\n${companyInfo}\n` : ''}
JOB-OPSUMMERING: ${application.job.summary || application.job.rawText?.slice(0, 2000)}
${application.job.keyRequirements?.length ? `NØGLEKRAV:\n${application.job.keyRequirements.map((r) => `- ${r}`).join('\n')}` : ''}
${application.job.keyResponsibilities?.length ? `ANSVAR:\n${application.job.keyResponsibilities.map((r) => `- ${r}`).join('\n')}` : ''}

OM MIG (fri tekst — brug til tone, motivation og personlig vinkel):
${aboutMe || '(ikke udfyldt)'}

KNOWLEDGE BASE:
${kbBlock}
${cvTemplateText || cvTemplateName ? `\nCV DER SENDES MED (kun kontekst — medtag ikke i svaret):\nNavn: ${cvTemplateName || 'CV'}\n${cvTemplateText}\n` : ''}
${applicationTemplateText ? `\nANSØGNINGSSKABELON (brug som tone, struktur og stil-reference — tilpas indholdet til stillingen og virksomheden):\n${applicationTemplateText}\n` : ''}`;

      const completion = await openai.chat.completions.create({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
      });

      coverContent = (completion.choices[0]?.message?.content || '').trim();
    } else {
      coverContent = `Kære ${application.job.companyName},\n\nJeg søger stillingen som ${application.job.title}...\n\n`;
      coverContent += `Relevant erfaring:\n${usedEntries.map((e) => `- ${e.title}: ${e.description.slice(0, 150)}`).join('\n')}\n\n`;
      coverContent += `Med venlig hilsen,\n${settings?.profile?.name || ''}\n\n`;
      coverContent += `_Tilføj OPENAI_API_KEY for fuld generering._`;
    }

    coverContent = normalizeCoverLetter(coverContent, heading);

    const lastVersion = await DocumentSet.findOne({ applicationId }).sort({ version: -1 });
    const version = (lastVersion?.version || 0) + 1;

    const docSet = await DocumentSet.create({
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
    const instruction = options.instruction?.trim();
    if (!instruction) throw new Error('Angiv ønskede opdateringer');

    const application = await Application.findById(applicationId);
    if (!application) throw new Error('Ansøgning ikke fundet');

    const sourceDoc = options.documentSetId
      ? await DocumentSet.findOne({ _id: options.documentSetId, applicationId })
      : application.activeDocumentSetId
        ? await DocumentSet.findById(application.activeDocumentSetId)
        : await DocumentSet.findOne({ applicationId }).sort({ version: -1 });

    if (!sourceDoc?.coverLetter?.content?.trim()) {
      throw new Error('Ingen ansøgning at opdatere');
    }

    const settings = await Settings.findById('app') as {
      profile?: { name?: string };
      aboutMe?: string;
      preferences?: { aiModel?: string };
    } | null;
    const preferredModel = settings?.preferences?.aiModel?.trim();
    const aiModel = preferredModel && isAiModelId(preferredModel) ? preferredModel : config.aiModel;
    const aboutMe = settings?.aboutMe?.trim() || '';
    const heading = `Ansøgning: ${application.job.title} hos ${application.job.companyName}`;

    let coverContent = '';

    if (openai) {
      const prompt = `Opdater den følgende ansøgning på dansk ud fra brugerens ønskede ændringer.

VIGTIGT:
- Returnér KUN den opdaterede ansøgningstekst — ingen JSON, ingen forklaringer.
- Anvend brugerens ønskede ændringer. Behold resten af ansøgningen, medmindre ændringerne kræver omskrivning.
- Opfind ALDRIG nye historier, tal, resultater eller erfaringer. Brug kun det, der allerede står i ansøgningen, eller det der fremgår af kontekst nedenfor.
- Start med præcis denne overskrift (én linje, uden markdown): ${heading}
- Ingen meta-information i toppen: ingen dato, adresse, telefon, e-mail, LinkedIn eller afsenderblok.
- Maksimalt 350–400 ord. Hold sproget naturligt, selvsikkert og professionelt.

STILLING: ${application.job.title}
VIRKSOMHED: ${application.job.companyName}
JOB-OPSUMMERING: ${application.job.summary || application.job.rawText?.slice(0, 1500) || ''}
${aboutMe ? `OM MIG:\n${aboutMe}\n` : ''}
NUVÆRENDE ANSØGNING:
${sourceDoc.coverLetter.content}

ØNSKEDE ÆNDRINGER FRA BRUGEREN:
${instruction}`;

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

    const lastVersion = await DocumentSet.findOne({ applicationId }).sort({ version: -1 });
    const version = (lastVersion?.version || 0) + 1;

    const docSet = await DocumentSet.create({
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
