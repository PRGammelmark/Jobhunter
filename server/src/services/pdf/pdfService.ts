import { marked } from 'marked';
import puppeteer from 'puppeteer';

const BASE_STYLES = `
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 700px;
    margin: 0 auto;
    padding: 40px;
  }
  h1 { font-size: 20pt; margin-bottom: 8px; color: #1a1a2e; }
  h2 { font-size: 14pt; margin-top: 24px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  h3 { font-size: 12pt; margin-top: 16px; }
  p { margin: 8px 0; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  strong { color: #1a1a2e; }
`;

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export async function markdownToPdf(title: string, markdown: string): Promise<Buffer> {
  const bodyHtml = await marked.parse(markdown);
  const html = wrapHtml(title, bodyHtml);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
