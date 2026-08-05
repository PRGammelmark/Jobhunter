/**
 * Idempotent tenant migration CLI.
 * Usage: npm run migrate:tenant -- <tenantId>
 */
import mongoose, { Types } from 'mongoose';
import { config } from '../config';
import { migrateLegacyData, MIGRATION_NAME } from '../services/auth/migrateLegacyData';
import { Migration } from '../models';

async function main() {
  const tenantIdArg = process.argv[2];
  if (!tenantIdArg || !Types.ObjectId.isValid(tenantIdArg)) {
    console.error('Usage: npm run migrate:tenant -- <tenantId>');
    process.exit(1);
  }

  await mongoose.connect(config.mongodbUri);
  const tenantId = new Types.ObjectId(tenantIdArg);

  const existing = await Migration.findOne({ name: MIGRATION_NAME });
  if (existing) {
    console.log(`Migration ${MIGRATION_NAME} already completed at ${existing.completedAt.toISOString()}`);
    await mongoose.disconnect();
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await migrateLegacyData({ tenantId, session });
    });
    console.log(`Migration ${MIGRATION_NAME} completed for tenant ${tenantId}`);
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
