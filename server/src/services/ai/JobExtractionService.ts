import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import {
  isWeakCompanyName,
  resolveCompanyName,
} from '../scraper/companyNameResolver';
import { composeAiPrompt } from '@career-intelligence/shared';

const JOB_EXTRACTION_INSTRUCTIONS = `Du renser og strukturerer ét jobopslag fra rå sidetekst (scrapet HTML-tekst eller manuel paste).

Regler:
1. Behold KUN det intenderede/primære jobopslag.
2. Ignorér og udelad: navigation, footers, cookies, share-widgets, "lignende jobs", "andre stillinger", anbefalede listings, søgeresultater, CTA-lister med andre jobtitler.
3. description skal være den fulde opslagstekst for netop denne stilling i let markdown:
   - Brug ## til overskrifter (fx "## Dine opgaver")
   - Brug - til punktlister og 1. 2. 3. til nummererede lister
   - Behold afsnit adskilt med blank linje
   - Behold **fed** hvor det er meningsfuldt
   - Undgå andre jobtitler / relaterede stillinger
4. Opfind ikke fakta. Hvis et felt mangler, udelad det eller brug tom streng/array.
5. language: "da" eller "en" (primært sprog i opslaget).
6. summary: 1–3 sætninger (max ca. 400 tegn) der opsummerer stillingen (ren tekst, uden markdown).

companyName (vigtigt):
- Angiv den ANSÆTTENDE virksomhed / arbejdsgiveren — IKKE jobportalen, ATS'en eller mediets navn.
- Brug ALDRIG Jobindex, LinkedIn, Indeed, Glassdoor, Ofir, Jobnet, TheHub, StepStone, hostname eller lignende som companyName.
- Hvis scraper-hintet er en jobportal eller companyNameHintIsWeak=true, ignorer hintet og udled virksomheden fra opslagsteksten.
- Prioritér tydelige indikationer i teksten, fx:
  - "Hos Novo Nordisk søger vi..."
  - "Acme A/S søger en..."
  - "Vi er Contoso" / "Om Contoso" / "About Contoso"
  - "Ansættende virksomhed: ..." / "Arbejdsgiver: ..." / "Company: ..."
  - virksomhedsnavn i overskrift, byline eller kontaktblok
  - e-mail-domæne (@acme.dk) når det klart pejer på arbejdsgiveren (ikke gmail/jobportal)
- Hvis flere firmanavne nævnes, vælg den der ansætter til stillingen (ikke kunder, partnere eller værktøjer).
- Bevar officiel stavemåde inkl. A/S, ApS, Group osv. når det fremgår.
- Hvis virksomheden stadig ikke kan identificeres: sæt companyName til tom streng "".

Returnér JSON:
{
  "title": "string",
  "companyName": "string",
  "location": "string eller tom",
  "description": "string — kun det primære opslag (markdown med ##, lister og afsnit)",
  "summary": "string",
  "keyRequirements": ["string"],
  "keyResponsibilities": ["string"],
  "employmentType": "string eller tom",
  "salary": "string eller tom",
  "contactEmail": "string eller tom",
  "language": "da" | "en"
}`;

export interface JobExtractionInput {
  title: string;
  companyName: string;
  location?: string;
  rawText: string;
  keyRequirements?: string[];
  keyResponsibilities?: string[];
  source?: string;
  url?: string;
  /** Optional raw HTML for JSON-LD / DOM company signals */
  rawHtml?: string;
  tenantId?: Types.ObjectId | string;
}

export interface ExtractedJob {
  title: string;
  companyName: string;
  location?: string;
  description: string;
  summary: string;
  keyRequirements: string[];
  keyResponsibilities: string[];
  employmentType?: string;
  salary?: string;
  contactEmail?: string;
  language: string;
}

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

/** Keep paragraph/line breaks; collapse only runs of spaces/tabs within lines. */
function normalizeStructuredText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildSummary(description: string, maxLength = 500): string {
  const cleaned = description
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastStop > maxLength * 0.5) return slice.slice(0, lastStop + 1).trim();
  return `${slice.trim()}…`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.replace(/\s+/g, ' ').trim())
    .filter((v) => v.length > 0 && v.length < 400)
    .slice(0, 25);
}

function resolveBestCompanyName(
  input: JobExtractionInput,
  aiCompany?: string,
  description?: string
): string {
  const text = description || input.rawText;
  const fromAi = aiCompany && !isWeakCompanyName(aiCompany) ? aiCompany.trim() : undefined;
  const fromSignals = resolveCompanyName({
    hint: input.companyName,
    html: input.rawHtml,
    text,
  });

  // Prefer AI when it found a real employer; otherwise structured/text signals; else non-weak hint.
  if (fromAi) return fromAi;
  if (fromSignals) return fromSignals;
  if (!isWeakCompanyName(input.companyName)) return input.companyName.trim();
  return 'Ukendt virksomhed';
}

function fallbackExtract(input: JobExtractionInput): ExtractedJob {
  const description = normalizeStructuredText(input.rawText);
  return {
    title: input.title || 'Ukendt stilling',
    companyName: resolveBestCompanyName(input, undefined, description),
    location: input.location,
    description,
    summary: buildSummary(description),
    keyRequirements: input.keyRequirements || [],
    keyResponsibilities: input.keyResponsibilities || [],
    language: 'da',
  };
}

export class JobExtractionService {
  /**
   * Refines scraped/manual job text into a clean, structured job object.
   * Falls back to DOM/manual fields when OpenAI is unavailable or fails.
   */
  async extract(input: JobExtractionInput): Promise<ExtractedJob> {
    const base = fallbackExtract(input);
    if (!openai || !input.rawText.trim()) return base;

    const scraperHintWeak = isWeakCompanyName(input.companyName);

    try {
      const context = [
        'KONTEKST:',
        `Kilde: ${input.source || 'unknown'}`,
        `URL: ${input.url || '(ingen)'}`,
        'HINTS FRA SCRAPER:',
        `- title: ${input.title}`,
        `- companyName: ${input.companyName || '(mangler / upålideligt)'}`,
        `- companyNameHintIsWeak: ${scraperHintWeak}`,
        `- location: ${input.location || '(ukendt)'}`,
        `- keyRequirements (hint): ${JSON.stringify(input.keyRequirements || [])}`,
        `- keyResponsibilities (hint): ${JSON.stringify(input.keyResponsibilities || [])}`,
        'RÅ TEKST:',
        input.rawText.slice(0, 10000),
      ].join('\n');

      const prompt = composeAiPrompt(JOB_EXTRACTION_INSTRUCTIONS, context);

      const completion = await openai.chat.completions.create({
        model: config.aiModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return base;

      const parsed = JSON.parse(content) as Partial<ExtractedJob>;
      const description =
        typeof parsed.description === 'string' && parsed.description.trim().length > 40
          ? normalizeStructuredText(parsed.description)
          : base.description;

      const language = parsed.language === 'en' || parsed.language === 'da' ? parsed.language : base.language;

      const aiCompany =
        typeof parsed.companyName === 'string' ? parsed.companyName.trim() : undefined;

      return {
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : base.title,
        companyName: resolveBestCompanyName(input, aiCompany, description),
        location:
          typeof parsed.location === 'string' && parsed.location.trim()
            ? parsed.location.trim()
            : base.location,
        description,
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.replace(/\s+/g, ' ').trim().slice(0, 500)
            : buildSummary(description),
        keyRequirements: asStringArray(parsed.keyRequirements).length
          ? asStringArray(parsed.keyRequirements)
          : base.keyRequirements,
        keyResponsibilities: asStringArray(parsed.keyResponsibilities).length
          ? asStringArray(parsed.keyResponsibilities)
          : base.keyResponsibilities,
        employmentType:
          typeof parsed.employmentType === 'string' && parsed.employmentType.trim()
            ? parsed.employmentType.trim()
            : undefined,
        salary:
          typeof parsed.salary === 'string' && parsed.salary.trim()
            ? parsed.salary.trim()
            : undefined,
        contactEmail:
          typeof parsed.contactEmail === 'string' && parsed.contactEmail.includes('@')
            ? parsed.contactEmail.trim()
            : undefined,
        language,
      };
    } catch (err) {
      console.error('Job-extraction fejlede, bruger scraper-fallback:', err);
      return base;
    }
  }
}

export const jobExtractionService = new JobExtractionService();
