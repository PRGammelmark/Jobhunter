import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDashboardData } from '../services/dashboardService';
import { statisticsService } from '../services/ai/StatisticsService';
import { storageService } from '../services/storage/storageService';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  const data = await getDashboardData(req.user!.tenantId);
  res.json(data);
});

router.get('/statistics', async (req, res) => {
  const stats = await statisticsService.getStatistics(req.user!.tenantId);
  res.json(stats);
});

router.get('/files/:fileId', async (req, res) => {
  try {
    const { buffer, mimeType, fileName } = await storageService.downloadForTenant(
      req.params.fileId,
      req.user!.tenantId
    );
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const inline = ext === 'pdf' || ext === 'html' || ext === 'txt';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  } catch {
    res.status(404).json({ error: 'Fil ikke fundet' });
  }
});

export default router;
