import * as cheerio from 'cheerio';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractText(html: string, maxLength = 6000): string {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, noscript, iframe').remove();
  const text =
    $('main').text().trim() ||
    $('article').text().trim() ||
    $('[class*="about"]').text().trim() ||
    $('body').text().trim();
  return text.replace(/\s+/g, ' ').slice(0, maxLength);
}

function extractLinks(html: string, baseUrl: string): { website?: string; linkedIn?: string } {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href);
  });

  let website: string | undefined;
  let linkedIn: string | undefined;

  for (const href of links) {
    const lower = href.toLowerCase();
    if (lower.includes('linkedin.com/company/') || lower.includes('linkedin.com/companies/')) {
      linkedIn = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
    }
  }

  return { website, linkedIn };
}

export async function scrapeCompanyWebsite(url: string): Promise<{ text: string; linkedIn?: string } | null> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const html = await fetchHtml(normalizedUrl);
  if (!html) return null;

  const text = extractText(html);
  const { linkedIn } = extractLinks(html, normalizedUrl);

  const aboutPaths = ['/about', '/om-os', '/about-us', '/om', '/company'];
  let aboutText = '';
  for (const path of aboutPaths) {
    const aboutHtml = await fetchHtml(new URL(path, normalizedUrl).href);
    if (aboutHtml) {
      aboutText = extractText(aboutHtml, 3000);
      if (aboutText.length > 200) break;
    }
  }

  return {
    text: [text, aboutText].filter(Boolean).join('\n\n'),
    linkedIn,
  };
}

export async function scrapeProffPage(cvrOrName: string): Promise<{
  text: string;
  website?: string;
  linkedIn?: string;
} | null> {
  const searchUrl = `https://www.proff.dk/sitemap/_firma/_sok?q=${encodeURIComponent(cvrOrName)}`;
  const html = await fetchHtml(searchUrl);
  if (!html) return null;

  const $ = cheerio.load(html);
  const companyLink = $('a[href*="/company/"]').first().attr('href');
  if (!companyLink) {
    return { text: extractText(html, 3000) };
  }

  const detailUrl = companyLink.startsWith('http')
    ? companyLink
    : `https://www.proff.dk${companyLink}`;
  const detailHtml = await fetchHtml(detailUrl);
  if (!detailHtml) return { text: extractText(html, 3000) };

  const detail$ = cheerio.load(detailHtml);
  let website: string | undefined;
  let linkedIn: string | undefined;

  detail$('a[href]').each((_, el) => {
    const href = detail$(el).attr('href') || '';
    const lower = href.toLowerCase();
    if (!website && lower.startsWith('http') && !lower.includes('proff.dk') && !lower.includes('linkedin')) {
      const label = detail$(el).text().toLowerCase();
      if (label.includes('www') || label.includes('hjemmeside') || label.includes('website')) {
        website = href;
      }
    }
    if (!linkedIn && lower.includes('linkedin.com/company')) {
      linkedIn = href;
    }
  });

  return {
    text: extractText(detailHtml, 5000),
    website,
    linkedIn,
  };
}
