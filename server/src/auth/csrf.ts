import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { CSRF_COOKIE_NAME, setCsrfCookie } from './cookies';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRequestOrigin(req: Request): string | null {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return config.allowedOrigins.includes(origin);
}

export function ensureCsrfCookie(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  if (existing) return existing;
  const token = randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  return token;
}

/** Double-submit CSRF + Origin allowlist for mutating browser requests. */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }

  // OAuth provider callbacks are protected by signed state + nonce
  if (req.path.includes('/email/callback/')) {
    next();
    return;
  }

  const origin = getRequestOrigin(req);
  if (!isOriginAllowed(origin)) {
    res.status(403).json({ error: 'Ugyldig origin' });
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'Ugyldig CSRF-token' });
    return;
  }

  next();
}
