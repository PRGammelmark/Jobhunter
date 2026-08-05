import { Router } from 'express';
import multer from 'multer';
import { CvTemplate } from '../models';
import { storageService } from '../services/storage/storageService';
import { extractTextFromBuffer } from '../services/cv/cvTextExtractor';
import { cvKnowledgeExtractionService } from '../services/ai/CvKnowledgeExtractionService';
import type { KnowledgeEntryDraft } from '@career-intelligence/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', async (_req, res) => {
  const templates = await CvTemplate.find().sort({ name: 1 });
  res.json(templates);
});

router.post('/extract-knowledge', async (_req, res) => {
  try {
    const result = await cvKnowledgeExtractionService.extractFromAllCvs();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Udtrækning fejlede';
    res.status(500).json({ error: message });
  }
});

router.post('/extract-knowledge/confirm', async (req, res) => {
  const entries = req.body?.entries as KnowledgeEntryDraft[] | undefined;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Ingen entries valgt' });
  }

  try {
    const ids = await cvKnowledgeExtractionService.saveCandidates(entries);
    res.status(201).json({ success: true, ids, count: ids.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kunne ikke gemme entries';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  const template = await CvTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'CV ikke fundet' });
  res.json(template);
});

router.post('/', upload.single('file'), async (req, res) => {
  const body = req.body;
  let originalFile;

  if (req.file) {
    const stored = await storageService.upload(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'cv-templates'
    );
    originalFile = { ...stored, uploadedAt: new Date() };

    let rawText = '';
    try {
      rawText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    } catch {
      rawText = '';
    }

    const template = await CvTemplate.create({
      name: body.name || req.file.originalname,
      tags: body.tags ? JSON.parse(body.tags) : [],
      originalFile,
      parsedContent: rawText ? { rawText, sections: { experience: [], education: [], skills: [] } } : undefined,
      isDefault: body.isDefault === 'true',
    });

    if (template.isDefault) {
      await CvTemplate.updateMany({ _id: { $ne: template._id } }, { isDefault: false });
    }

    return res.status(201).json(template);
  }

  const rawText = body.rawText || body.content || '';
  const template = await CvTemplate.create({
    name: body.name || 'Nyt CV',
    tags: typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags || [],
    parsedContent: rawText ? { rawText, sections: { experience: [], education: [], skills: [] } } : undefined,
    isDefault: body.isDefault === 'true' || body.isDefault === true,
  });

  res.status(201).json(template);
});

router.put('/:id', async (req, res) => {
  const template = await CvTemplate.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!template) return res.status(404).json({ error: 'CV ikke fundet' });

  if (req.body.isDefault) {
    await CvTemplate.updateMany({ _id: { $ne: template._id } }, { isDefault: false });
  }

  res.json(template);
});

router.delete('/:id', async (req, res) => {
  const template = await CvTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ error: 'CV ikke fundet' });

  if (template.originalFile?.storageKey) {
    await storageService.delete(template.originalFile.storageKey);
  }

  res.json({ success: true });
});

export default router;
