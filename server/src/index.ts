import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { normalizeSkillConfidence } from '@career-intelligence/shared';
import { config, assertR2Config, assertJwtConfig } from './config';
import { KnowledgeEntry } from './models';
import { csrfProtection } from './auth/csrf';
import authRouter from './routes/auth';
import platformUsersRouter from './routes/platformUsers';
import settingsRouter from './routes/settings';
import companiesRouter from './routes/companies';
import knowledgeRouter from './routes/knowledge';
import cvTemplatesRouter from './routes/cvTemplates';
import applicationTemplatesRouter from './routes/applicationTemplates';
import recommendationsRouter from './routes/recommendations';
import applicationsRouter from './routes/applications';
import dashboardRouter from './routes/dashboard';

assertJwtConfig();

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (no Origin) allowed for health checks etc.
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(csrfProtection);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Jobhunter API' });
});

app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/platform/users', platformUsersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/cv-templates', cvTemplatesRouter);
app.use('/api/application-templates', applicationTemplatesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api', dashboardRouter);

async function start() {
  if (config.storage.type === 'r2') {
    assertR2Config();
    console.log(`Storage: Cloudflare R2 (${config.storage.r2.bucket})`);
  } else {
    console.log(`Storage: local (${config.storage.localPath})`);
  }

  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB');

  // Migrate legacy confidence (0–100 on all types) → 1–5 on skills only
  const legacy = await KnowledgeEntry.find({
    $or: [
      { type: { $ne: 'skill' }, confidence: { $exists: true } },
      { type: 'skill', confidence: { $gt: 5 } },
    ],
  });
  for (const entry of legacy) {
    if (entry.type === 'skill') {
      await KnowledgeEntry.updateOne(
        { _id: entry._id },
        { $set: { confidence: normalizeSkillConfidence(entry.confidence) } }
      );
    } else {
      await KnowledgeEntry.updateOne(
        { _id: entry._id },
        { $unset: { confidence: 1, confidenceLabel: 1 } }
      );
    }
  }
  if (legacy.length > 0) {
    console.log(`Migrated confidence on ${legacy.length} knowledge entries`);
  }

  const server = app.listen(config.port, () => {
    console.log(`Jobhunter API running on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
