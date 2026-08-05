import { Router } from 'express';
import multer from 'multer';
import { ApplicationTemplate } from '../models';
import { storageService } from '../services/storage/storageService';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', async (_req, res) => {
  const templates = await ApplicationTemplate.find().sort({ name: 1 });
  res.json(templates);
});

router.get('/:id', async (req, res) => {
  const template = await ApplicationTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Ansøgningsskabelon ikke fundet' });
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
      'application-templates'
    );
    originalFile = { ...stored, uploadedAt: new Date() };

    let rawText = '';
    if (req.file.mimetype === 'text/plain') {
      rawText = req.file.buffer.toString('utf-8');
    }

    const template = await ApplicationTemplate.create({
      name: body.name || req.file.originalname,
      tags: body.tags ? JSON.parse(body.tags) : [],
      originalFile,
      parsedContent: rawText ? { rawText } : undefined,
      isDefault: body.isDefault === 'true',
    });

    if (template.isDefault) {
      await ApplicationTemplate.updateMany({ _id: { $ne: template._id } }, { isDefault: false });
    }

    return res.status(201).json(template);
  }

  const rawText = body.rawText || body.content || '';
  const template = await ApplicationTemplate.create({
    name: body.name || 'Ny ansøgningsskabelon',
    tags: typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags || [],
    parsedContent: rawText ? { rawText } : undefined,
    isDefault: body.isDefault === 'true' || body.isDefault === true,
  });

  if (template.isDefault) {
    await ApplicationTemplate.updateMany({ _id: { $ne: template._id } }, { isDefault: false });
  }

  res.status(201).json(template);
});

router.put('/:id', async (req, res) => {
  const template = await ApplicationTemplate.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!template) return res.status(404).json({ error: 'Ansøgningsskabelon ikke fundet' });

  if (req.body.isDefault) {
    await ApplicationTemplate.updateMany({ _id: { $ne: template._id } }, { isDefault: false });
  }

  res.json(template);
});

router.delete('/:id', async (req, res) => {
  const template = await ApplicationTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ error: 'Ansøgningsskabelon ikke fundet' });

  if (template.originalFile?.storageKey) {
    await storageService.delete(template.originalFile.storageKey);
  }

  res.json({ success: true });
});

export default router;
