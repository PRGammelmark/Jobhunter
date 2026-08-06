import * as cheerio from 'cheerio';

/** Job boards / aggregators that must never be treated as the hiring company. */
const JOB_BOARD_NAMES = new Set(
  [
    'jobindex',
    'jobindex.dk',
    'linkedin',
    'linkedin.com',
    'indeed',
    'indeed.com',
    'glassdoor',
    'stepstone',
    'ofir',
    'jobnet',
    'thehub',
    'the hub',
    'careerjet',
    'monster',
    'simplyhired',
    'jooble',
    'jobfinder',
    'jobagent',
    'workin.dk',
    'graduateland',
    'academicwork',
    'academic work',
    'it-jobbank',
    'computerworld it-jobbank',
    'talentech',
    'hr-manager',
    'emply',
  ].map((s) => s.toLowerCase())
);

const JOB_BOARD_HOST_FRAGMENTS = [
  'jobindex',
  'linkedin',
  'indeed',
  'glassdoor',
  'stepstone',
  'ofir.dk',
  'jobnet',
  'thehub.io',
  'careerjet',
  'jooble',
  'it-jobbank',
  'hr-manager.net',
  'emply.com',
  'talentech',
];

/** Leading words that mean the capture was prose, not a company name. */
const COMPANY_FILLER_PREFIX =
  /^(nemlig|ikke|kun|our|the|a|an|dedicated|this|that|their|its|vi|we|du|you|en|et|de|den|det|hos)\b/i;
const WEAK_PLACEHOLDERS = new Set([
  '',
  'ukendt',
  'ukendt virksomhed',
  'unknown',
  'unknown company',
  'n/a',
  'na',
]);

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9æøåäöü.\s-]/gi, '');
}

export function isLikelyJobBoardName(name: string | undefined | null): boolean {
  if (!name) return true;
  const key = normalizeKey(name);
  if (!key || WEAK_PLACEHOLDERS.has(key)) return true;
  if (JOB_BOARD_NAMES.has(key)) return true;
  if (JOB_BOARD_HOST_FRAGMENTS.some((frag) => key.includes(frag))) return true;
  // Bare hostnames like "company.dk" from URL fallback are often wrong for aggregators
  if (/^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(name.trim()) && JOB_BOARD_HOST_FRAGMENTS.some((f) => name.toLowerCase().includes(f))) {
    return true;
  }
  return false;
}

export function isWeakCompanyName(name: string | undefined | null): boolean {
  if (!name) return true;
  const key = normalizeKey(name);
  if (!key || WEAK_PLACEHOLDERS.has(key)) return true;
  if (isLikelyJobBoardName(name)) return true;
  // Pure hostname without looking like a brand (e.g. www.example.com)
  if (/^(www\.)?[a-z0-9-]+\.(dk|com|io|net|org|eu)$/i.test(name.trim())) return true;
  return false;
}

function cleanCompanyCandidate(raw: string): string | undefined {
  let name = raw.replace(/\u00AD/g, '').replace(/\s+/g, ' ').trim();
  name = name.replace(/^[\s:–—|-]+/, '').replace(/[\s:–—|-]+$/, '');
  // Drop trailing location/boilerplate
  name = name.replace(/\s*[|–—-]\s*(danmark|denmark|københavn|copenhagen|aarhus|odense|aalborg).*$/i, '');
  name = name.replace(/\s+(søger|leder efter|is hiring|are hiring).*$/i, '');
  // "Novo NordiskA/S" → "Novo Nordisk A/S" (JSON-LD often omits the space)
  name = name.replace(/([^\s])(A\/S|ApS|I\/S)\b/g, '$1 $2');
  name = name.trim();
  if (name.length < 2 || name.length > 80) return undefined;
  if (COMPANY_FILLER_PREFIX.test(name)) return undefined;
  if (isLikelyJobBoardName(name)) return undefined;
  // Reject prose fragments (keep "og"/"and" — common in Danish company names)
  if (/\s(vi|we|du|you|er|are|ikke|kun)\s/i.test(name) && name.split(' ').length > 4) {
    return undefined;
  }
  return name;
}

/** Infer hiring company from phrases inside the job posting body. */
export function inferCompanyFromText(text: string): string | undefined {
  if (!text?.trim()) return undefined;
  const sample = text.slice(0, 5000);

  // Avoid /i on patterns that require an initial capital — in JS, /i makes [A-Z] match a-z.
  const patterns: RegExp[] = [
    /ansættende virksomhed\s*[:–—-]\s*([^\n.|]{2,80})/i,
    /arbejdsgiver\s*[:–—-]\s*([^\n.|]{2,80})/i,
    /virksomhed\s*[:–—-]\s*([A-ZÆØÅÄÖÜ][^\n.|]{1,70})/,
    /[Cc]ompany\s*[:–—-]\s*([A-ZÆØÅÄÖÜ][^\n.|]{1,70})/,
    /[Ee]mployer\s*[:–—-]\s*([A-ZÆØÅÄÖÜ][^\n.|]{1,70})/,
    /\b[Hh]os\s+([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,4})\s+(?:søger|leder|ønsker|finder|har)/,
    /\b([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+(?:&|og|A\/S|ApS|I\/S|AB|AS|Ltd\.?|LLC|GmbH|Group|Gruppen))?)\s+søger\s+(?:en|et)\b/,
    /\b[Vv]i er\s+([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,3})\b/,
    /\b[Ww]e are\s+([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,3})\b/,
    /\b[Oo]m\s+([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,3})\s*[:.]/,
    /\b[Aa]bout\s+([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,3})\s*[:.]/,
    /\b[Jj]oin\s+(?:the\s+team\s+at\s+)?([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,40}(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]{1,30}){0,3})\b/,
    /\b([A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]+(?:\s+[A-ZÆØÅÄÖÜ][\wæøåÆØÅÄÖÜ&.'’-]+){0,3})\s+is\s+looking\s+for\b/,
  ];
  for (const pattern of patterns) {
    const match = sample.match(pattern);
    const candidate = match?.[1] ? cleanCompanyCandidate(match[1]) : undefined;
    if (candidate) return candidate;
  }

  // Email domain hint (skip public mail hosts and job boards)
  const emailMatch = sample.match(
    /(?:kontakt|contact|hr|jobs?|career|rekruttering)[^\n@]{0,40}@([a-z0-9][a-z0-9.-]+\.[a-z]{2,})/i
  ) || sample.match(/\b[a-z0-9._%+-]+@([a-z0-9][a-z0-9.-]+\.[a-z]{2,})\b/i);
  if (emailMatch?.[1]) {
    const domain = emailMatch[1].toLowerCase();
    const publicHosts = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.dk', 'icloud.com'];
    if (!publicHosts.includes(domain) && !JOB_BOARD_HOST_FRAGMENTS.some((f) => domain.includes(f))) {
      const brand = domain.split('.')[0];
      if (brand && brand.length > 2 && brand !== 'www') {
        // Capitalize simple brand from domain
        const pretty = brand.charAt(0).toUpperCase() + brand.slice(1);
        if (!isLikelyJobBoardName(pretty)) return pretty;
      }
    }
  }

  return undefined;
}

function readJsonLdOrganizations(html: string): string[] {
  const $ = cheerio.load(html);
  const names: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        collectOrgNames(node, names);
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  return names;
}

function collectOrgNames(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  const type = obj['@type'];
  const types = Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];

  if (types.some((t) => /JobPosting/i.test(t))) {
    const org = obj.hiringOrganization;
    if (typeof org === 'string') out.push(org);
    else if (org && typeof org === 'object') {
      const name = (org as Record<string, unknown>).name;
      if (typeof name === 'string') out.push(name);
    }
  }

  if (types.some((t) => /Organization|Corporation|Employer/i.test(t))) {
    if (typeof obj.name === 'string') out.push(obj.name);
  }

  // Walk common containers
  for (const key of ['@graph', 'itemListElement', 'mainEntity']) {
    const child = obj[key];
    if (Array.isArray(child)) child.forEach((c) => collectOrgNames(c, out));
    else if (child) collectOrgNames(child, out);
  }
}

/** Extract company candidates from HTML (JSON-LD + DOM), best-first. */
export function extractCompanyCandidatesFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const candidates: string[] = [];

  for (const name of readJsonLdOrganizations(html)) {
    const cleaned = cleanCompanyCandidate(name);
    if (cleaned) candidates.push(cleaned);
  }

  const selectors = [
    '[itemprop="hiringOrganization"] [itemprop="name"]',
    '[itemprop="hiringOrganization"]',
    '[data-testid="company-name"]',
    'a[data-click="company"]',
    '.jix-toolbar-top__company a',
    '.job-company',
    '.company-name',
    '.companyName',
    '.company',
    '[class*="company-name"]',
    '[class*="companyName"]',
    '[class*="employer-name"]',
    '[class*="employerName"]',
    'meta[property="og:employment_agency"]',
  ];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      const cleaned = content ? cleanCompanyCandidate(content) : undefined;
      if (cleaned) candidates.push(cleaned);
      continue;
    }
    const text = $(selector).first().text();
    const cleaned = text ? cleanCompanyCandidate(text) : undefined;
    if (cleaned) candidates.push(cleaned);
  }

  // HR-Manager / Talentech often only expose the employer via logo alt text.
  $(
    '#AdvertisementContent img[alt], .AdContentContainer img[alt], img.company-logo[alt], img[class*="company"][alt]'
  ).each((_, el) => {
    const alt = $(el).attr('alt');
    const cleaned = alt ? cleanCompanyCandidate(alt) : undefined;
    if (cleaned) candidates.push(cleaned);
  });

  // Deduplicate preserving order
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = normalizeKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Pick the best company name from scraper hints, HTML, and posting text.
 * Prefers structured HTML/JSON-LD, then body text phrases, then non-weak hints.
 */
export function resolveCompanyName(options: {
  hint?: string;
  html?: string;
  text?: string;
}): string | undefined {
  const fromHtml = options.html ? extractCompanyCandidatesFromHtml(options.html) : [];
  const fromText = options.text ? inferCompanyFromText(options.text) : undefined;
  const hint = options.hint && !isWeakCompanyName(options.hint) ? cleanCompanyCandidate(options.hint) : undefined;

  const ordered = [...fromHtml, fromText, hint].filter((v): v is string => Boolean(v));
  for (const candidate of ordered) {
    if (!isWeakCompanyName(candidate)) return candidate;
  }
  return undefined;
}
