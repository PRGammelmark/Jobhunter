import { Router } from 'express';
import { Company, Application, DocumentSet } from '../models';
import { requireAuth } from '../middleware/auth';
import { normalizeCompanyName, syncCompanyToApplications } from '../services/companyService';

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'cvr',
  'description',
  'website',
  'linkedIn',
  'industry',
  'employeeCount',
  'location',
] as const;

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const companies = await Company.find({ tenantId: req.user!.tenantId }).sort({ lastActivityAt: -1 });
  res.json(companies);
});

router.post('/research', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name : undefined;
  const cvr = typeof req.body.cvr === 'string' ? req.body.cvr : undefined;

  try {
    const { companyResearchService } = await import('../services/ai/CompanyResearchService');
    const result = await companyResearchService.research(name, cvr, req.user!.tenantId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research fejlede';
    res.status(400).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  const company = await Company.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });
  res.json(company);
});

router.get('/:id/applications', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const company = await Company.findOne({ _id: req.params.id, tenantId });
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });
  const applications = await Application.find({
    tenantId,
    $or: [{ companyId: company._id }, { _id: { $in: company.applicationIds } }],
  }).sort({ updatedAt: -1 });
  res.json(applications);
});

router.post('/', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Virksomhedsnavn er påkrævet' });
  }

  const { findOrCreateCompany } = await import('../services/companyService');
  const fields = {
    tenantId: req.user!.tenantId,
    cvr: req.body.cvr,
    description: req.body.description,
    website: req.body.website,
    linkedIn: req.body.linkedIn,
    industry: req.body.industry,
    employeeCount: req.body.employeeCount,
    location: req.body.location,
  };

  const company = await findOrCreateCompany(name, fields);
  if (!company) {
    return res.status(400).json({ error: 'Kunne ikke oprette virksomhed' });
  }

  res.status(201).json(company);
});

router.put('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (typeof updates.name === 'string') {
    const trimmedName = updates.name.trim();
    updates.name = trimmedName;
    updates.normalizedName = normalizeCompanyName(trimmedName);
  }

  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    { $set: updates },
    { new: true }
  );
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });

  if (typeof updates.name === 'string') {
    await syncCompanyToApplications(
      tenantId,
      company._id.toString(),
      company.applicationIds.map((id) => id.toString()),
      { name: updates.name }
    );
  }

  res.json(company);
});

router.post('/:id/research', async (req, res) => {
  const company = await Company.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });

  const name = typeof req.body.name === 'string' ? req.body.name : company.name;
  const cvr = typeof req.body.cvr === 'string' ? req.body.cvr : company.cvr;

  try {
    const { companyResearchService } = await import('../services/ai/CompanyResearchService');
    const result = await companyResearchService.research(name, cvr, req.user!.tenantId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research fejlede';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/notes', async (req, res) => {
  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user!.tenantId },
    { $push: { 'memory.generalNotes': req.body.text }, $set: { lastActivityAt: new Date() } },
    { new: true }
  );
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });
  res.json(company);
});

router.delete('/:id/notes/:noteIndex', async (req, res) => {
  const noteIndex = Number.parseInt(req.params.noteIndex, 10);
  if (!Number.isInteger(noteIndex) || noteIndex < 0) {
    return res.status(400).json({ error: 'Ugyldigt note-index' });
  }

  const company = await Company.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });
  if (noteIndex >= company.memory.generalNotes.length) {
    return res.status(404).json({ error: 'Note ikke fundet' });
  }

  company.memory.generalNotes.splice(noteIndex, 1);
  company.lastActivityAt = new Date();
  await company.save();
  res.json(company);
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const company = await Company.findOne({ _id: req.params.id, tenantId });
  if (!company) return res.status(404).json({ error: 'Virksomhed ikke fundet' });

  const linkedApplications = await Application.find({
    tenantId,
    $or: [{ companyId: company._id }, { _id: { $in: company.applicationIds } }],
  }).select('_id');

  const applicationIds = linkedApplications.map((app) => app._id);
  if (applicationIds.length > 0) {
    await DocumentSet.deleteMany({ tenantId, applicationId: { $in: applicationIds } });
    await Application.deleteMany({ tenantId, _id: { $in: applicationIds } });
  }

  await Company.findOneAndDelete({ _id: req.params.id, tenantId });
  res.json({ success: true });
});

export default router;
