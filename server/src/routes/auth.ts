import { Router } from 'express';
import {
  clearAuthCookie,
  clearCsrfCookie,
  setAuthCookie,
} from '../auth/cookies';
import { ensureCsrfCookie } from '../auth/csrf';
import { noStore, requireAuth } from '../middleware/auth';
import * as authService from '../services/auth/authService';

const router = Router();

router.use(noStore);

router.get('/status', async (req, res) => {
  ensureCsrfCookie(req, res);
  const setupRequired = await authService.isSetupRequired();
  res.json({ setupRequired });
});

router.post('/setup', async (req, res) => {
  try {
    ensureCsrfCookie(req, res);
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    const result = await authService.setupPlatform({
      email: email || '',
      password: password || '',
      name: name || '',
    });
    setAuthCookie(res, result.token);
    res.status(201).json({ user: result.user });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({ error: err instanceof Error ? err.message : 'Setup fejlede' });
  }
});

router.post('/login', async (req, res) => {
  try {
    ensureCsrfCookie(req, res);
    const { email, password } = req.body as { email?: string; password?: string };
    const result = await authService.login({
      email: email || '',
      password: password || '',
    });
    setAuthCookie(res, result.token);
    res.json({ user: result.user });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({ error: err instanceof Error ? err.message : 'Login fejlede' });
  }
});

/** Public + idempotent — always clears cookies even if JWT is invalid/expired. */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  clearCsrfCookie(res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      _id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      platformRole: req.user!.platformRole,
      tenantId: req.user!.tenantId.toString(),
      status: 'active' as const,
    },
  });
});

export default router;
