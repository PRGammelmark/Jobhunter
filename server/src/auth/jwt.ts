import jwt from 'jsonwebtoken';
import type { PlatformRole } from '@career-intelligence/shared';
import { assertJwtConfig, config } from '../config';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  platformRole: PlatformRole;
  tokenVersion: number;
}

export function signAuthToken(payload: JwtPayload): string {
  assertJwtConfig();
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAuthToken(token: string): JwtPayload {
  assertJwtConfig();
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Ugyldigt token');
  }
  const { sub, tenantId, platformRole, tokenVersion } = decoded as JwtPayload;
  if (!sub || !tenantId || !platformRole || typeof tokenVersion !== 'number') {
    throw new Error('Ugyldigt token');
  }
  return { sub, tenantId, platformRole, tokenVersion };
}

export interface OAuthStatePayload {
  tenantId: string;
  userId: string;
  provider: 'google' | 'microsoft';
  nonce: string;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  assertJwtConfig();
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '10m' });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  assertJwtConfig();
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Ugyldig OAuth state');
  }
  const { tenantId, userId, provider, nonce } = decoded as OAuthStatePayload;
  if (!tenantId || !userId || !provider || !nonce) {
    throw new Error('Ugyldig OAuth state');
  }
  return { tenantId, userId, provider, nonce };
}
