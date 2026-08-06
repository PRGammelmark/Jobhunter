import { Router } from 'express';
import { Types } from 'mongoose';
import { Application, DocumentSet, Company, Recommendation } from '../models';
import { requireAuth } from '../middleware/auth';
import { scrapeJobUrl, parseManualJobText } from '../services/scraper/jobScraper';
import { isWeakCompanyName } from '../services/scraper/companyNameResolver';
import { findOrCreateCompany, touchCompany } from '../services/companyService';
import { jobAnalysisService } from '../services/ai/JobAnalysisService';
import { jobExtractionService } from '../services/ai/JobExtractionService';
import { coverLetterGenerator } from '../services/ai/CoverLetterGenerator';
import { interviewPreparationService } from '../services/ai/InterviewPreparationService';
import { aiAnswerKnowledgeService } from '../services/ai/AiAnswerKnowledgeService';
import { exportDocumentSetPdfs } from '../services/pdf/documentExportService';
import { sendEmail } from '../services/mail/mailService';
import { storageService } from '../services/storage/storageService';
import type { ApplicationStatus, InterviewContext } from '@career-intelligence/shared';

const router = Router();

router.use(requireAuth);

function stripClientAuthFields(body: Record<string, unknown>) {
  const { tenantId, platformRole, passwordHash, tokenVersion, status, ...rest } = body;
  return rest;
}

router.get('/', async (req, res) => {
  const applications = await Application.find({ tenantId: req.user!.tenantId }).sort({ updatedAt: -1 });
  res.json(applications);
});

router.get('/:id', async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    tenantId: req.user!.tenantId,
  });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });
  res.json(application);
});

router.post('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { url, manualText, companyName, title } = req.body;

  try {
    let jobData;
    if (url) {
      const scraped = await scrapeJobUrl(url, tenantId);
      const extracted = await jobExtractionService.extract({
        title: scraped.title,
        companyName: scraped.companyName,
        location: scraped.location,
        rawText: scraped.description,
        keyRequirements: scraped.keyRequirements,
        keyResponsibilities: scraped.keyResponsibilities,
        source: scraped.source,
        url,
        rawHtml: scraped.rawHtml,
        tenantId,
      });
      jobData = {
        url,
        source: scraped.source,
        scrapedAt: new Date(),
        archivedHtml: scraped.archivedHtml,
        title: extracted.title,
        companyName: extracted.companyName,
        location: extracted.location,
        summary: extracted.summary,
        keyRequirements: extracted.keyRequirements,
        keyResponsibilities: extracted.keyResponsibilities,
        employmentType: extracted.employmentType,
        salary: extracted.salary,
        contactEmail: extracted.contactEmail,
        language: extracted.language,
        rawText: extracted.description,
      };
    } else if (manualText) {
      const manual = parseManualJobText(manualText, companyName, title);
      const extracted = await jobExtractionService.extract({
        title: manual.title,
        companyName: manual.companyName,
        rawText: manual.description,
        source: 'manual',
        tenantId,
      });
      jobData = {
        url: '',
        source: 'manual',
        title: extracted.title,
        companyName: extracted.companyName,
        location: extracted.location,
        summary: extracted.summary,
        keyRequirements: extracted.keyRequirements,
        keyResponsibilities: extracted.keyResponsibilities,
        employmentType: extracted.employmentType,
        salary: extracted.salary,
        contactEmail: extracted.contactEmail,
        language: extracted.language,
        rawText: extracted.description,
      };
    } else {
      return res.status(400).json({ error: 'Angiv url eller manualText' });
    }

    const company = !isWeakCompanyName(jobData.companyName)
      ? await findOrCreateCompany(jobData.companyName, { tenantId })
      : null;

    const application = await Application.create({
      tenantId,
      companyId: company?._id,
      status: 'not_started',
      isWishlisted: false,
      statusHistory: [{ status: 'not_started', changedAt: new Date() }],
      job: jobData,
      hideGenerateCoverLetter: false,
    });

    if (company) {
      await touchCompany(tenantId, company._id.toString(), application._id.toString());
    }

    // Auto-run analysis + first cover letter draft on create
    try {
      const jobText = application.job.rawText || application.job.summary || '';
      const analysis = await jobAnalysisService.analyze(
        application._id.toString(),
        jobText,
        application.job.companyName,
        tenantId
      );
      application.aiAnalysis = analysis as never;
      await application.save();

      await coverLetterGenerator.generate(application._id.toString(), { tenantId });
      await Application.findOneAndUpdate(
        { _id: application._id, tenantId },
        { hideGenerateCoverLetter: true }
      );
    } catch (autoErr) {
      console.error('Auto-analyse/generering fejlede ved oprettelse:', autoErr);
    }

    const refreshed = await Application.findOne({ _id: application._id, tenantId });
    res.status(201).json(refreshed || application);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Fejl ved oprettelse' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { status, note } = req.body as { status: ApplicationStatus; note?: string };
  const application = await Application.findOne({ _id: req.params.id, tenantId });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  application.status = status;
  application.statusHistory.push({ status, changedAt: new Date(), note });

  if (status === 'sent') application.sentAt = new Date();
  if (status === 'interview') application.interviewAt = new Date();

  await application.save();

  if (application.companyId) {
    await touchCompany(tenantId, application.companyId.toString());
  }

  res.json(application);
});

router.patch('/:id/wishlist', async (req, res) => {
  const { isWishlisted } = req.body as { isWishlisted: boolean };
  if (typeof isWishlisted !== 'boolean') {
    return res.status(400).json({ error: 'isWishlisted skal være en boolean' });
  }

  const application = await Application.findOne({
    _id: req.params.id,
    tenantId: req.user!.tenantId,
  });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  application.isWishlisted = isWishlisted;
  await application.save();
  res.json(application);
});

router.post('/:id/notes', async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    tenantId: req.user!.tenantId,
  });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  application.notes.push({
    _id: new Types.ObjectId(),
    text: req.body.text,
    createdAt: new Date(),
  });
  await application.save();
  res.json(application);
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const application = await Application.findOne({ _id: req.params.id, tenantId });
    if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

    const jobText = application.job.rawText || application.job.summary || '';
    const analysis = await jobAnalysisService.analyze(
      req.params.id,
      jobText,
      application.job.companyName,
      tenantId
    );

    application.aiAnalysis = analysis as never;
    await application.save();

    res.json(application);
  } catch (err) {
    console.error('Analyse fejlede:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Fejl ved analyse' });
  }
});

router.post('/:id/answer-questions', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const application = await Application.findOne({ _id: req.params.id, tenantId });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  const { answers } = req.body as {
    answers: Array<{ question: string; answer: string; saveToKnowledge?: boolean }>;
  };
  const analysis = application.aiAnalysis as {
    aiQuestions?: Array<{
      question: string;
      context?: string;
      answered?: boolean;
      answer?: string;
      knowledgeEntryId?: string;
    }>;
  };

  if (analysis?.aiQuestions) {
    for (const ans of answers) {
      const q = analysis.aiQuestions.find((item) => item.question === ans.question);
      if (!q) continue;

      q.answered = true;
      q.answer = ans.answer;

      if (ans.saveToKnowledge && !q.knowledgeEntryId) {
        try {
          q.knowledgeEntryId = await aiAnswerKnowledgeService.createFromAnswer(
            {
              question: ans.question,
              answer: ans.answer,
              context: q.context,
              companyName: application.job.companyName,
              jobTitle: application.job.title,
            },
            tenantId
          );
        } catch (err) {
          console.error('Kunne ikke gemme AI-svar i Knowledge Base:', err);
        }
      }
    }
  }

  application.aiAnalysis = analysis as never;
  await application.save();
  res.json(application);
});

router.post('/:id/generate', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { cvTemplateId, applicationTemplateId } = req.body as {
      cvTemplateId?: string;
      applicationTemplateId?: string;
    };
    const result = await coverLetterGenerator.generate(req.params.id, {
      tenantId,
      cvTemplateId,
      applicationTemplateId,
    });
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { hideGenerateCoverLetter: true },
      { new: true }
    );
    const docSet = await DocumentSet.findOne({ _id: result.documentSetId, tenantId });
    res.json({ application, documentSet: docSet });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Generering fejlede' });
  }
});

router.post('/:id/revise', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { instruction, documentSetId } = req.body as {
      instruction?: string;
      documentSetId?: string;
    };
    if (!instruction?.trim()) {
      return res.status(400).json({ error: 'Angiv ønskede opdateringer' });
    }
    const result = await coverLetterGenerator.revise(req.params.id, {
      tenantId,
      instruction: instruction.trim(),
      documentSetId,
    });
    const application = await Application.findOne({ _id: req.params.id, tenantId });
    const docSet = await DocumentSet.findOne({ _id: result.documentSetId, tenantId });
    res.json({ application, documentSet: docSet });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Opdatering fejlede' });
  }
});

const SENT_OR_LATER: ApplicationStatus[] = ['sent', 'interview', 'rejected', 'offer', 'hired'];

function isSent(application: { status: string; sentAt?: Date | null }) {
  return !!application.sentAt || SENT_OR_LATER.includes(application.status as ApplicationStatus);
}

router.get('/:id/documents', async (req, res) => {
  const docs = await DocumentSet.find({
    tenantId: req.user!.tenantId,
    applicationId: req.params.id,
  }).sort({ version: -1 });
  res.json(docs);
});

router.post('/:id/documents', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const application = await Application.findOne({ _id: req.params.id, tenantId });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  const coverContent = (req.body.coverLetter?.content ?? req.body.coverLetterContent ?? '').trim();
  if (!coverContent) {
    return res.status(400).json({ error: 'Ansøgningstekst er påkrævet' });
  }

  const basedOnId = req.body.basedOnDocumentSetId as string | undefined;
  const baseDoc = basedOnId
    ? await DocumentSet.findOne({ _id: basedOnId, tenantId, applicationId: req.params.id })
    : application.activeDocumentSetId
      ? await DocumentSet.findOne({ _id: application.activeDocumentSetId, tenantId })
      : await DocumentSet.findOne({ tenantId, applicationId: req.params.id }).sort({ version: -1 });

  const lastVersion = await DocumentSet.findOne({ tenantId, applicationId: req.params.id }).sort({
    version: -1,
  });
  const version = (lastVersion?.version || 0) + 1;

  const docSet = await DocumentSet.create({
    tenantId,
    applicationId: req.params.id,
    version,
    source: 'manual_edit',
    cv: {
      content: req.body.cv?.content ?? baseDoc?.cv?.content ?? '',
      basedOnTemplateId: req.body.cv?.basedOnTemplateId ?? baseDoc?.cv?.basedOnTemplateId,
      knowledgeEntriesUsed: req.body.cv?.knowledgeEntriesUsed ?? baseDoc?.cv?.knowledgeEntriesUsed ?? [],
    },
    coverLetter: {
      content: coverContent,
      basedOnTemplateId:
        req.body.coverLetter?.basedOnTemplateId ?? baseDoc?.coverLetter?.basedOnTemplateId,
    },
    label: req.body.label || `Version ${version}`,
  });

  application.activeDocumentSetId = docSet._id;
  await application.save();
  res.status(201).json({ application, documentSet: docSet });
});

router.delete('/:id/documents/:documentSetId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const application = await Application.findOne({ _id: req.params.id, tenantId });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  if (isSent(application)) {
    return res.status(400).json({ error: 'Sendte ansøgninger kan ikke slettes' });
  }

  const docSet = await DocumentSet.findOne({
    _id: req.params.documentSetId,
    tenantId,
    applicationId: req.params.id,
  });
  if (!docSet) return res.status(404).json({ error: 'Dokument ikke fundet' });

  const pdfKeys = [docSet.cv.pdfFile?.storageKey, docSet.coverLetter.pdfFile?.storageKey].filter(
    (key): key is string => !!key
  );
  await Promise.all(pdfKeys.map((key) => storageService.deleteByKey(key, tenantId)));
  await docSet.deleteOne();

  const remaining = await DocumentSet.countDocuments({ tenantId, applicationId: req.params.id });

  if (remaining === 0) {
    const refreshed = await Application.findOneAndUpdate(
      { _id: application._id, tenantId },
      { $unset: { activeDocumentSetId: 1 }, $set: { hideGenerateCoverLetter: false } },
      { new: true }
    );
    return res.json({ success: true, application: refreshed || application });
  }

  if (application.activeDocumentSetId?.toString() === req.params.documentSetId) {
    const latest = await DocumentSet.findOne({ tenantId, applicationId: req.params.id }).sort({
      version: -1,
    });
    if (latest) {
      application.activeDocumentSetId = latest._id;
      await application.save();
    }
  }

  const refreshed = await Application.findOne({ _id: application._id, tenantId });
  res.json({ success: true, application: refreshed || application });
});

router.post('/:id/export-pdf', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await exportDocumentSetPdfs(req.params.id, tenantId, req.body.documentSetId);
    const docSet = await DocumentSet.findOne({ _id: result.documentSetId, tenantId });
    res.json({ ...result, documentSet: docSet });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'PDF-export fejlede' });
  }
});

router.post('/:id/send-email', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const application = await Application.findOne({ _id: req.params.id, tenantId });
    if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

    const { to, subject, body, documentSetId, recommendationIds } = req.body as {
      to: string;
      subject: string;
      body: string;
      documentSetId?: string;
      recommendationIds?: string[];
    };

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject og body er påkrævet' });
    }

    await exportDocumentSetPdfs(req.params.id, tenantId, documentSetId);

    const docSetId = documentSetId || application.activeDocumentSetId?.toString();
    const docSet = await DocumentSet.findOne({ _id: docSetId, tenantId });
    if (!docSet?.cv.pdfFile || !docSet.coverLetter.pdfFile) {
      return res.status(400).json({ error: 'PDF-filer mangler — kør export først' });
    }

    const cvBuffer = await storageService.downloadByKey(docSet.cv.pdfFile.storageKey, tenantId);
    const coverBuffer = await storageService.downloadByKey(
      docSet.coverLetter.pdfFile.storageKey,
      tenantId
    );

    const attachments = [
      { filename: docSet.cv.pdfFile.fileName, content: cvBuffer, mimeType: 'application/pdf' },
      { filename: docSet.coverLetter.pdfFile.fileName, content: coverBuffer, mimeType: 'application/pdf' },
    ];

    const selectedIds = Array.isArray(recommendationIds)
      ? recommendationIds.filter((id) => typeof id === 'string' && id.trim())
      : [];

    if (selectedIds.length > 0) {
      const recommendations = await Recommendation.find({
        _id: { $in: selectedIds },
        tenantId,
      });

      if (recommendations.length !== selectedIds.length) {
        return res.status(400).json({ error: 'En eller flere anbefalinger blev ikke fundet' });
      }

      for (const rec of recommendations) {
        if (!rec.originalFile?.storageKey) {
          return res.status(400).json({ error: `Anbefalingen "${rec.name}" mangler fil` });
        }
        const buffer = await storageService.downloadByKey(rec.originalFile.storageKey, tenantId);
        attachments.push({
          filename: rec.originalFile.fileName || `${rec.name}.pdf`,
          content: buffer,
          mimeType: rec.originalFile.mimeType || 'application/octet-stream',
        });
      }
    }

    const { messageId, provider } = await sendEmail(to, subject, body, attachments, tenantId);

    application.emailDraft = { to, subject, body, lastSentAt: new Date().toISOString(), sentMessageId: messageId };
    application.status = 'sent';
    application.sentAt = new Date();
    application.statusHistory.push({ status: 'sent', changedAt: new Date(), note: `Sendt via ${provider}` });
    await application.save();

    res.json({ success: true, messageId, provider, application });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Email-afsendelse fejlede' });
  }
});

router.post('/:id/interview-prep', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const context = req.body.context as InterviewContext;
    const prep = await interviewPreparationService.generate(req.params.id, context, tenantId);
    const application = await Application.findOne({ _id: req.params.id, tenantId });
    res.json({ interviewPrep: prep, application });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Interview-prep fejlede' });
  }
});

router.put('/:id', async (req, res) => {
  const application = await Application.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user!.tenantId },
    { $set: stripClientAuthFields(req.body) },
    { new: true }
  );
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });
  res.json(application);
});

router.delete('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const application = await Application.findOne({ _id: req.params.id, tenantId });
  if (!application) return res.status(404).json({ error: 'Ansøgning ikke fundet' });

  await DocumentSet.deleteMany({ tenantId, applicationId: req.params.id });
  await Application.findOneAndDelete({ _id: req.params.id, tenantId });

  if (application.companyId) {
    await Company.findOneAndUpdate(
      { _id: application.companyId, tenantId },
      {
        $pull: { applicationIds: application._id },
        $set: { lastActivityAt: new Date() },
      }
    );
  }

  res.json({ success: true });
});

export default router;
