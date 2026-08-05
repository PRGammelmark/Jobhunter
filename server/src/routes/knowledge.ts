import { Router } from 'express';
import { normalizeSkillConfidence } from '@career-intelligence/shared';
import { KnowledgeEntry } from '../models';

const router = Router();

function sanitizeKnowledgeBody(body: Record<string, unknown>) {
  const data = { ...body };
  if (data.type === 'skill') {
    data.confidence = normalizeSkillConfidence(data.confidence);
  } else {
    delete data.confidence;
    delete data.confidenceLabel;
  }
  return data;
}

router.get('/', async (_req, res) => {
  const entries = await KnowledgeEntry.find().sort({ title: 1 });
  res.json(entries);
});

router.get('/:id', async (req, res) => {
  const entry = await KnowledgeEntry.findById(req.params.id).populate('relatedEntryIds');
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  res.json(entry);
});

router.post('/', async (req, res) => {
  const entry = await KnowledgeEntry.create(sanitizeKnowledgeBody(req.body));
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
  const entry = await KnowledgeEntry.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  res.json(entry);
});

router.delete('/:id', async (req, res) => {
  const entry = await KnowledgeEntry.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry ikke fundet' });
  res.json({ success: true });
});

export default router;
