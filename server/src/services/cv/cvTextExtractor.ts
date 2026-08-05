import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';
const TEXT_MIME = 'text/plain';

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === TEXT_MIME) {
    return buffer.toString('utf-8').trim();
  }

  if (mimeType === PDF_MIME) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return (result.text || '').trim();
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === DOCX_MIME || mimeType === DOC_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  return '';
}
