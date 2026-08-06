import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useLocale } from '../i18n';

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

const HEADING_RE = /^#{1,6}\s+(.+)$/;
const UL_RE = /^[-*•]\s+(.+)$/;
const OL_RE = /^\d+[.)]\s+(.+)$/;

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered: boolean | null = null;

  const flushParagraph = () => {
    const joined = paragraphLines.join('\n').trim();
    if (joined) blocks.push({ type: 'paragraph', text: joined });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length && listOrdered !== null) {
      blocks.push({ type: 'list', ordered: listOrdered, items: listItems });
    }
    listItems = [];
    listOrdered = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const heading = trimmed.match(HEADING_RE);
    if (heading) {
      flushList();
      flushParagraph();
      blocks.push({ type: 'heading', text: heading[1].trim() });
      continue;
    }

    const ul = trimmed.match(UL_RE);
    if (ul) {
      flushParagraph();
      if (listOrdered !== false) {
        flushList();
        listOrdered = false;
      }
      listItems.push(ul[1].trim());
      continue;
    }

    const ol = trimmed.match(OL_RE);
    if (ol) {
      flushParagraph();
      if (listOrdered !== true) {
        flushList();
        listOrdered = true;
      }
      listItems.push(ol[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushList();
  flushParagraph();
  return blocks;
}

/** Render inline **bold** and *italic* markers safely as React nodes. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <Box component="strong" key={key++} sx={{ fontWeight: 700 }}>
          {token.slice(2, -2)}
        </Box>
      );
    } else {
      nodes.push(
        <Box component="em" key={key++}>
          {token.slice(1, -1)}
        </Box>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

interface FormattedJobTextProps {
  text: string;
}

/**
 * Renders job posting text with preserved headings, lists and paragraphs.
 * Expects lightweight markdown from the scraper/AI pipeline; falls back gracefully for plain text.
 */
export function FormattedJobText({ text }: FormattedJobTextProps) {
  const { t } = useLocale();
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        {t('formattedJobText.empty')}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        maxWidth: '100%',
        minWidth: 0,
        overflowWrap: 'anywhere',
        '& ul, & ol': {
          m: 0,
          pl: 2.5,
        },
        '& li': {
          mb: 0.5,
        },
        '& li:last-child': {
          mb: 0,
        },
      }}
    >
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <Typography
              key={i}
              component="h3"
              sx={{
                fontWeight: 700,
                fontSize: '1.125rem',
                lineHeight: 1.35,
                mt: i === 0 ? 0 : 0.5,
              }}
            >
              {renderInline(block.text)}
            </Typography>
          );
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <Box
              key={i}
              component={ListTag}
              sx={{
                typography: 'body1',
                lineHeight: 1.6,
              }}
            >
              {block.items.map((item, j) => (
                <Box component="li" key={j}>
                  {renderInline(item)}
                </Box>
              ))}
            </Box>
          );
        }

        return (
          <Typography
            key={i}
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65 }}
          >
            {renderInline(block.text)}
          </Typography>
        );
      })}
    </Box>
  );
}
