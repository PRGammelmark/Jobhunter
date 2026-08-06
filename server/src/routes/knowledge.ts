import { Router } from 'express';
import { normalizeSkillConfidence } from '@career-intelligence/shared';
import { KnowledgeEntry } from '../models';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

function sanitizeKnowledgeBody(body: Record<string, unknown>) {
  const { tenantId, platformRole, passwordHash, tokenVersion, status, ...data } = body;
  if (data.type === 'skill') {
    data.confidence = normalizeSkillConfidence(data.confidence);
  } else {
    delete data.confidence;
    delete data.confidenceLabel;
  }
  return data;
}

router.get('/', async (req, res) => {
  const entries = await KnowledgeEntry.find({ tenantId: req.user!.tenantId }).sort({ title: 1 });
  res.json(entries);
});

router.get('/:id', async (req, res) => {
  const entry = await KnowledgeEntry.findOne({
    _id: req.params.id,
    tenantId: req.user!.tenantId,
  }).populate('relatedEntryIds');
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  res.json(entry);
});

router.post('/', async (req, res) => {
  const entry = await KnowledgeEntry.create({
    ...sanitizeKnowledgeBody(req.body),
    tenantId: req.user!.tenantId,
  });
  res.status(201).json(entry);
});

router.put('/:id', async (req, res) => {
  const data = sanitizeKnowledgeBody(req.body);
  const update: Record<string, unknown> = { $set: data };
  if (data.type !== 'skill') {
    update.$unset = { confidence: 1, confidenceLabel: 1 };
    delete (update.$set as Record<string, unknown>).confidence;
    delete (update.$set as Record<string, unknown>).confidenceLabel;
  }
  const entry = await KnowledgeEntry.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user!.tenantId },
    update,
    { new: true }
  );
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  res.json(entry);
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const entry = await KnowledgeEntry.findOneAndDelete({
    _id: req.params.id,
    tenantId,
  });
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  await KnowledgeEntry.updateMany(
    { tenantId, relatedEntryIds: entry._id },
    { $pull: { relatedEntryIds: entry._id } }
  );
  res.json({ success: true });
});

export default router;
