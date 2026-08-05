import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export type StorageType = 'local' | 'r2';

function buildR2Endpoint(accountId: string, override?: string): string {
  if (override) return override.replace(/\/$/, '');
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const defaultAllowedOrigins = [
  'https://jobhunter.dk',
  'http://localhost:5173',
];

const allowedOrigins = Array.from(
  new Set([
    ...defaultAllowedOrigins,
    clientUrl,
    ...(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ])
);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl,
  isProduction,
  allowedOrigins,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/career-intelligence',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-jwt-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  storage: {
    type: (process.env.STORAGE_TYPE || 'local') as StorageType,
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucket: process.env.R2_BUCKET_NAME || 'career-intelligence',
      endpoint: buildR2Endpoint(process.env.R2_ACCOUNT_ID || '', process.env.R2_ENDPOINT),
    },
  },
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  encryptionKey: process.env.ENCRYPTION_KEY || 'change-me-to-32-char-secret-key!!',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/settings/email/callback/google',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri:
      process.env.MICROSOFT_REDIRECT_URI ||
      'http://localhost:3001/api/settings/email/callback/microsoft',
  },
};

export function assertJwtConfig(): void {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET er påkrævet');
  }
}

export function assertR2Config(): void {
  const { r2 } = config.storage;
  const missing: string[] = [];
  if (!r2.accountId) missing.push('R2_ACCOUNT_ID');
  if (!r2.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!r2.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!r2.bucket) missing.push('R2_BUCKET_NAME');
  if (missing.length > 0) {
    throw new Error(`R2 storage kræver: ${missing.join(', ')}`);
  }
}
