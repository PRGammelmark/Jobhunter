import type { Types } from 'mongoose';
import { Types as MongooseTypes } from 'mongoose';
import { Application, DocumentSet } from '../../models';
import { storageService } from '../storage/storageService';
import { markdownToPdf } from './pdfService';

export async function exportDocumentSetPdfs(
  applicationId: string,
  tenantId: Types.ObjectId | string,
  documentSetId?: string
): Promise<{ documentSetId: string; cvUrl: string; coverLetterUrl: string }> {
  const application = await Application.findOne({ _id: applicationId, tenantId });
  if (!application) throw new Error('Ansøgning ikke fundet');

  const docSetId = documentSetId || application.activeDocumentSetId?.toString();
  if (!docSetId) throw new Error('Ingen dokumentversion at eksportere');

  const docSet = await DocumentSet.findOne({ _id: docSetId, tenantId, applicationId });
  if (!docSet) throw new Error('Dokumentversion ikke fundet');

  const company = application.job.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const version = docSet.version;

  const cvPdf = await markdownToPdf(
    `CV — ${application.job.title}`,
    docSet.cv.content || `# CV\n\n${application.job.title}`
  );
  const cvStored = await storageService.upload(
    cvPdf,
    `CV_${company}_v${version}.pdf`,
    'application/pdf',
    { tenantId, documentType: `applications/${applicationId}` }
  );

  const coverPdf = await markdownToPdf(
    `Ansøgning — ${application.job.title}`,
    docSet.coverLetter.content || `# Ansøgning\n\n${application.job.companyName}`
  );
  const coverStored = await storageService.upload(
    coverPdf,
    `Ansogning_${company}_v${version}.pdf`,
    'application/pdf',
    { tenantId, documentType: `applications/${applicationId}` }
  );

  docSet.cv.pdfFile = {
    fileId: new MongooseTypes.ObjectId(cvStored.fileId),
    storageKey: cvStored.storageKey,
    fileName: cvStored.fileName,
  };
  docSet.coverLetter.pdfFile = {
    fileId: new MongooseTypes.ObjectId(coverStored.fileId),
    storageKey: coverStored.storageKey,
    fileName: coverStored.fileName,
  };
  await docSet.save();

  return {
    documentSetId: docSet._id.toString(),
    cvUrl: storageService.getDownloadUrl(cvStored.fileId),
    coverLetterUrl: storageService.getDownloadUrl(coverStored.fileId),
  };
}
