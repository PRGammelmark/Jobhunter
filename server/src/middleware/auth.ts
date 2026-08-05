import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import type { PlatformRole } from '@career-intelligence/shared';
import { AUTH_COOKIE_NAME } from '../auth/cookies';
import { verifyAuthToken } from '../auth/jwt';
import { Tenant, User } from '../models';

export interface AuthUserContext {
  id: string;
  tenantId: Types.ObjectId;
  platformRole: PlatformRole;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Ikke autentificeret' });
      return;
    }

    const payload = verifyAuthToken(token);
    const user = await User.findOne({
      _id: payload.sub,
      status: 'active',
      tokenVersion: payload.tokenVersion,
    });
    if (!user) {
      res.status(401).json({ error: 'Ikke autentificeret' });
      return;
    }

    const tenant = await Tenant.findOne({ _id: user.tenantId, status: 'active' });
    if (!tenant) {
      res.status(401).json({ error: 'Tenant er ikke aktiv' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      tenantId: user.tenantId as Types.ObjectId,
      platformRole: user.platformRole as PlatformRole,
      email: user.email,
      name: user.name,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Ikke autentificeret' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.platformRole !== 'admin') {
    res.status(403).json({ error: 'Kræver administrator' });
    return;
  }
  next();
}

export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
}
