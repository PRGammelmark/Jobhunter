export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9æøåäöü\s-]/gi, '');
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

export async function findOrCreateCompany(companyName: string, extra?: CompanyCreateFields) {
  const { Company } = await import('../models');
  const normalizedName = normalizeCompanyName(companyName);

  if (!normalizedName) {
    return null;
  }

  let company = await Company.findOne({
    $or: [{ normalizedName }, { name: { $regex: new RegExp(`^${companyName.trim()}$`, 'i') } }],
  });

  if (!company) {
    company = await Company.create({
      name: companyName.trim(),
      normalizedName,
      ...extra,
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
    if (extra?.cvr) company.cvr = extra.cvr;
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
  companyId: string,
  applicationIds: string[],
  updates: { name?: string }
) {
  if (!updates.name) return;

  const { Application } = await import('../models');
  const { Types } = await import('mongoose');

  const orConditions: Record<string, unknown>[] = [{ companyId: new Types.ObjectId(companyId) }];
  if (applicationIds.length > 0) {
    orConditions.push({ _id: { $in: applicationIds.map((id) => new Types.ObjectId(id)) } });
  }

  await Application.updateMany({ $or: orConditions }, { $set: { 'job.companyName': updates.name } });
}

export async function touchCompany(companyId: string, applicationId?: string) {
  const { Company } = await import('../models');
  const update: Record<string, unknown> = { lastActivityAt: new Date() };
  if (applicationId) {
    await Company.findByIdAndUpdate(companyId, {
      $set: update,
      $addToSet: { applicationIds: applicationId },
    });
  } else {
    await Company.findByIdAndUpdate(companyId, { $set: update });
  }
}
