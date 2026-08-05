import type { Types } from 'mongoose';
import OpenAI from 'openai';
import { config } from '../../config';
import { fetchCvrData, isCvrNumber } from '../cvr/cvrService';
import { scrapeCompanyWebsite, scrapeProffPage } from '../scraper/companyScraper';
import { composeAiPrompt, type CompanyResearchResult } from '@career-intelligence/shared';

const COMPANY_RESEARCH_INSTRUCTIONS = `Du er research-assistent for en jobansøgnings-app. Strukturér information om en dansk virksomhed baseret på offentlige data og webscraped tekst.

Returnér JSON med denne struktur (kun felter du kan udfylde med rimelig sikkerhed):
{
  "name": "string — officielt virksomhedsnavn",
  "cvr": "string — 8-cifret CVR hvis kendt",
  "description": "string — 2-4 sætninger om virksomheden, hvad de laver, deres fokus",
  "website": "string — fuld URL til hjemmeside",
  "linkedIn": "string — fuld URL til LinkedIn company side",
  "industry": "string — branche/industri",
  "employeeCount": "string — antal ansatte som tekst, fx '50' eller '10-50'",
  "location": "string — by/adresse i Danmark"
}

Brug kun information fra konteksten. Hvis et felt ikke kan udfyldes, sæt det til null.
For description: skriv en klar, informativ beskrivelse — ikke bare gentag CVR-data.`;

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

function mapCvrToResult(cvr: Awaited<ReturnType<typeof fetchCvrData>>): CompanyResearchResult {
  if (!cvr) return {};
  return {
    name: cvr.name,
    cvr: cvr.cvr,
    description: cvr.description,
    industry: cvr.industry,
    employeeCount: cvr.employeeCount,
    location: cvr.location,
    sources: ['CVR-registret (cvrapi.dk)'],
  };
}

export class CompanyResearchService {
  async research(
    name?: string,
    cvr?: string,
    tenantId?: Types.ObjectId | string
  ): Promise<CompanyResearchResult> {
    const searchValue = (cvr?.trim() || name?.trim() || '').trim();
    if (!searchValue) {
      throw new Error('Angiv virksomhedsnavn eller CVR-nummer');
    }

    const sources: string[] = [];
    let cvrData: Awaited<ReturnType<typeof fetchCvrData>> = null;

    try {
      cvrData = await fetchCvrData(searchValue);
      if (cvrData) sources.push('CVR-registret');
    } catch {
      // CVR lookup failed — continue with web scraping
    }

    if (!cvrData && name?.trim() && !isCvrNumber(searchValue)) {
      try {
        cvrData = await fetchCvrData(name.trim());
        if (cvrData) sources.push('CVR-registret (navnesøgning)');
      } catch {
        // ignore
      }
    }

    const baseResult = mapCvrToResult(cvrData);
    let websiteText = '';
    let discoveredWebsite = baseResult.website;
    let discoveredLinkedIn = baseResult.linkedIn;

    const proffSearch = cvrData?.cvr || searchValue;
    try {
      const proff = await scrapeProffPage(proffSearch);
      if (proff) {
        sources.push('Proff.dk');
        websiteText += proff.text;
        if (proff.website) discoveredWebsite = proff.website;
        if (proff.linkedIn) discoveredLinkedIn = proff.linkedIn;
      }
    } catch {
      // ignore
    }

    if (discoveredWebsite) {
      try {
        const scraped = await scrapeCompanyWebsite(discoveredWebsite);
        if (scraped) {
          sources.push(discoveredWebsite);
          websiteText += '\n\n' + scraped.text;
          if (scraped.linkedIn) discoveredLinkedIn = scraped.linkedIn;
        }
      } catch {
        // ignore
      }
    }

    if (!openai) {
      return {
        ...baseResult,
        website: discoveredWebsite,
        linkedIn: discoveredLinkedIn,
        sources,
      };
    }

    const rawContext = [
      cvrData
        ? `CVR-DATA:\n${JSON.stringify(cvrData, null, 2)}`
        : `SØGEORD: ${searchValue}`,
      websiteText ? `WEBSCRAPED TEKST:\n${websiteText.slice(0, 8000)}` : '',
      discoveredWebsite ? `FUNDET HJEMMESIDE: ${discoveredWebsite}` : '',
      discoveredLinkedIn ? `FUNDET LINKEDIN: ${discoveredLinkedIn}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const prompt = composeAiPrompt(
      COMPANY_RESEARCH_INSTRUCTIONS,
      `KONTEKST:\n${rawContext}`
    );

    const completion = await openai.chat.completions.create({
      model: config.aiModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

    const result: CompanyResearchResult = {
      name: parsed.name || baseResult.name,
      cvr: parsed.cvr || baseResult.cvr,
      description: parsed.description || baseResult.description,
      website: parsed.website || discoveredWebsite || baseResult.website,
      linkedIn: parsed.linkedIn || discoveredLinkedIn || baseResult.linkedIn,
      industry: parsed.industry || baseResult.industry,
      employeeCount: parsed.employeeCount || baseResult.employeeCount,
      location: parsed.location || baseResult.location,
      sources,
    };

    return result;
  }
}

export const companyResearchService = new CompanyResearchService();
