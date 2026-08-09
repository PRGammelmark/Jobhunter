import type { Types } from 'mongoose';

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9æøåäöü\s-]/gi, '');
}

/** Normalize to 8 digits, or undefined if not a valid CVR. */
export function normalizeCvr(cvr?: string | null): string | undefined {
  if (!cvr) return undefined;
  const digits = String(cvr).replace(/\D/g, '');
  return /^\d{8}$/.test(digits) ? digits : undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type CompanyCreateFields = {
  cvr?: string;
  description?: string;
  website?: string;
  linkedIn?: string;
  industry?: string;
  employeeCount?: string;
  location?: string;
};

export type CompanyCreateOptions = CompanyCreateFields & {
  tenantId: Types.ObjectId | string;
};

export async function findOrCreateCompany(companyName: string, options: CompanyCreateOptions) {
  const { tenantId, ...extra } = options;
  const { Company } = await import('../models');
  const normalizedName = normalizeCompanyName(companyName);
  const cvr = normalizeCvr(extra.cvr);

  if (!normalizedName) {
    return null;
  }

  // Prefer CVR match so the same legal entity is reused even when names differ.
  let company = cvr ? await Company.findOne({ tenantId, cvr }) : null;

  if (!company) {
    company = await Company.findOne({
      tenantId,
      $or: [
        { normalizedName },
        { name: { $regex: new RegExp(`^${escapeRegex(companyName.trim())}$`, 'i') } },
      ],
    });
  }

  if (!company) {
    const { cvr: _rawCvr, ...fields } = extra;
    company = await Company.create({
      tenantId,
      name: companyName.trim(),
      normalizedName,
      ...fields,
      ...(cvr ? { cvr } : {}),
      memory: {
        salaryNotes: [],
        contacts: [],
        interviewQuestions: [],
        generalNotes: [],
      },
      applicationIds: [],
      interviewIds: [],
      firstSeenAt: new Date(),
      lastActivityAt: new Date(),
    });
  } else {
    company.lastActivityAt = new Date();
    // Fill missing CVR; never overwrite an existing different CVR.
    if (cvr && !company.cvr) company.cvr = cvr;
    if (extra?.description) company.description = extra.description;
    if (extra?.website) company.website = extra.website;
    if (extra?.linkedIn) company.linkedIn = extra.linkedIn;
    if (extra?.industry) company.industry = extra.industry;
    if (extra?.employeeCount) company.employeeCount = extra.employeeCount;
    if (extra?.location) company.location = extra.location;
    await company.save();
  }

  return company;
}

export async function syncCompanyToApplications(
  tenantId: Types.ObjectId | string,
  companyId: string,
  applicationIds: string[],
  updates: { name?: string }
) {
  if (!updates.name) return;

  const { Application } = await import('../models');
  const { Types: MongooseTypes } = await import('mongoose');

  const orConditions: Record<string, unknown>[] = [{ companyId: new MongooseTypes.ObjectId(companyId) }];
  if (applicationIds.length > 0) {
    orConditions.push({ _id: { $in: applicationIds.map((id) => new MongooseTypes.ObjectId(id)) } });
  }

  await Application.updateMany(
    { tenantId, $or: orConditions },
    { $set: { 'job.companyName': updates.name } }
  );
}

export async function touchCompany(
  tenantId: Types.ObjectId | string,
  companyId: string,
  applicationId?: string
) {
  const { Company } = await import('../models');
  const update: Record<string, unknown> = { lastActivityAt: new Date() };
  if (applicationId) {
    await Company.findOneAndUpdate(
      { _id: companyId, tenantId },
      {
        $set: update,
        $addToSet: { applicationIds: applicationId },
      }
    );
  } else {
    await Company.findOneAndUpdate({ _id: companyId, tenantId }, { $set: update });
  }
}
