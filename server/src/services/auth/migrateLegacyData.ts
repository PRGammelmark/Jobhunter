import type { ClientSession, Types } from 'mongoose';
import {
  Application,
  ApplicationTemplate,
  Company,
  CvTemplate,
  DocumentSet,
  KnowledgeEntry,
  Migration,
  Settings,
  StoredFile,
} from '../../models';

export const MIGRATION_NAME = 'add-tenant-id-v1';

const COLLECTIONS = [
  Company,
  KnowledgeEntry,
  Application,
  CvTemplate,
  ApplicationTemplate,
  DocumentSet,
  StoredFile,
] as const;

export async function migrateLegacyData(options: {
  tenantId: Types.ObjectId;
  session: ClientSession;
}): Promise<void> {
  const { tenantId, session } = options;

  const existing = await Migration.findOne({ name: MIGRATION_NAME }).session(session);
  if (existing) {
    return;
  }

  for (const Model of COLLECTIONS) {
    await Model.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId } },
      { session }
    );
  }

  // Legacy Settings used string _id 'app' — query via collection API
  const legacySettings = await Settings.collection.findOne({ _id: 'app' as unknown as Types.ObjectId }, { session });
  const tenantSettings = await Settings.findOne({ tenantId }).session(session);

  if (legacySettings && !tenantSettings) {
    const { _id: _legacyId, ...rest } = legacySettings as Record<string, unknown> & { _id: unknown };
    await Settings.create([{ ...rest, tenantId }], { session });
    await Settings.collection.deleteOne({ _id: 'app' as unknown as Types.ObjectId }, { session });
  } else if (!tenantSettings) {
    await Settings.create(
      [
        {
          tenantId,
          profile: { name: '', email: '' },
          aboutMe: '',
          emailIntegration: { provider: null },
          preferences: { defaultLanguage: 'da', aiModel: 'gpt-4o-mini' },
        },
      ],
      { session }
    );
  } else if (legacySettings) {
    await Settings.collection.deleteOne({ _id: 'app' as unknown as Types.ObjectId }, { session });
  }

  await Migration.create(
    [
      {
        name: MIGRATION_NAME,
        completedAt: new Date(),
        tenantId,
      },
    ],
    { session }
  );
}

/** Create default Settings for a new tenant (no legacy). */
export async function createDefaultSettings(options: {
  tenantId: Types.ObjectId;
  session: ClientSession;
  profileEmail?: string;
  profileName?: string;
}): Promise<void> {
  const { tenantId, session, profileEmail = '', profileName = '' } = options;
  await Settings.create(
    [
      {
        tenantId,
        profile: { name: profileName, email: profileEmail },
        aboutMe: '',
        emailIntegration: { provider: null },
        preferences: { defaultLanguage: 'da', aiModel: 'gpt-4o-mini' },
      },
    ],
    { session }
  );
}
