import { Router } from 'express';
import multer from 'multer';
import { Recommendation } from '../models';
import { requireAuth } from '../middleware/auth';
import { storageService } from '../services/storage/storageService';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(requireAuth);

function stripClientAuthFields(body: Record<string, unknown>) {
  const { tenantId, platformRole, passwordHash, tokenVersion, status, ...rest } = body;
  return rest;
}

router.get('/', async (req, res) => {
  const items = await Recommendation.find({ tenantId: req.user!.tenantId }).sort({ name: 1 });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await Recommendation.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!item) return res.status(404).json({ error: 'Anbefaling ikke fundet' });
  res.json(item);
});

router.post('/', upload.single('file'), async (req, res) => {
  const tenantId = req.user!.tenantId;

  if (!req.file) {
    return res.status(400).json({ error: 'Fil er påkrævet' });
  }

  const stored = await storageService.upload(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    { tenantId, documentType: 'recommendations' }
  );

  const item = await Recommendation.create({
    tenantId,
    name: req.body.name || req.file.originalname.replace(/\.[^.]+$/, ''),
    from: req.body.from || undefined,
    notes: req.body.notes || undefined,
    originalFile: { ...stored, uploadedAt: new Date() },
  });

  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const allowed = stripClientAuthFields(req.body);
  const { name, from, notes } = allowed as { name?: string; from?: string; notes?: string };

  const item = await Recommendation.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    { $set: { ...(name != null && { name }), ...(from != null && { from }), ...(notes != null && { notes }) } },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Anbefaling ikke fundet' });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const item = await Recommendation.findOneAndDelete({ _id: req.params.id, tenantId });
  if (!item) return res.status(404).json({ error: 'Anbefaling ikke fundet' });

  if (item.originalFile?.fileId) {
    await storageService.deleteForTenant(item.originalFile.fileId.toString(), tenantId);
  } else if (item.originalFile?.storageKey) {
    await storageService.deleteByKey(item.originalFile.storageKey, tenantId);
  }

  res.json({ success: true });
});

export default router;
