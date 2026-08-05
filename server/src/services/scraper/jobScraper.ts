import * as cheerio from 'cheerio';
import { storageService } from '../storage/storageService';
import {
  isWeakCompanyName,
  resolveCompanyName,
} from './companyNameResolver';

export interface ScrapedJob {
  title: string;
  companyName: string;
  location?: string;
  description: string;
  keyRequirements: string[];
  keyResponsibilities: string[];
  source: string;
  rawHtml: string;
}

const NOISE_SELECTORS = [
  'script',
  'style',
  'nav',
  'footer',
  'header',
  'aside',
  'noscript',
  'iframe',
  'form',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[class*="related"]',
  '[class*="similar"]',
  '[class*="recommend"]',
  '[class*="other-job"]',
  '[class*="otherjob"]',
  '[class*="job-list"]',
  '[class*="joblist"]',
  '[class*="jobs-list"]',
  '[class*="job-card"]',
  '[class*="jobcard"]',
  '[class*="cookie"]',
  '[class*="consent"]',
  '[class*="share"]',
  '[class*="social"]',
  '[class*="newsletter"]',
  '[class*="sidebar"]',
  '[class*="breadcrumb"]',
  '[id*="related"]',
  '[id*="similar"]',
  '[id*="recommend"]',
  '[id*="cookie"]',
].join(', ');

const DESCRIPTION_SELECTORS = [
  '.job-description',
  '[data-testid="job-description"]',
  '[data-testid*="job-description"]',
  '[data-testid*="description"]',
  '[itemprop="description"]',
  '[class*="job-description"]',
  '[class*="jobDescription"]',
  '[class*="job-ad"]',
  '[class*="jobad"]',
  '[class*="job-content"]',
  '[class*="jobContent"]',
  '[class*="job-detail"]',
  '[class*="jobDetail"]',
  '[class*="vacancy-description"]',
  '[class*="position-description"]',
  '[class*="posting-description"]',
  '#job-details',
  '#job-description',
  '#jobDescription',
];

const REQUIREMENT_HEADING =
  /krav|requirement|qualification|kompetenc|du har|vi søger|ønsker|must[- ]have|skills?|erfaring/i;
const RESPONSIBILITY_HEADING =
  /ansvar|opgave|responsibility|responsibilities|du skal|arbejdsopgave|what you.?ll do|om stillingen|jobbet/i;

function detectSource(url: string): string {
  if (url.includes('jobindex.dk')) return 'jobindex';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('indeed.')) return 'indeed';
  return 'unknown';
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function removeNoise($: cheerio.CheerioAPI): void {
  $(NOISE_SELECTORS).remove();
}

function pickFirstText($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const text = normalizeText($(selector).first().text());
    if (text) return text;
  }
  return '';
}

/** Prefer the smallest description-like node; fall back to article/main that contains h1. */
function extractDescriptionHtml($: cheerio.CheerioAPI): string {
  for (const selector of DESCRIPTION_SELECTORS) {
    const node = $(selector).first();
    if (node.length && normalizeText(node.text()).length > 80) {
      return $.html(node) || '';
    }
  }

  const h1 = $('h1').first();
  if (h1.length) {
    const article = h1.closest('article');
    const section = h1.closest('section');
    const scoped = article.length ? article : section.length ? section : h1.parent();
    if (scoped.length && normalizeText(scoped.text()).length > 80) {
      return $.html(scoped) || '';
    }
  }

  const article = $('article').first();
  if (article.length && normalizeText(article.text()).length > 80) {
    return $.html(article) || '';
  }

  const main = $('main').first();
  if (main.length && normalizeText(main.text()).length > 80) {
    return $.html(main) || '';
  }

  return '';
}

function extractListAfterHeadings(fragmentHtml: string, headingPattern: RegExp): string[] {
  if (!fragmentHtml) return [];
  const $ = cheerio.load(fragmentHtml);
  const items: string[] = [];
  $('h1, h2, h3, h4, h5, strong, b').each((_, el) => {
    const heading = normalizeText($(el).text());
    if (!heading || !headingPattern.test(heading)) return;

    let sibling = $(el).next();
    for (let i = 0; i < 4 && sibling.length; i += 1) {
      const tag = (sibling.prop('tagName') || '').toString().toLowerCase();
      if (/^h[1-6]$/.test(tag)) break;

      sibling.find('li').each((__, li) => {
        const text = normalizeText($(li).text());
        if (text && text.length < 300) items.push(text);
      });
      if (tag === 'ul' || tag === 'ol') {
        sibling.children('li').each((__, li) => {
          const text = normalizeText($(li).text());
          if (text && text.length < 300) items.push(text);
        });
      }
      sibling = sibling.next();
    }
  });

  return [...new Set(items)].slice(0, 20);
}

function parseJobFields(html: string, url: string): Omit<ScrapedJob, 'rawHtml'> {
  const $ = cheerio.load(html);
  removeNoise($);

  const source = detectSource(url);
  const title =
    pickFirstText($, [
      'h1',
      '[data-testid="job-title"]',
      '[itemprop="title"]',
      '[class*="job-title"]',
      '[class*="jobTitle"]',
    ]) ||
    normalizeText(($('title').text().split(/[|–—-]/)[0] || ''));

  const location =
    pickFirstText($, [
      '.location',
      '[data-testid="job-location"]',
      '[itemprop="jobLocation"]',
      '[class*="location"]',
      '[class*="job-location"]',
    ]) || undefined;

  const descriptionHtml = extractDescriptionHtml($);
  let description = descriptionHtml
    ? normalizeText(cheerio.load(descriptionHtml).text())
    : '';

  if (!description) {
    description = normalizeText($('body').text()).slice(0, 8000);
  } else if (description.length > 12000) {
    description = description.slice(0, 12000);
  }

  const keyRequirements = extractListAfterHeadings(descriptionHtml, REQUIREMENT_HEADING);
  const keyResponsibilities = extractListAfterHeadings(descriptionHtml, RESPONSIBILITY_HEADING);

  const domHint =
    source === 'jobindex'
      ? pickFirstText($, [
          '[data-testid="company-name"]',
          'a[data-click="company"]',
          '.company',
        ])
      : pickFirstText($, [
          '[data-testid="company-name"]',
          'a[data-click="company"]',
          '.company',
          '[itemprop="hiringOrganization"]',
          '[class*="company-name"]',
          '[class*="companyName"]',
          '[class*="employer"]',
        ]);

  // Never fall back to og:site_name / hostname — those are usually the job board.
  const companyName =
    resolveCompanyName({
      hint: domHint,
      html,
      text: description,
    }) || '';

  const resolvedTitle =
    source === 'jobindex'
      ? pickFirstText($, ['[data-testid="job-title"]']) || title
      : title;

  return {
    title: resolvedTitle,
    companyName,
    location: location || (source === 'jobindex' ? pickFirstText($, ['.location']) || undefined : undefined),
    description,
    keyRequirements,
    keyResponsibilities,
    source,
  };
}

export async function scrapeJobUrl(
  url: string
): Promise<ScrapedJob & { archivedHtml: { storageKey: string; capturedAt: Date } }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Kunne ikke hente jobopslag (${response.status})`);
  }

  const rawHtml = await response.text();
  const parsed = parseJobFields(rawHtml, url);

  const stored = await storageService.upload(
    Buffer.from(rawHtml, 'utf-8'),
    `job-${Date.now()}.html`,
    'text/html',
    'jobs'
  );

  const companyName = !isWeakCompanyName(parsed.companyName)
    ? parsed.companyName
    : resolveCompanyName({ html: rawHtml, text: parsed.description }) || '';

  return {
    title: parsed.title || 'Ukendt stilling',
    companyName,
    location: parsed.location,
    description: parsed.description || '',
    keyRequirements: parsed.keyRequirements,
    keyResponsibilities: parsed.keyResponsibilities,
    source: parsed.source,
    rawHtml,
    archivedHtml: { storageKey: stored.storageKey, capturedAt: new Date() },
  };
}

export function parseManualJobText(
  text: string,
  companyName?: string,
  title?: string
): ScrapedJob {
  const normalized = normalizeText(text);
  const resolved =
    (!isWeakCompanyName(companyName) && companyName?.trim()) ||
    resolveCompanyName({ hint: companyName, text: normalized }) ||
    '';

  return {
    title: title || 'Manuelt indtastet stilling',
    companyName: resolved,
    description: normalized,
    keyRequirements: [],
    keyResponsibilities: [],
    source: 'manual',
    rawHtml: text,
  };
}
