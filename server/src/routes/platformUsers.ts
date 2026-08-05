import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth';
import * as authService from '../services/auth/authService';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res) => {
  const users = await authService.listPlatformUsers();
  res.json(users);
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    const user = await authService.createPlatformUser({
      email: email || '',
      password: password || '',
      name: name || '',
    });
    res.status(201).json(user);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({ error: err instanceof Error ? err.message : 'Kunne ikke oprette bruger' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await authService.softDeletePlatformUser({
      targetUserId: req.params.id,
      actorUserId: req.user!.id,
    });
    res.json({ success: true });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({ error: err instanceof Error ? err.message : 'Kunne ikke slette bruger' });
  }
});

export default router;
