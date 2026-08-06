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
  // Do not remove <form> — ASP.NET ATS pages (HR-Manager/Talentech) wrap the whole ad in aspnetForm.
  'input[type="hidden"]',
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
  // HR-Manager / Talentech advertisement markup
  '#AdvertisementContent',
  '#AdvertisementInnerContent',
  '.AdContentContainer',
  '.ProjectDescription',
  // Jobindex family (jobannonce pages) + Emply career sites
  '.job-body',
  '.PaidJob-inner',
  '.csa_jobadText',
  // TheHub + LinkedIn guest
  '.view-job-details__body',
  '.description__text--rich',
  '.description__text',
  '#job-details',
  '#job-description',
  '#jobDescription',
];

/** UI chrome often marked up as h1 on ATS apply pages — prefer job-specific selectors / og:title instead. */
const WEAK_TITLE =
  /^(del|share|apply|apply for position|ansøg|ansøg om stillingen|login|log ind|menu|gem)$/i;

const WEAK_DESCRIPTION = /^(?:[-–—.]|n\/a|na)?$/i;

const REQUIREMENT_HEADING =
  /krav|requirement|qualification|kompetenc|du har|vi søger|ønsker|must[- ]have|skills?|erfaring/i;
const RESPONSIBILITY_HEADING =
  /ansvar|opgave|responsibility|responsibilities|du skal|arbejdsopgave|what you.?ll do|om stillingen|jobbet/i;

const JOBINDEX_FAMILY_HOST =
  /(?:^|\.)(jobindex\.dk|it-jobbank\.dk|stepstone\.dk)$/i;
const TRUSTED_FULL_AD_HOST =
  /(?:^|\.)(jobindex\.dk|it-jobbank\.dk|stepstone\.dk|career\.emply\.com|emply\.com|hr-manager\.net|teamtailor\.com|recruitee\.com|lever\.co|greenhouse\.io|ashbyhq\.com)$/i;

function detectSource(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  if (host.includes('jobindex.dk')) return 'jobindex';
  if (host.includes('it-jobbank.dk')) return 'it-jobbank';
  if (host.includes('stepstone.dk')) return 'stepstone';
  if (host.includes('thehub.io')) return 'thehub';
  if (host.includes('hr-manager.net')) return 'hr-manager';
  if (host.includes('emply.com')) return 'emply';
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('indeed.')) return 'indeed';
  return 'unknown';
}

function isJobindexFamily(source: string): boolean {
  return source === 'jobindex' || source === 'it-jobbank' || source === 'stepstone';
}

function normalizeText(text: string): string {
  return text.replace(/\u00AD/g, '').replace(/\s+/g, ' ').trim();
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
/** Keep form children (ASP.NET wraps ads in <form>); drop the form tag itself. */
function unwrapForms($: cheerio.CheerioAPI): void {
  $('form').each((_, el) => {
    const $el = $(el);
    $el.replaceWith($el.contents());
  });
}

export function htmlToStructuredText(fragmentHtml: string): string {
  if (!fragmentHtml) return '';
  const $ = cheerio.load(fragmentHtml);
  $('script, style, noscript, iframe, input[type="hidden"]').remove();
  unwrapForms($);

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
  unwrapForms($);
  $(NOISE_SELECTORS).remove();
}

function pickFirstText($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const text = normalizeText($(selector).first().text());
    if (text) return text;
  }
  return '';
}

function pickMetaContent($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const content = normalizeText($(selector).first().attr('content') || '');
    if (content) return content;
  }
  return '';
}

function cleanTitle(title: string): string {
  let t = normalizeText(title);
  t = t.replace(/^(jobannonce|job ad|jobopslag)\s*:\s*/i, '');
  t = t.replace(/^the hub\s*[|–—-]\s*/i, '');
  t = t.replace(
    /\s*[|–—]\s*(linkedin|jobindex|stepstone|the hub|talentech|computerworld.*|career site)\s*$/i,
    ''
  );
  // "Title | Company" / "The Hub | Title | Company" → keep the job title segment
  const parts = t.split(/\s*[|–—]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (last.length < 48 && parts[0].length >= last.length) {
      t = parts.slice(0, -1).join(' — ');
    }
  }
  return t.trim();
}

function cleanLocation(location: string): string {
  return normalizeText(location).replace(
    /^(workplace|arbejdssted|location|lokation|sted)\s*[:.]?\s*/i,
    ''
  );
}

interface JsonLdJob {
  title?: string;
  descriptionHtml?: string;
  companyName?: string;
  location?: string;
}

function readJsonLdJob(html: string): JsonLdJob {
  const $ = cheerio.load(html);
  const out: JsonLdJob = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        walkJsonLdJob(node, out);
      }
    } catch {
      // ignore invalid JSON-LD
    }
  });

  return out;
}

function walkJsonLdJob(node: unknown, out: JsonLdJob): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];

  if (types.some((t) => /JobPosting/i.test(t))) {
    if (typeof obj.title === 'string' && !out.title) out.title = normalizeText(obj.title);
    if (typeof obj.description === 'string' && !out.descriptionHtml) {
      out.descriptionHtml = obj.description;
    }
    const org = obj.hiringOrganization;
    if (!out.companyName) {
      if (typeof org === 'string') out.companyName = normalizeText(org);
      else if (org && typeof org === 'object') {
        const name = (org as Record<string, unknown>).name;
        if (typeof name === 'string') out.companyName = normalizeText(name);
      }
    }
    if (!out.location) {
      const loc = obj.jobLocation;
      const locs = Array.isArray(loc) ? loc : loc ? [loc] : [];
      for (const item of locs) {
        if (!item || typeof item !== 'object') continue;
        const address = (item as Record<string, unknown>).address;
        if (typeof address === 'string') {
          out.location = normalizeText(address);
          break;
        }
        if (address && typeof address === 'object') {
          const a = address as Record<string, unknown>;
          const locality = typeof a.addressLocality === 'string' ? a.addressLocality : '';
          const region = typeof a.addressRegion === 'string' ? a.addressRegion : '';
          const country = typeof a.addressCountry === 'string' ? a.addressCountry : '';
          const label = [locality, region, country].filter(Boolean).join(', ');
          if (label) {
            out.location = normalizeText(label);
            break;
          }
        }
      }
    }
  }

  for (const key of ['@graph', 'itemListElement', 'mainEntity']) {
    const child = obj[key];
    if (Array.isArray(child)) child.forEach((c) => walkJsonLdJob(c, out));
    else if (child) walkJsonLdJob(child, out);
  }
}

/** Jobindex-family `vis-job` pages are often teasers; follow "Se jobbet" / jobannonce / ATS links. */
export function findFullAdUrl(html: string, pageUrl: string): string | undefined {
  const $ = cheerio.load(html);
  const candidates: { url: string; score: number }[] = [];

  const push = (href: string | undefined, baseScore: number) => {
    if (!href) return;
    try {
      const abs = new URL(href, pageUrl);
      if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
      const normalized = abs.href.split('#')[0];
      if (normalized === pageUrl.split('#')[0]) return;
      if (/facebook\.|twitter\.|linkedin\.com\/share|mailto:/i.test(normalized)) return;
      let score = baseScore;
      const host = abs.hostname.toLowerCase();
      if (JOBINDEX_FAMILY_HOST.test(host) && /\/jobannonce\//i.test(abs.pathname)) score += 50;
      if (TRUSTED_FULL_AD_HOST.test(host)) score += 35;
      if (/\/vis-job\//i.test(abs.pathname)) score -= 60;
      if (/\/jobannonce\//i.test(abs.pathname)) score += 25;
      candidates.push({ url: normalized, score });
    } catch {
      // ignore invalid URLs
    }
  };

  $('a.seejobdesktop, a.seejobmobil').each((_, el) => push($(el).attr('href'), 100));
  $('a[href*="/jobannonce/"]').each((_, el) => push($(el).attr('href'), 80));

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 80) return undefined;

  try {
    const pageHost = new URL(pageUrl).hostname.toLowerCase();
    const bestHost = new URL(best.url).hostname.toLowerCase();
    const pageIsTeaser = /\/vis-job\//i.test(pageUrl);
    if (
      pageIsTeaser ||
      bestHost === pageHost ||
      TRUSTED_FULL_AD_HOST.test(bestHost)
    ) {
      return best.url;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function pickTitle($: cheerio.CheerioAPI, source: string): string {
  const jobSpecific =
    (isJobindexFamily(source)
      ? pickFirstText($, ['.job-title', '[data-testid="job-title"]'])
      : '') ||
    pickFirstText($, [
      '[data-testid="job-title"]',
      '[itemprop="title"]',
      '.view-job-details__title',
      '.ProjectName',
      '[class*="ProjectName"]',
      '.job-title',
      '[class*="job-title"]',
      '[class*="jobTitle"]',
      '.css_headline',
    ]);
  if (jobSpecific && !WEAK_TITLE.test(jobSpecific)) return cleanTitle(jobSpecific);

  const h1 = pickFirstText($, ['h1']);
  if (h1 && !WEAK_TITLE.test(h1)) return cleanTitle(h1);

  const ogTitle = pickMetaContent($, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ]);
  if (ogTitle && !WEAK_TITLE.test(ogTitle)) return cleanTitle(ogTitle);

  return cleanTitle(($('title').text().split(/[|–—-]/)[0] || ''));
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Kunne ikke hente jobopslag (${response.status})`);
  }

  return {
    html: await response.text(),
    finalUrl: response.url || url,
  };
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

/** Parse job fields from already-fetched HTML (used by scrapeJobUrl and offline tests). */
export function parseJobFields(html: string, url: string): Omit<ScrapedJob, 'rawHtml'> {
  const jsonLd = readJsonLdJob(html);

  // Read structured fields before noise removal — Jobindex-family puts company/location in <header>.
  const $raw = cheerio.load(html);
  const ogTitle = pickMetaContent($raw, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ]);
  const earlyLocation = pickFirstText($raw, [
    '.job-location',
    '.jobad-element-area',
    '.jix_robotjob--area',
    '[data-testid="job-location"]',
    '[itemprop="jobLocation"]',
  ]);
  const earlyCompany = pickFirstText($raw, [
    '.jix-toolbar-top__company a',
    '.job-company',
    '[data-testid="company-name"]',
  ]);

  const $ = cheerio.load(html);
  removeNoise($);

  const source = detectSource(url);
  let title = pickTitle($, source);
  if ((!title || WEAK_TITLE.test(title)) && ogTitle && !WEAK_TITLE.test(ogTitle)) {
    title = cleanTitle(ogTitle);
  }
  if (jsonLd.title && (!title || WEAK_TITLE.test(title) || title.length < jsonLd.title.length)) {
    // Prefer JSON-LD when DOM title is board-chrome or missing (TheHub, etc.)
    if (!title || WEAK_TITLE.test(title) || /the hub/i.test(title)) {
      title = cleanTitle(jsonLd.title);
    }
  }

  let location =
    earlyLocation ||
    pickFirstText($, [
      '.job-location',
      '.jobad-element-area',
      '.jix_robotjob--area',
      '.location',
      '[data-testid="job-location"]',
      '[itemprop="jobLocation"]',
      '[class*="job-location"]',
    ]) ||
    jsonLd.location ||
    undefined;
  if (location) location = cleanLocation(location) || undefined;

  let descriptionHtml = extractDescriptionHtml($);
  let description = descriptionHtml ? htmlToStructuredText(descriptionHtml) : '';

  if (
    jsonLd.descriptionHtml &&
    (!description || description.length < 200 || WEAK_DESCRIPTION.test(description))
  ) {
    const fromJsonLd = htmlToStructuredText(
      /<[a-z][\s\S]*>/i.test(jsonLd.descriptionHtml)
        ? jsonLd.descriptionHtml
        : `<p>${jsonLd.descriptionHtml}</p>`
    );
    if (fromJsonLd.length > description.length) {
      description = fromJsonLd;
      descriptionHtml = jsonLd.descriptionHtml;
    }
  }

  if (!description || WEAK_DESCRIPTION.test(description)) {
    description = htmlToStructuredText($.html('body') || '').slice(0, 8000);
  } else if (description.length > 12000) {
    description = description.slice(0, 12000);
  }

  // LinkedIn guest pages often omit the real JD and leave chrome in <main>.
  if (source === 'linkedin') {
    const ogDescription = pickMetaContent($raw, [
      'meta[property="og:description"]',
      'meta[name="description"]',
    ]);
    const looksLikeChrome =
      /bliv en af de første|see who .* hired for this role|ansøgere se, hvem/i.test(description) &&
      description.length < 2500;
    if (looksLikeChrome && ogDescription && ogDescription.length > 80) {
      description = ogDescription;
    }
  }
  const keyRequirements = extractListAfterHeadings(descriptionHtml, REQUIREMENT_HEADING);
  const keyResponsibilities = extractListAfterHeadings(descriptionHtml, RESPONSIBILITY_HEADING);

  const domHint =
    earlyCompany ||
    (isJobindexFamily(source)
      ? pickFirstText($, [
          '.jix-toolbar-top__company a',
          '.job-company',
          '[data-testid="company-name"]',
          'a[data-click="company"]',
        ])
      : pickFirstText($, [
          '.jix-toolbar-top__company a',
          '.job-company',
          '[data-testid="company-name"]',
          'a[data-click="company"]',
          '.company',
          '[itemprop="hiringOrganization"]',
          '[class*="company-name"]',
          '[class*="companyName"]',
        ]));

  // Never fall back to og:site_name / hostname — those are usually the job board.
  const companyName =
    resolveCompanyName({
      hint: domHint || jsonLd.companyName,
      html,
      text: description,
    }) || '';

  return {
    title: title || '',
    companyName,
    location,
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
  let { html: rawHtml, finalUrl } = await fetchHtml(url);

  const fullAdUrl = findFullAdUrl(rawHtml, finalUrl);
  if (fullAdUrl) {
    try {
      const followed = await fetchHtml(fullAdUrl);
      rawHtml = followed.html;
      finalUrl = followed.finalUrl;
    } catch {
      // Keep the original page if the full-ad hop fails
    }
  }

  const parsed = parseJobFields(rawHtml, finalUrl);

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
    source: parsed.source || detectSource(url),
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
