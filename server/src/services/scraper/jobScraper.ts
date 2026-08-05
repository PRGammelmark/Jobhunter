import type { Types } from 'mongoose';
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

/** Keep paragraph/line breaks; collapse only runs of spaces/tabs within lines. */
function normalizeStructuredText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert a job-description HTML fragment to lightweight markdown:
 * ## headings, - / 1. lists, paragraphs, **bold**.
 */
export function htmlToStructuredText(fragmentHtml: string): string {
  if (!fragmentHtml) return '';
  const $ = cheerio.load(fragmentHtml);
  $('script, style, noscript, iframe, form').remove();

  const BLOCK_TAGS = new Set([
    'p',
    'div',
    'section',
    'article',
    'header',
    'footer',
    'main',
    'aside',
    'blockquote',
    'pre',
    'tr',
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function inlineText($el: cheerio.Cheerio<any>): string {
    let out = '';
    $el.contents().each((_, node: any) => {
      if (node.type === 'text') {
        out += (node.data || '').replace(/\s+/g, ' ');
        return;
      }
      if (node.type !== 'tag') return;
      const tag = String(node.name || '').toLowerCase();
      const $child = $(node);
      if (tag === 'br') {
        out += '\n';
        return;
      }
      if (tag === 'strong' || tag === 'b') {
        const inner = inlineText($child).trim();
        out += inner ? `**${inner}**` : '';
        return;
      }
      if (tag === 'em' || tag === 'i') {
        const inner = inlineText($child).trim();
        out += inner ? `*${inner}*` : '';
        return;
      }
      if (tag === 'a') {
        out += inlineText($child);
        return;
      }
      if (/^h[1-6]$/.test(tag) || tag === 'ul' || tag === 'ol' || tag === 'li' || BLOCK_TAGS.has(tag)) {
        out += ` ${normalizeText($child.text())} `;
        return;
      }
      out += inlineText($child);
    });
    return out;
  }

  function renderList(listEl: any, ordered: boolean): string {
    const lines: string[] = [];
    $(listEl)
      .children('li')
      .each((idx, li) => {
        const text = normalizeText(inlineText($(li)));
        if (!text) return;
        lines.push(ordered ? `${idx + 1}. ${text}` : `- ${text}`);
      });
    return lines.length ? `\n\n${lines.join('\n')}\n\n` : '';
  }

  function walk(node: any): string {
    if (!node) return '';
    if (node.type === 'text') {
      return (node.data || '').replace(/\s+/g, ' ');
    }
    if (node.type !== 'tag') return '';

    const tag = String(node.name || '').toLowerCase();
    const $el = $(node);

    if (tag === 'br') return '\n';
    if (/^h[1-6]$/.test(tag)) {
      const heading = normalizeText(inlineText($el));
      return heading ? `\n\n## ${heading}\n\n` : '';
    }
    if (tag === 'ul') return renderList(node, false);
    if (tag === 'ol') return renderList(node, true);
    if (tag === 'li') {
      const text = normalizeText(inlineText($el));
      return text ? `\n- ${text}\n` : '';
    }
    if (tag === 'strong' || tag === 'b') {
      const inner = inlineText($el).trim();
      return inner ? `**${inner}**` : '';
    }
    if (tag === 'em' || tag === 'i') {
      const inner = inlineText($el).trim();
      return inner ? `*${inner}*` : '';
    }
    if (tag === 'hr') return '\n\n';

    if (BLOCK_TAGS.has(tag) || tag === 'body' || tag === 'html') {
      const hasBlockChild = $el.children().toArray().some((child: any) => {
        if (child.type !== 'tag') return false;
        const t = String(child.name || '').toLowerCase();
        return BLOCK_TAGS.has(t) || /^h[1-6]$/.test(t) || t === 'ul' || t === 'ol' || t === 'br';
      });

      if (hasBlockChild) {
        let out = '';
        $el.contents().each((_: number, child: any) => {
          out += walk(child);
        });
        return out;
      }

      const text = normalizeText(inlineText($el));
      return text ? `\n\n${text}\n\n` : '';
    }

    let out = '';
    $el.contents().each((_: number, child: any) => {
      out += walk(child);
    });
    return out;
  }

  let result = '';
  $('body')
    .contents()
    .each((_: number, node: any) => {
      result += walk(node);
    });

  return normalizeStructuredText(result);
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
  let description = descriptionHtml ? htmlToStructuredText(descriptionHtml) : '';

  if (!description) {
    description = htmlToStructuredText($.html('body') || '').slice(0, 8000);
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
  url: string,
  tenantId: Types.ObjectId | string
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
    { tenantId, documentType: 'jobs' }
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
  const structured = normalizeStructuredText(text);
  const flatForSignals = normalizeText(text);
  const resolved =
    (!isWeakCompanyName(companyName) && companyName?.trim()) ||
    resolveCompanyName({ hint: companyName, text: flatForSignals }) ||
    '';

  return {
    title: title || 'Manuelt indtastet stilling',
    companyName: resolved,
    description: structured,
    keyRequirements: [],
    keyResponsibilities: [],
    source: 'manual',
    rawHtml: text,
  };
}
